import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Type Definitions ---
interface Strategy {
  name: string | null;
}

interface Trade {
  instrument: string;
  direction: string;
  profit_loss_currency: number | null;
  opened_at: string;
  strategies: Strategy | null;
}

interface GroupedStats {
  wins: number;
  losses: number;
  pnl: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
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

    // Attempt to parse body (might be empty if just triggering analysis)
    try { await req.json(); } catch (_) { /* ignore */ }

    // Fetch user's trades
    const { data: rawTrades, error: tradesError } = await supabaseClient
      .from("trades")
      .select(`
        instrument,
        direction,
        profit_loss_currency,
        opened_at,
        strategies (name)
      `)
      .eq("user_id", user.id)
      .order("opened_at", { ascending: false });

    if (tradesError) {
      console.error("Error fetching trades:", tradesError);
      throw new Error("Failed to fetch trades");
    }

    // Type casting
    const trades = rawTrades as unknown as Trade[];

    if (!trades || trades.length === 0) {
      return new Response(JSON.stringify({ 
        analysis: "No trades found. Start logging your trades to get AI-powered insights." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Metrics Calculation ---
    const totalTrades = trades.length;
    const profitableTrades = trades.filter((t) => (t.profit_loss_currency || 0) > 0).length;
    const winRate = ((profitableTrades / totalTrades) * 100).toFixed(1);
    
    const totalProfit = trades
      .filter((t) => (t.profit_loss_currency || 0) > 0)
      .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
      
    const totalLoss = Math.abs(trades
      .filter((t) => (t.profit_loss_currency || 0) < 0)
      .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0));
      
    const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : "∞";
    const netPnL = trades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);

    // Helper for groupings
    const calculateGroupStats = (
      data: Trade[], 
      getKey: (t: Trade) => string
    ): Record<string, GroupedStats> => {
      return data.reduce<Record<string, GroupedStats>>((acc, trade) => {
        const key = getKey(trade);
        if (!acc[key]) acc[key] = { wins: 0, losses: 0, pnl: 0 };
        
        const pnl = trade.profit_loss_currency || 0;
        if (pnl > 0) acc[key].wins++;
        else acc[key].losses++;
        
        acc[key].pnl += pnl;
        return acc;
      }, {});
    };

    const strategyPerformance = calculateGroupStats(trades, (t) => t.strategies?.name || "No Strategy");
    const instrumentPerformance = calculateGroupStats(trades, (t) => t.instrument || "Unknown");

    // Recent trades summary (last 10)
    const recentTrades = trades.slice(0, 10).map((t) => ({
      instrument: t.instrument,
      direction: t.direction,
      pnl: t.profit_loss_currency,
      strategy: t.strategies?.name || "No Strategy",
      date: t.opened_at
    }));

    const prompt = `You are an expert trading coach. Analyze this data:

METRICS:
Trades: ${totalTrades}, WinRate: ${winRate}%, Net P&L: $${netPnL.toFixed(2)}, PF: ${profitFactor}

STRATEGIES:
${Object.entries(strategyPerformance).map(([k, v]) => `- ${k}: ${v.wins}W/${v.losses}L, $${v.pnl.toFixed(2)}`).join('\n')}

INSTRUMENTS:
${Object.entries(instrumentPerformance).map(([k, v]) => `- ${k}: ${v.wins}W/${v.losses}L, $${v.pnl.toFixed(2)}`).join('\n')}

RECENT:
${recentTrades.map((t) => `- ${t.date.split('T')[0]}: ${t.direction} ${t.instrument} ($${t.pnl?.toFixed(2)})`).join('\n')}

Provide analysis: Performance Summary, Strengths, Weaknesses, Insights, and 3 Recommendations. Markdown format.`;

    // AI Call
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert trading performance analyst." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) throw new Error("AI analysis failed");

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});