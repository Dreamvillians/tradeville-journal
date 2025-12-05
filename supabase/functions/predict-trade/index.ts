import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Type Definitions ---
interface Trade {
  profit_loss_currency: number | null;
  session: string | null;
  direction: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tradeData } = await req.json();
    if (!tradeData?.instrument) {
      return new Response(JSON.stringify({ error: "Instrument required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch user's historical trades for this instrument
    const { data: rawTrades, error: tradesError } = await supabaseClient
      .from("trades")
      .select("profit_loss_currency, session, direction")
      .eq("user_id", user.id)
      .ilike("instrument", `%${tradeData.instrument}%`)
      .order("opened_at", { ascending: false })
      .limit(20);

    if (tradesError) console.error("Error fetching trades:", tradesError);

    const instrumentTrades = (rawTrades || []) as Trade[];
    const totalInstrumentTrades = instrumentTrades.length;
    
    // Stats Calculations
    const winningTrades = instrumentTrades.filter((t) => (t.profit_loss_currency || 0) > 0);
    const losingTrades = instrumentTrades.filter((t) => (t.profit_loss_currency || 0) < 0);
    
    const instrumentWinRate = totalInstrumentTrades > 0 
      ? ((winningTrades.length / totalInstrumentTrades) * 100).toFixed(1) 
      : "N/A";
      
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0) / winningTrades.length 
      : 0;
      
    const avgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0) / losingTrades.length)
      : 0;

    // R:R Calculation
    let riskRewardRatio = "N/A";
    if (tradeData.entry_price && tradeData.stop_loss && tradeData.take_profit) {
      const entry = parseFloat(tradeData.entry_price);
      const sl = parseFloat(tradeData.stop_loss);
      const tp = parseFloat(tradeData.take_profit);
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(tp - entry);
      if (risk > 0) riskRewardRatio = (reward / risk).toFixed(2);
    }

    // Helper for groupings
    const calculateStats = (getKey: (t: Trade) => string) => {
        return instrumentTrades.reduce<Record<string, {wins: number, losses: number, pnl: number}>>((acc, trade) => {
            const key = getKey(trade) || "Unknown";
            if (!acc[key]) acc[key] = { wins: 0, losses: 0, pnl: 0 };
            const pnl = trade.profit_loss_currency || 0;
            if (pnl > 0) acc[key].wins++;
            else if (pnl < 0) acc[key].losses++;
            acc[key].pnl += pnl;
            return acc;
        }, {});
    };

    const sessionStats = calculateStats(t => t.session || "Unknown");
    const directionStats = calculateStats(t => t.direction);

    const prompt = `You are an expert trading analyst. Predict trade outcome.

SETUP:
${tradeData.instrument} (${tradeData.direction || "?"})
Entry: ${tradeData.entry_price}, SL: ${tradeData.stop_loss}, TP: ${tradeData.take_profit}
R:R: ${riskRewardRatio}
Confluence: ${tradeData.confluence || "None"}

HISTORY (${tradeData.instrument}):
WinRate: ${instrumentWinRate}%, AvgWin: $${avgWin.toFixed(2)}, AvgLoss: $${avgLoss.toFixed(2)}

Provide: Setup Assessment, Historical Insight, Key Considerations, Risk Alert. 200 words max.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a concise trading coach." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) throw new Error("AI prediction failed");

    const data = await response.json();
    const prediction = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ 
      prediction,
      stats: {
        instrumentWinRate,
        totalInstrumentTrades,
        avgWin,
        avgLoss,
        riskRewardRatio
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});