import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";

interface TraderLevelProps {
  winRate: number;
  profitFactor: number | string;
  totalTrades: number;
  netPnL: number;
}

export function TraderLevel({ winRate, profitFactor, totalTrades, netPnL }: TraderLevelProps) {
  const calculateTraderLevel = () => {
    // Convert profit factor to number if it's a string
    const pfValue = typeof profitFactor === 'string' ? (profitFactor === "∞" ? 999 : parseFloat(profitFactor)) : profitFactor;
    
    // Not enough data
    if (totalTrades < 10) {
      return {
        level: "Beginner",
        description: "Keep trading to establish your track record",
        color: "bg-muted text-muted-foreground",
        requirements: "Complete at least 10 trades to get evaluated"
      };
    }

    // Professional: Win rate >= 60%, Profit Factor >= 2.0, Net P&L > 0
    if (winRate >= 60 && pfValue >= 2.0 && netPnL > 0) {
      return {
        level: "Professional",
        description: "Elite trader with consistent profitable performance",
        color: "bg-gradient-to-r from-amber-500 to-amber-600 text-white",
        requirements: "Exceptional performance maintained"
      };
    }

    // Intermediate/Professional: Win rate >= 50%, Profit Factor >= 1.5, Net P&L > 0
    if (winRate >= 50 && pfValue >= 1.5 && netPnL > 0) {
      return {
        level: "Intermediate/Professional",
        description: "Strong trader with solid risk management",
        color: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white",
        requirements: "Aim for 60%+ win rate and 2.0+ profit factor"
      };
    }

    // Beginner/Intermediate: Win rate >= 40%, Profit Factor >= 1.0, Net P&L > 0
    if (winRate >= 40 && pfValue >= 1.0 && netPnL > 0) {
      return {
        level: "Beginner/Intermediate",
        description: "Developing trader with profitable results",
        color: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
        requirements: "Focus on improving win rate to 50%+"
      };
    }

    // Unprofitable/Beginner: Everything else
    return {
      level: "Unprofitable/Beginner",
      description: "Focus on strategy refinement and risk management",
      color: "bg-gradient-to-r from-rose-500 to-rose-600 text-white",
      requirements: "Work towards 40%+ win rate and 1.0+ profit factor"
    };
  };

  const traderLevel = calculateTraderLevel();

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-serif flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Trader Level
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Badge className={`${traderLevel.color} px-4 py-2 text-lg font-bold`}>
            {traderLevel.level}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {traderLevel.description}
          </p>
          <div className="flex items-start gap-2 pt-2 border-t border-border">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Next Goal:</span> {traderLevel.requirements}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="text-lg font-bold">{winRate}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profit Factor</p>
            <p className="text-lg font-bold">{profitFactor}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Trades</p>
            <p className="text-lg font-bold">{totalTrades}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net P&L</p>
            <p className={`text-lg font-bold ${netPnL > 0 ? "text-success" : "text-destructive"}`}>
              ${netPnL.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
