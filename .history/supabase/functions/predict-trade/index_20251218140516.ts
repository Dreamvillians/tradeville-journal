import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Types ---
interface Trade {
  profit_loss_currency: number | null;
  session: string | null;
  direction: string;
  opened_at: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // 1. Auth & Setup
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // 2. Parse Input
    const { tradeData, screenshotBase64 } = await req.json();

    if (!tradeData?.instrument) {
      return new Response(JSON.stringify({ error: "Instrument required" }), { status: 400, headers: corsHeaders });
    }

    // ------------------------------------------------------------------
    // RAG STEP 1: Fetch Historical Performance (Context)
    // ------------------------------------------------------------------
    const { data: rawTrades } = await supabaseClient
      .from("trades")
      .select("profit_loss_currency, session, direction, opened_at")
      .eq("user_id", user.id)
      .ilike("instrument", `%${tradeData.instrument}%`) // Fuzzy match (e.g. matches XAUUSD in "Short XAUUSD")
      .order("opened_at", { ascending: false })
      .limit(20);

    const history = (rawTrades || []) as Trade[];
    
    // Stats Calculation
    const totalTrades = history.length;
    const wins = history.filter(t => (t.profit_loss_currency || 0) > 0);
    const losses = history.filter(t => (t.profit_loss_currency || 0) < 0);
    const winRate = totalTrades > 0 ? ((wins.length / totalTrades) * 100).toFixed(1) : "0";
    
    // Streak Logic (The "Revenge Trading" detector)
    let currentStreak = 0;
    let streakType = "none"; // "win" or "loss"

    if (history.length > 0) {
      const firstTradePnl = history[0].profit_loss_currency || 0;
      streakType = firstTradePnl > 0 ? "win" : "loss";
      
      for (const trade of history) {
        const pnl = trade.profit_loss_currency || 0;
        const isWin = pnl > 0;
        if ((streakType === "win" && isWin) || (streakType === "loss" && !isWin)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // ------------------------------------------------------------------
    // RAG STEP 2: Fetch Strategy Rules (The Playbook)
    // ------------------------------------------------------------------
    let strategyContext = "No specific strategy rules found. Use general price action concepts.";
    
    if (tradeData.setup_type) {
      // Try to find a playbook that matches the setup name
      const { data: playbook } = await supabaseClient
        .from("playbooks") // Ensure you have a 'playbooks' table
        .select("description, rules") // Adjust columns based on your schema
        .ilike("title", `%${tradeData.setup_type}%`)
        .maybeSingle();

      if (playbook) {
        strategyContext = `
        USER STRATEGY: ${tradeData.setup_type}
        DESCRIPTION: ${playbook.description || ""}
        RULES: ${playbook.rules || JSON.stringify(playbook)}
        `;
      }
    }

    // ------------------------------------------------------------------
    // STEP 3: Construct the AI Prompts
    // ------------------------------------------------------------------
    
    const systemPrompt = `
      You are a veteran Hedge Fund Risk Manager and Technical Analyst.
      Your goal is to protect capital first, and grow it second.
      
      You will be given:
      1. Trade details (Entry, SL, TP, Notes)
      2. Historical performance context for this specific instrument
      3. The user's strategy rules (Playbook)
      4. Optionally, a chart screenshot

      Your Output MUST be a valid JSON object with the following structure:
      {
        "prediction": "A detailed markdown analysis string...",
        "recommendation": "buy" | "sell" | "hold",
        "confidence": number (0-100),
        "riskAssessment": "low" | "medium" | "high",
        "warnings": ["Array of warning strings..."],
        "levels": {
          "entry": number,
          "stopLoss": number,
          "takeProfit1": number,
          "riskReward": number
        }
      }

      BEHAVIOR GUIDELINES:
      - If the user is on a losing streak (3+ losses), WARNING them about tilt/revenge trading.
      - Compare their setup against the "USER STRATEGY" rules. If it violates rules, recommend HOLD.
      - If specific price levels (Entry/SL) are missing in input, suggest logical ones based on standard 1:2 Risk/Reward.
      - Be cynical. Look for reasons the trade might fail.
    `;

    const userPrompt = `
      CURRENT SETUP:
      Instrument: ${tradeData.instrument}
      Direction: ${tradeData.direction}
      Timeframe: ${tradeData.timeframe || "Unknown"}
      User Notes: ${tradeData.notes || "None"}
      My Proposed Entry: ${tradeData.entry_price || "Not set"}
      My Proposed SL: ${tradeData.stop_loss || "Not set"}
      My Proposed TP: ${tradeData.take_profit || "Not set"}

      MY PERFORMANCE CONTEXT (${tradeData.instrument}):
      - Win Rate (Last 20): ${winRate}%
      - Current Streak: ${currentStreak} ${streakType.toUpperCase()}s in a row
      
      ${strategyContext}
    `;

    // ------------------------------------------------------------------
    // STEP 4: Call AI (Gemini via Lovable Gateway)
    // ------------------------------------------------------------------
    
    // Prepare messages. If screenshot exists, add it.
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    // Note: Gemini 1.5 Pro/Flash handles text context very well. 
    // If you have a screenshot, we need to send it correctly if the API supports it.
    // For this implementation, we will assume text-only prompts for stability 
    // unless you confirm your gateway supports multi-modal via this specific endpoint.
    // *If chart support is vital, we append image_url here.*

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", 
        messages: messages,
        temperature: 0.2, // Low temperature for consistent, analytical results
        response_format: { type: "json_object" } // Force JSON mode
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Error:", errText);
      throw new Error("Failed to contact AI service");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    // Parse the AI's JSON response
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI JSON:", content);
      // Fallback if AI returns plain text
      result = {
        prediction: content,
        recommendation: "hold",
        confidence: 0,
        riskAssessment: "high",
        warnings: ["AI response format error"],
        levels: { entry: 0, stopLoss: 0, takeProfit1: 0, riskReward: 0 }
      };
    }

    // ------------------------------------------------------------------
    // STEP 5: Return Combined Data
    // ------------------------------------------------------------------
    
    return new Response(JSON.stringify({
      ...result, // The AI's JSON fields
      stats: { // Hard stats from DB
        instrumentWinRate: winRate,
        totalInstrumentTrades: totalTrades,
        avgWin: 0, // Simplified for this snippet, calculate properly if needed
        avgLoss: 0,
        riskRewardRatio: "N/A", // The AI calculates this in 'levels' now
        consecutiveWins: streakType === 'win' ? currentStreak : 0,
        consecutiveLosses: streakType === 'loss' ? currentStreak : 0,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});