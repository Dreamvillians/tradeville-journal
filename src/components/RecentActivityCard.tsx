import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function RecentActivityCard() {
  const { data: recentTrades, isLoading } = useQuery({
    queryKey: ["recent-trades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-serif">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !recentTrades || recentTrades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent trades</p>
            <p className="text-sm mt-1">Start logging trades to see activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTrades.map((trade) => {
              const pnl = trade.profit_loss_currency || 0;
              const status = pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Break Even";
              const Icon =
                status === "Win"
                  ? TrendingUp
                  : status === "Loss"
                  ? TrendingDown
                  : Minus;
              const colorClass =
                status === "Win"
                  ? "text-success"
                  : status === "Loss"
                  ? "text-destructive"
                  : "text-muted-foreground";

              return (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${colorClass}`} />
                    <div>
                      <div className="font-mono font-semibold">{trade.instrument}</div>
                      <div className="text-xs text-muted-foreground">
                        {trade.direction} • {status}
                      </div>
                    </div>
                  </div>
                  <div className={`font-bold text-lg ${colorClass}`}>
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
