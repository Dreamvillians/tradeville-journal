import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";

interface TraderLevelProps {
  winRate: number;
  profitFactor: number | string;
  totalTrades: number;
  netPnL: number;
}

export function TraderLevel({
  winRate,
  profitFactor,
  totalTrades,
  netPnL,
}: TraderLevelProps) {
  const pfValue =
    typeof profitFactor === "string"
      ? profitFactor === "∞"
        ? Infinity
        : parseFloat(profitFactor)
      : profitFactor;

  const formatPnL = (value: number) => {
    const sign = value >= 0 ? "+" : "-";
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  const getLevelConfig = () => {
    if (totalTrades < 10) {
      return {
        level: "Getting Started",
        subtitle: "Keep trading to build a meaningful sample size.",
        badgeClass:
          "bg-slate-700 text-slate-100 border border-slate-500/60",
        progress: 10,
        nextGoal:
          "Complete at least 10 trades to unlock a full evaluation.",
      };
    }

    if (winRate >= 65 && pfValue >= 2 && netPnL > 0) {
      return {
        level: "Elite",
        subtitle:
          "You’re operating at a professional, high‑consistency level.",
        badgeClass:
          "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md shadow-amber-500/40",
        progress: 100,
        nextGoal:
          "Focus on scalability: position sizing and risk limits.",
      };
    }

    if (winRate >= 55 && pfValue >= 1.5 && netPnL > 0) {
      return {
        level: "Advanced",
        subtitle:
          "Solid edge with strong risk/reward and consistency.",
        badgeClass:
          "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/40",
        progress: 75,
        nextGoal:
          "Push towards 65%+ win rate or 2.0+ profit factor.",
      };
    }

    if (winRate >= 45 && pfValue >= 1 && netPnL > 0) {
      return {
        level: "Intermediate",
        subtitle:
          "You’re profitable—now refine execution to level up.",
        badgeClass:
          "bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/40",
        progress: 50,
        nextGoal:
          "Aim for 55%+ win rate while protecting drawdowns.",
      };
    }

    return {
      level: "Developing",
      subtitle:
        "Focus on risk management, review, and strategy refinement.",
      badgeClass:
        "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/40",
      progress: 25,
      nextGoal:
        "Target at least a 45% win rate and profit factor above 1.0.",
    };
  };

  const level = getLevelConfig();

  return (
    <Card className="relative overflow-hidden border-border bg-card/95">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/10" />

      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <CardTitle className="text-lg font-semibold">
              Trader Level
            </CardTitle>
          </div>
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {totalTrades} trades
          </span>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Level + progress */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Badge
              className={`px-4 py-2 text-sm font-semibold rounded-full ${level.badgeClass}`}
            >
              {level.level}
            </Badge>
            <div className="hidden sm:block text-xs text-muted-foreground max-w-xs">
              {level.subtitle}
            </div>
          </div>

          <div className="w-full sm:w-40 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Progress</span>
              <span className="font-medium text-foreground">
                {level.progress}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
                style={{ width: `${level.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Next goal */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                Next Goal:
              </span>{" "}
              {level.nextGoal}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Win Rate
            </p>
            <p className="text-lg font-semibold">
              {winRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Profit Factor
            </p>
            <p className="text-lg font-semibold">
              {typeof profitFactor === "number"
                ? profitFactor.toFixed(2)
                : profitFactor}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Total Trades
            </p>
            <p className="text-lg font-semibold">
              {totalTrades}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Net P&L
            </p>
            <p
              className={`text-lg font-semibold ${
                netPnL >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {formatPnL(netPnL)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}