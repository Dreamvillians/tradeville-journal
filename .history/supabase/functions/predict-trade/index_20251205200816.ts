import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: { method: string; headers: { get: (arg0: string) => any; }; json: () => PromiseLike<{ tradeData: any; }> | { tradeData: any; }; }) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    if (!tradeData || !tradeData.instrument) {
      return new Response(JSON.stringify({ error: "Trade data with instrument is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's historical trades for this instrument
    const { data: historicalTrades, error: tradesError } = await supabaseClient
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .ilike("instrument", `%${tradeData.instrument}%`)
      .order("opened_at", { ascending: false })
      .limit(20);

    if (tradesError) {
      console.error("Error fetching historical trades:", tradesError);
    }

    // Calculate historical stats for this instrument
    const instrumentTrades = historicalTrades || [];
    const totalInstrumentTrades = instrumentTrades.length;
    const winningTrades = instrumentTrades.filter((t: { profit_loss_currency: any; }) => (t.profit_loss_currency || 0) > 0);
    const losingTrades = instrumentTrades.filter((t: { profit_loss_currency: any; }) => (t.profit_loss_currency || 0) < 0);
    const instrumentWinRate = totalInstrumentTrades > 0 
      ? ((winningTrades.length / totalInstrumentTrades) * 100).toFixed(1) 
      : "N/A";
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum: any, t: { profit_loss_currency: any; }) => sum + (t.profit_loss_currency || 0), 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum: any, t: { profit_loss_currency: any; }) => sum + (t.profit_loss_currency || 0), 0) / losingTrades.length)
      : 0;

    // Calculate R:R if stop loss and take profit provided
    let riskRewardRatio = "N/A";
    if (tradeData.entry_price && tradeData.stop_loss && tradeData.take_profit) {
      const entryPrice = parseFloat(tradeData.entry_price);
      const stopLoss = parseFloat(tradeData.stop_loss);
      const takeProfit = parseFloat(tradeData.take_profit);
      
      const risk = Math.abs(entryPrice - stopLoss);
      const reward = Math.abs(takeProfit - entryPrice);
      
      if (risk > 0) {
        riskRewardRatio = (reward / risk).toFixed(2);
      }
    }

    // Session analysis from historical data
    const sessionStats = instrumentTrades.reduce((acc: any, trade: { session: string; profit_loss_currency: any; }) => {
      const session = trade.session || "Unknown";
      if (!acc[session]) {
        acc[session] = { wins: 0, losses: 0, pnl: 0 };
      }
      if ((trade.profit_loss_currency || 0) > 0) {
        acc[session].wins++;
      } else if ((trade.profit_loss_currency || 0) < 0) {
        acc[session].losses++;
      }
      acc[session].pnl += trade.profit_loss_currency || 0;
      return acc;
    }, {});

    // Direction stats
    const directionStats = instrumentTrades.reduce((acc: any, trade: { direction: any; profit_loss_currency: any; }) => {
      const dir = trade.direction;
      if (!acc[dir]) {
        acc[dir] = { wins: 0, losses: 0, pnl: 0 };
      }
      if ((trade.profit_loss_currency || 0) > 0) {
        acc[dir].wins++;
      } else if ((trade.profit_loss_currency || 0) < 0) {
        acc[dir].losses++;
      }
      acc[dir].pnl += trade.profit_loss_currency || 0;
      return acc;
    }, {});

    const prompt = `You are an expert trading analyst. Based on the trade setup data and historical performance, provide a brief analysis and prediction.

CURRENT TRADE SETUP:
- Instrument: ${tradeData.instrument}
- Direction: ${tradeData.direction || "Not specified"}
- Entry Price: ${tradeData.entry_price || "Not specified"}
- Stop Loss: ${tradeData.stop_loss || "Not specified"}
- Take Profit: ${tradeData.take_profit || "Not specified"}
- Position Size: ${tradeData.position_size || "Not specified"}
- Risk Amount: ${tradeData.risk_amount || "Not specified"}
- Risk:Reward Ratio: ${riskRewardRatio}
- Session: ${tradeData.session || "Not specified"}
- Market Condition: ${tradeData.market_condition || "Not specified"}
- Setup Type: ${tradeData.setup_type || "Not specified"}
- Confluence: ${tradeData.confluence || "Not specified"}

HISTORICAL PERFORMANCE ON ${tradeData.instrument.toUpperCase()}:
- Total Trades: ${totalInstrumentTrades}
- Win Rate: ${instrumentWinRate}%
- Average Win: $${avgWin.toFixed(2)}
- Average Loss: $${avgLoss.toFixed(2)}

${totalInstrumentTrades > 0 ? `DIRECTION PERFORMANCE:
${Object.entries(directionStats).map(([dir, stats]: [string, any]) => 
  `- ${dir}: ${stats.wins} wins, ${stats.losses} losses, $${stats.pnl.toFixed(2)} total P&L`
).join('\n')}` : ''}

${Object.keys(sessionStats).length > 0 ? `SESSION PERFORMANCE:
${Object.entries(sessionStats).map(([session, stats]: [string, any]) => 
  `- ${session}: ${stats.wins} wins, ${stats.losses} losses, $${stats.pnl.toFixed(2)} total P&L`
).join('\n')}` : ''}

Provide a concise analysis (max 200 words) with:
1. **Setup Assessment**: Quick evaluation of the trade setup quality
2. **Historical Insight**: What your past performance suggests for this trade
3. **Key Considerations**: 1-2 important factors to watch
4. **Risk Alert**: Any concerns about the setup (if applicable)

Be direct and actionable. Use markdown formatting.`;

    console.log("Calling Lovable AI for trade prediction...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional trading coach providing quick, actionable trade analysis. Be concise and practical." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI prediction failed");
    }

    const data = await response.json();
    const prediction = data.choices?.[0]?.message?.content;

    if (!prediction) {
      throw new Error("No prediction generated");
    }

    console.log("Trade prediction generated successfully");

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
    console.error("Error in predict-trade:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
