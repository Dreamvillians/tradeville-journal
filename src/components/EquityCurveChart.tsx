import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface Trade {
  opened_at: string;
  profit_loss_currency: number | null;
}

interface EquityCurveChartProps {
  trades?: Trade[];
}

export function EquityCurveChart({ trades = [] }: EquityCurveChartProps) {
  const generateEquityData = () => {
    if (trades.length === 0) {
      return [{ date: format(new Date(), "MMM d"), balance: 10000 }];
    }

    let runningBalance = 10000;
    return trades.map((trade) => {
      runningBalance += trade.profit_loss_currency || 0;
      return {
        date: format(new Date(trade.opened_at), "MMM d"),
        balance: runningBalance,
      };
    });
  };

  const equityData = generateEquityData();
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-serif">Equity Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={equityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Balance"]}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
