import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    const { period } = await req.json();

    // Fetch user's trades with strategy names
    const { data: trades, error: tradesError } = await supabaseClient
      .from("trades")
      .select(`
        *,
        strategies (name)
      `)
      .eq("user_id", user.id)
      .order("opened_at", { ascending: false });

    if (tradesError) {
      console.error("Error fetching trades:", tradesError);
      throw new Error("Failed to fetch trades");
    }

    if (!trades || trades.length === 0) {
      return new Response(JSON.stringify({ 
        analysis: "No trades found. Start logging your trades to get AI-powered insights and analysis of your trading performance." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate metrics for AI context
    const totalTrades = trades.length;
    const profitableTrades = trades.filter(t => (t.profit_loss_currency || 0) > 0).length;
    const winRate = ((profitableTrades / totalTrades) * 100).toFixed(1);
    const totalProfit = trades.filter(t => (t.profit_loss_currency || 0) > 0)
      .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
    const totalLoss = Math.abs(trades.filter(t => (t.profit_loss_currency || 0) < 0)
      .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0));
    const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : "∞";
    const netPnL = trades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);

    // Group by strategy
    const strategyPerformance = trades.reduce((acc: any, trade) => {
      const strategyName = trade.strategies?.name || "No Strategy";
      if (!acc[strategyName]) {
        acc[strategyName] = { wins: 0, losses: 0, pnl: 0 };
      }
      if ((trade.profit_loss_currency || 0) > 0) {
        acc[strategyName].wins++;
      } else {
        acc[strategyName].losses++;
      }
      acc[strategyName].pnl += trade.profit_loss_currency || 0;
      return acc;
    }, {});

    // Group by instrument
    const instrumentPerformance = trades.reduce((acc: any, trade) => {
      const instrument = trade.instrument || "Unknown";
      if (!acc[instrument]) {
        acc[instrument] = { wins: 0, losses: 0, pnl: 0 };
      }
      if ((trade.profit_loss_currency || 0) > 0) {
        acc[instrument].wins++;
      } else {
        acc[instrument].losses++;
      }
      acc[instrument].pnl += trade.profit_loss_currency || 0;
      return acc;
    }, {});

    // Recent trades summary (last 10)
    const recentTrades = trades.slice(0, 10).map(t => ({
      instrument: t.instrument,
      direction: t.direction,
      pnl: t.profit_loss_currency,
      strategy: t.strategies?.name || "No Strategy",
      date: t.opened_at
    }));

    const prompt = `You are an expert trading coach and performance analyst. Analyze the following trading data and provide actionable insights.

TRADING METRICS:
- Total Trades: ${totalTrades}
- Win Rate: ${winRate}%
- Profitable Trades: ${profitableTrades}
- Losing Trades: ${totalTrades - profitableTrades}
- Profit Factor: ${profitFactor}
- Net P&L: $${netPnL.toFixed(2)}
- Total Profits: $${totalProfit.toFixed(2)}
- Total Losses: $${totalLoss.toFixed(2)}

PERFORMANCE BY STRATEGY:
${Object.entries(strategyPerformance).map(([name, data]: [string, any]) => 
  `- ${name}: ${data.wins} wins, ${data.losses} losses, $${data.pnl.toFixed(2)} P&L`
).join('\n')}

PERFORMANCE BY INSTRUMENT:
${Object.entries(instrumentPerformance).map(([name, data]: [string, any]) => 
  `- ${name}: ${data.wins} wins, ${data.losses} losses, $${data.pnl.toFixed(2)} P&L`
).join('\n')}

RECENT TRADES (Last 10):
${recentTrades.map(t => 
  `- ${t.date?.split('T')[0]}: ${t.direction} ${t.instrument} (${t.strategy}) = $${t.pnl?.toFixed(2) || '0.00'}`
).join('\n')}

Provide a comprehensive analysis including:
1. **Performance Summary**: Brief overview of overall trading performance
2. **Strengths**: What's working well (strategies, instruments, patterns)
3. **Areas for Improvement**: Specific areas that need attention
4. **Key Insights**: Patterns or trends you've identified
5. **Actionable Recommendations**: 3-5 specific, actionable steps to improve

Keep the tone professional but encouraging. Be specific with numbers and percentages. Format using markdown.`;

    console.log("Calling Lovable AI for trade analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert trading performance analyst and coach. Provide actionable, data-driven insights to help traders improve their performance." },
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
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error("No analysis generated");
    }

    console.log("Trade analysis generated successfully");

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-trades:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
