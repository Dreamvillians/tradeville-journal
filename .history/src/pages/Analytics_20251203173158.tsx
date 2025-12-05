"use client";

import {
  useState,
  useEffect,
  useMemo,
  memo,
  useRef,
} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  BarChart3,
  Calendar,
  Timer,
  Calculator,
  Activity,
  Zap,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  PieChart,
  RefreshCw,
  Filter,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
} from "date-fns";
import { cn } from "@/lib/utils";

// -------------------------------------------------------------------------------------
// Animation + glass styles
// -------------------------------------------------------------------------------------

const ANALYTICS_STYLES = `
  .analytics-float { animation: analytics-float 6s ease-in-out infinite; }
  .analytics-float-delayed { animation: analytics-float 6s ease-in-out infinite; animation-delay: 2s; }
  .analytics-pulse { animation: analytics-pulse 3s ease-in-out infinite; }
  .analytics-slide-up { animation: analytics-slide-up 0.5s ease-out forwards; opacity: 0; }
  .analytics-fade-in { animation: analytics-fade-in 0.6s ease-out forwards; opacity: 0; }
  .analytics-count { animation: analytics-count 1.5s ease-out forwards; }

  @keyframes analytics-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes analytics-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
  @keyframes analytics-slide-up { 0% { transform: translateY(18px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes analytics-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes analytics-count { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }

  .analytics-glass {
    background: radial-gradient(circle at top left, rgba(52, 211, 153, 0.12), transparent 45%),
                radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.12), transparent 45%),
                rgba(15, 16, 24, 0.9);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(148, 163, 184, 0.22);
  }

  .analytics-card-hover {
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
  }
  .analytics-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 24px 45px rgba(15, 23, 42, 0.65);
    border-color: rgba(52, 211, 153, 0.5);
  }

  @media (prefers-reduced-motion: reduce) {
    .analytics-float,
    .analytics-float-delayed,
    .analytics-pulse,
    .analytics-slide-up,
    .analytics-fade-in,
    .analytics-count {
      animation: none !important;
    }
  }
`;

// -------------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------------

interface Trade {
  id: string;
  symbol: string;
  side: "long" | "short";
  profit_loss_currency: number;
  profit_loss_percent: number;
  opened_at: string;
  closed_at: string | null;
  strategy_id?: string;
  strategies?: { name: string | null } | null;
}

interface Metrics {
  totalTrades: number;
  profitableTrades: number;
  nonProfitableTrades: number;
  winRate: number;        // %
  profitFactor: number;   // Infinity for "∞"
  netPnL: number;
  avgWin: number;
  avgLoss: number;
  expectedValue: number;
  netDailyPnL: number;
  avgTradeTime: number;   // minutes
}

type PeriodKey = "all" | "week" | "month" | "quarter" | "year";

// -------------------------------------------------------------------------------------
// Utilities
// -------------------------------------------------------------------------------------

const formatCurrency = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

const formatProfitFactor = (value: number): string => {
  if (!isFinite(value)) return "∞";
  return value.toFixed(2);
};

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
};

// -------------------------------------------------------------------------------------
// Background visuals
// -------------------------------------------------------------------------------------

const FloatingOrbs = memo(function FloatingOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] analytics-float" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] analytics-float-delayed" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] bg-emerald-500/5 rounded-full blur-[150px] analytics-pulse" />
    </div>
  );
});

const AnimatedGrid = memo(function AnimatedGrid() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-25">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98111_1px,transparent_1px),linear-gradient(to_bottom,#10b98111_1px,transparent_1px)] bg-[size:60px_60px]" />
    </div>
  );
});

// -------------------------------------------------------------------------------------
// Reusable stat card
// -------------------------------------------------------------------------------------

type AccentColor = "emerald" | "blue" | "purple" | "orange" | "red" | "cyan";

const STAT_COLORS: Record<
  AccentColor,
  { bg: string; text: string; glow: string }
> = {
  emerald: {
    bg: "from-emerald-500/18 to-emerald-600/10",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/30",
  },
  blue: {
    bg: "from-blue-500/18 to-blue-600/10",
    text: "text-blue-400",
    glow: "shadow-blue-500/30",
  },
  purple: {
    bg: "from-purple-500/18 to-purple-600/10",
    text: "text-purple-400",
    glow: "shadow-purple-500/30",
  },
  orange: {
    bg: "from-orange-500/18 to-orange-600/10",
    text: "text-orange-400",
    glow: "shadow-orange-500/30",
  },
  red: {
    bg: "from-red-500/18 to-red-600/10",
    text: "text-red-400",
    glow: "shadow-red-500/30",
  },
  cyan: {
    bg: "from-cyan-500/18 to-cyan-600/10",
    text: "text-cyan-400",
    glow: "shadow-cyan-500/30",
  },
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Target;
  trend?: "up" | "down" | "neutral";
  color?: AccentColor;
  delay?: number;
}

const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "emerald",
  delay = 0,
}: StatCardProps) {
  const colors = STAT_COLORS[color];

  const isNegative =
    typeof value === "string"
      ? value.startsWith("-") || value.startsWith("$-")
      : typeof value === "number" && value < 0;

  return (
    <Card
      className="analytics-glass analytics-card-hover relative overflow-hidden group h-full analytics-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-55 group-hover:opacity-75 transition-opacity",
          colors.bg
        )}
      />
      <div className="absolute top-0 right-0 w-20 h-20 opacity-25">
        <div
          className={cn(
            "absolute top-0 right-0 w-full h-full bg-gradient-to-bl rounded-bl-full",
            colors.bg
          )}
        />
      </div>

      <CardContent className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-gray-400 font-semibold">
              {title}
            </p>
            <p
              className={cn(
                "text-lg sm:text-xl font-bold tabular-nums analytics-count leading-tight",
                isNegative ? "text-red-400" : "text-slate-50"
              )}
            >
              {value}
            </p>

            {subtitle && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-400">
                {trend && trend !== "neutral" && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 font-semibold",
                      trend === "up" ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {trend === "up" ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                  </span>
                )}
                <span>{subtitle}</span>
              </div>
            )}
          </div>

          <div
            className={cn(
              "p-2.5 rounded-xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110 flex-shrink-0",
              colors.bg,
              colors.glow
            )}
          >
            <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", colors.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// -------------------------------------------------------------------------------------
// Trader level
// -------------------------------------------------------------------------------------

interface TraderLevelProps {
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  netPnL: number;
}

const TRADER_COLORS = {
  gray: {
    bg: "from-slate-500/25 to-slate-700/15",
    text: "text-slate-300",
    bar: "bg-slate-400",
  },
  emerald: {
    bg: "from-emerald-500/25 to-emerald-700/15",
    text: "text-emerald-400",
    bar: "bg-emerald-500",
  },
  blue: {
    bg: "from-blue-500/25 to-blue-700/15",
    text: "text-blue-400",
    bar: "bg-blue-500",
  },
  purple: {
    bg: "from-purple-500/25 to-purple-700/15",
    text: "text-purple-400",
    bar: "bg-purple-500",
  },
  orange: {
    bg: "from-orange-500/25 to-orange-700/15",
    text: "text-orange-400",
    bar: "bg-orange-500",
  },
} as const;

const TraderLevel = memo(function TraderLevel({
  winRate,
  profitFactor,
  totalTrades,
  netPnL,
}: TraderLevelProps) {
  const { level, color, progress } = useMemo(() => {
    if (totalTrades < 10) {
      return { level: "Beginner", color: "gray" as const, progress: 10 };
    }
    if (winRate >= 65 && profitFactor >= 2 && netPnL > 0) {
      return { level: "Elite", color: "emerald" as const, progress: 100 };
    }
    if (winRate >= 55 && profitFactor >= 1.5 && netPnL > 0) {
      return { level: "Advanced", color: "blue" as const, progress: 75 };
    }
    if (winRate >= 45 && profitFactor >= 1) {
      return {
        level: "Intermediate",
        color: "purple" as const,
        progress: 50,
      };
    }
    return { level: "Developing", color: "orange" as const, progress: 25 };
  }, [winRate, profitFactor, totalTrades, netPnL]);

  const colors = TRADER_COLORS[color];

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden analytics-slide-up">
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-40",
          colors.bg
        )}
      />
      <CardContent className="relative z-10 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "p-3.5 rounded-2xl bg-gradient-to-br",
                colors.bg,
                "shadow-lg shadow-black/40"
              )}
            >
              <Award className="w-6 h-6 text-slate-50" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-[0.14em] uppercase text-gray-400">
                Trader Level
              </p>
              <p className={cn("text-2xl sm:text-3xl font-semibold", colors.text)}>
                {level}
              </p>
            </div>
          </div>

          <div className="space-y-1 md:text-right">
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-gray-400">
              Progress
            </p>
            <p className="text-2xl font-semibold text-slate-50">
              {progress}%
            </p>
          </div>
        </div>

        <div className="mt-5 h-2.5 bg-slate-900/70 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out",
              colors.bar
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
});

// -------------------------------------------------------------------------------------
// Equity curve chart
// -------------------------------------------------------------------------------------

const EquityCurveChart = memo(function EquityCurveChart({
  trades,
}: {
  trades: Trade[];
}) {
  const chartData = useMemo(() => {
    if (!trades.length) return [];

    let cumulative = 0;
    return trades.map((trade, index) => {
      const pnl = trade.profit_loss_currency || 0;
      cumulative += pnl;
      return {
        index,
        date: new Date(trade.opened_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: cumulative,
        pnl,
        isProfit: pnl >= 0,
      };
    });
  }, [trades]);

  if (!chartData.length) {
    return (
      <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5" />
        <CardHeader className="relative z-10">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <LineChart className="w-5 h-5 text-emerald-400" />
            Equity Curve
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">No trades to display yet.</p>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...chartData.map((d) => d.value));
  const minValue = Math.min(...chartData.map((d) => d.value));
  const range = maxValue - minValue || 1;
  const lastValue = chartData[chartData.length - 1]?.value ?? 0;
  const isPositive = lastValue >= 0;

  const pathPoints = chartData
    .map((d, i) => {
      const x = (i / Math.max(chartData.length - 1, 1)) * 100;
      const y = 100 - ((d.value - minValue) / range) * 100;
      return `L ${x}% ${y}%`;
    })
    .join(" ");

  const startPointY =
    100 - ((chartData[0].value - minValue) / range) * 100;

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/7 to-blue-500/7" />
      <CardHeader className="relative z-10 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-emerald-400" />
              Equity Curve
            </CardTitle>
            <CardDescription className="text-gray-500">
              Cumulative P&amp;L over time
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Current Equity</p>
            <p
              className={cn(
                "text-xl font-semibold",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {formatCurrency(lastValue)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-3">
        <div className="relative h-64">
          <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-[11px] text-gray-500">
            <span>{formatCurrency(maxValue)}</span>
            <span>{formatCurrency((maxValue + minValue) / 2)}</span>
            <span>{formatCurrency(minValue)}</span>
          </div>

          <div className="ml-16 h-full relative">
            <div className="absolute inset-0">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute w-full border-t border-white/5"
                  style={{ top: `${i * 25}%` }}
                />
              ))}
            </div>

            <svg
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="equityGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor={
                      isPositive
                        ? "rgb(16, 185, 129)"
                        : "rgb(239, 68, 68)"
                    }
                    stopOpacity="0.35"
                  />
                  <stop
                    offset="100%"
                    stopColor={
                      isPositive
                        ? "rgb(16, 185, 129)"
                        : "rgb(239, 68, 68)"
                    }
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              <path
                d={`
                  M 0 ${startPointY}%
                  ${pathPoints}
                  L 100% 100%
                  L 0 100%
                  Z
                `}
                fill="url(#equityGradient)"
              />

              <path
                d={`M 0 ${startPointY}% ${pathPoints}`}
                fill="none"
                stroke={
                  isPositive
                    ? "rgb(16, 185, 129)"
                    : "rgb(239, 68, 68)"
                }
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// -------------------------------------------------------------------------------------
// Strategy performance
// -------------------------------------------------------------------------------------

const StrategyPerformance = memo(function StrategyPerformance({
  trades,
}: {
  trades: Trade[];
}) {
  const strategyStats = useMemo(() => {
    const stats: Record<
      string,
      { trades: number; wins: number; pnl: number }
    > = {};

    trades.forEach((trade) => {
      const strategyName =
        trade.strategies?.name ?? "No Strategy";
      if (!stats[strategyName]) {
        stats[strategyName] = { trades: 0, wins: 0, pnl: 0 };
      }
      const pnl = trade.profit_loss_currency || 0;
      stats[strategyName].trades++;
      if (pnl > 0) stats[strategyName].wins++;
      stats[strategyName].pnl += pnl;
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
        winRate:
          data.trades > 0
            ? (data.wins / data.trades) * 100
            : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  if (!strategyStats.length) return null;

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/7 to-pink-500/7" />
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-400" />
          Strategy Performance
        </CardTitle>
        <CardDescription className="text-gray-500">
          Top strategies ranked by net P&amp;L
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 pt-3">
        <div className="space-y-3">
          {strategyStats.slice(0, 5).map((strategy, index) => (
            <div
              key={strategy.name}
              className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.09] transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold",
                    strategy.pnl >= 0
                      ? "bg-emerald-500/25 text-emerald-300"
                      : "bg-red-500/25 text-red-300"
                  )}
                >
                  #{index + 1}
                </div>
                <div>
                  <p className="font-medium text-white">
                    {strategy.name}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {strategy.trades} trades •{" "}
                    {strategy.winRate.toFixed(1)}% win rate
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "font-semibold tabular-nums text-sm",
                    strategy.pnl >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  )}
                >
                  {strategy.pnl >= 0 ? "+" : ""}
                  {formatCurrency(strategy.pnl)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

// -------------------------------------------------------------------------------------
// Performance summary block (All‑Time = single row of tiles)
// -------------------------------------------------------------------------------------

const PerformanceSummary = memo(function PerformanceSummary({
  metrics,
  periodLabel,
}: {
  metrics: Metrics;
  periodLabel: string;
}) {
  const successRate =
    metrics.totalTrades > 0
      ? (metrics.profitableTrades / metrics.totalTrades) * 100
      : 0;

  const riskReward =
    metrics.avgLoss > 0
      ? metrics.avgWin / metrics.avgLoss
      : Infinity;

  const isAllTime = /all time/i.test(periodLabel);

  // All‑Time: compact, one-row tile layout
  if (isAllTime) {
    return (
      <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-blue-500/5" />
        <CardHeader className="relative z-10 pb-3">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-300" />
            All‑Time Performance
          </CardTitle>
        </CardHeader>

        <CardContent className="relative z-10 pt-4">
          {/* Single logical row of tiles (wraps only on small screens) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-black/25 border border-white/10">
              <p className="text-[11px] text-gray-400 mb-1">
                Net P&amp;L
              </p>
              <p
                className={cn(
                  "text-xl font-semibold",
                  metrics.netPnL >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                )}
              >
                {formatCurrency(metrics.netPnL)}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Lifetime result
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/25 border border-white/10">
              <p className="text-[11px] text-gray-400 mb-1">
                Trades
              </p>
              <p className="text-xl font-semibold text-white">
                {metrics.totalTrades}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                W {metrics.profitableTrades} · L{" "}
                {metrics.nonProfitableTrades}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/25 border border-white/10">
              <p className="text-[11px] text-gray-400 mb-1">
                Win Rate
              </p>
              <p className="text-xl font-semibold text-white">
                {metrics.winRate.toFixed(1)}%
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Success {successRate.toFixed(1)}%
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/25 border border-white/10">
              <p className="text-[11px] text-gray-400 mb-1">
                Profit Factor
              </p>
              <p className="text-xl font-semibold text-white">
                {formatProfitFactor(metrics.profitFactor)}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Gross profit ÷ loss
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/25 border border-white/10">
              <p className="text-[11px] text-gray-400 mb-1">
                Expected Value
              </p>
              <p className="text-xl font-semibold text-white">
                {formatCurrency(metrics.expectedValue)}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Avg P&amp;L per trade
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/25 border border-white/10">
              <p className="text-[11px] text-gray-400 mb-1">
                R/R &amp; Time
              </p>
              <p className="text-xl font-semibold text-white">
                {isFinite(riskReward)
                  ? riskReward.toFixed(2)
                  : "∞"}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                {formatMinutes(metrics.avgTradeTime)} avg hold
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default summary for non All‑Time periods
  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/7 to-teal-500/7" />
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          Performance Summary · {periodLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 pt-3 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/5">
            <p className="text-xs text-gray-400 mb-1">
              Win Rate
            </p>
            <p className="text-3xl font-semibold text-white">
              {metrics.winRate.toFixed(1)}%
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <p className="text-xs text-gray-400 mb-1">
              Net P&amp;L
            </p>
            <p
              className={cn(
                "text-3xl font-semibold",
                metrics.netPnL >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              )}
            >
              {formatCurrency(metrics.netPnL)}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-gray-400 mb-3">
            Trade Distribution
          </p>
          <div className="flex gap-2">
            <div
              className="bg-emerald-500/20 border border-emerald-500/30 h-10 rounded-lg flex-1 flex items-center justify-center text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors"
              style={{
                flexGrow:
                  metrics.profitableTrades || 1,
              }}
            >
              Wins: {metrics.profitableTrades}
            </div>
            <div
              className="bg-red-500/20 border border-red-500/30 h-10 rounded-lg flex-1 flex items-center justify-center text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors"
              style={{
                flexGrow:
                  metrics.nonProfitableTrades || 1,
              }}
            >
              Losses: {metrics.nonProfitableTrades}
            </div>
          </div>

          <p className="mt-3 text-[11px] text-gray-500">
            Success rate this period:{" "}
            <span className="font-semibold text-gray-200">
              {successRate.toFixed(1)}%
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

// -------------------------------------------------------------------------------------
// Analytics content per period
// -------------------------------------------------------------------------------------

interface AnalyticsContentProps {
  metrics: Metrics;
  trades: Trade[];
  periodLabel: string;
}

const AnalyticsContent = memo(function AnalyticsContent({
  metrics,
  trades,
  periodLabel,
}: AnalyticsContentProps) {
  const riskReward =
    metrics.avgLoss > 0
      ? metrics.avgWin / metrics.avgLoss
      : Infinity;

  // Summary cards: 10 metrics from Total Trades → Net Daily P&L
  const summaryCards: StatCardProps[] = [
    {
      title: "Total Trades",
      value: metrics.totalTrades,
      icon: BarChart3,
      trend: "neutral",
      color: "purple",
      subtitle: "Executed orders",
    },
    {
      title: "Profitable Trades",
      value: metrics.profitableTrades,
      icon: TrendingUp,
      trend: "up",
      color: "emerald",
      subtitle: "Closed in profit",
    },
    {
      title: "Non‑Profitable",
      value: metrics.nonProfitableTrades,
      icon: TrendingDown,
      trend: "down",
      color: "red",
      subtitle: "Closed at loss / breakeven",
    },
    {
      title: "Win Rate",
      value: `${metrics.winRate.toFixed(1)}%`,
      icon: Target,
      trend: metrics.winRate >= 50 ? "up" : "down",
      color: "blue",
      subtitle: "Winning trades / total",
    },
    {
      title: "Profit Factor",
      value: formatProfitFactor(metrics.profitFactor),
      icon: Zap,
      trend:
        metrics.profitFactor > 1
          ? "up"
          : metrics.profitFactor === 1
          ? "neutral"
          : "down",
      color:
        metrics.profitFactor >= 1
          ? "emerald"
          : "orange",
      subtitle: "Gross profit ÷ gross loss",
    },
    {
      title: "Net P&L",
      value: formatCurrency(metrics.netPnL),
      icon: DollarSign,
      trend:
        metrics.netPnL > 0
          ? "up"
          : metrics.netPnL < 0
          ? "down"
          : "neutral",
      color:
        metrics.netPnL >= 0 ? "emerald" : "red",
      subtitle: periodLabel,
    },
    {
      title: "Expected Value",
      value: formatCurrency(metrics.expectedValue),
      icon: Calculator,
      trend:
        metrics.expectedValue > 0
          ? "up"
          : metrics.expectedValue < 0
          ? "down"
          : "neutral",
      color:
        metrics.expectedValue >= 0
          ? "emerald"
          : "red",
      subtitle: "Avg P&L per trade",
    },
    {
      title: "Average Win",
      value: formatCurrency(metrics.avgWin),
      icon: ArrowUpRight,
      trend: "up",
      color: "emerald",
      subtitle: "Avg profit per winner",
    },
    {
      title: "Average Loss",
      value: formatCurrency(metrics.avgLoss),
      icon: ArrowDownRight,
      trend: "down",
      color: "red",
      subtitle: "Avg loss per loser",
    },
    {
      title: "Net Daily P&L",
      value: formatCurrency(metrics.netDailyPnL),
      icon: Calendar,
      trend:
        metrics.netDailyPnL > 0
          ? "up"
          : metrics.netDailyPnL < 0
          ? "down"
          : "neutral",
      color:
        metrics.netDailyPnL >= 0
          ? "emerald"
          : "red",
      subtitle: "Avg P&L per trading day",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Trader level */}
      <TraderLevel
        winRate={metrics.winRate}
        profitFactor={metrics.profitFactor}
        totalTrades={metrics.totalTrades}
        netPnL={metrics.netPnL}
      />

      {/* 10 summary metrics in two clean rows (5 cards per row on xl) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 tracking-[0.16em] uppercase">
            Overview
          </h2>
          <p className="text-xs text-gray-500">
            From Total Trades to Net Daily P&amp;L
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {summaryCards.map((card, index) => (
            <StatCard
              key={card.title}
              {...card}
              delay={60 + index * 50}
            />
          ))}
        </div>
      </section>

      {/* Trade time & risk / reward */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Average Trade Time"
          value={formatMinutes(metrics.avgTradeTime)}
          icon={Timer}
          trend="neutral"
          subtitle="Average holding duration"
          color="cyan"
          delay={620}
        />
        <StatCard
          title="Risk / Reward"
          value={
            isFinite(riskReward)
              ? riskReward.toFixed(2)
              : "∞"
          }
          icon={Activity}
          trend={
            isFinite(riskReward) && riskReward >= 1
              ? "up"
              : "down"
          }
          subtitle="Average win ÷ average loss"
          color={
            isFinite(riskReward) && riskReward >= 1
              ? "emerald"
              : "orange"
          }
          delay={670}
        />
      </section>

      {/* Equity curve */}
      <div
        className="analytics-slide-up"
        style={{ animationDelay: "720ms" }}
      >
        <EquityCurveChart trades={trades} />
      </div>

      {/* Strategy performance + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="analytics-slide-up"
          style={{ animationDelay: "770ms" }}
        >
          <StrategyPerformance trades={trades} />
        </div>
        <div
          className="analytics-slide-up"
          style={{ animationDelay: "820ms" }}
        >
          <PerformanceSummary
            metrics={metrics}
            periodLabel={periodLabel}
          />
        </div>
      </div>
    </div>
  );
});

// -------------------------------------------------------------------------------------
// Main analytics component
// -------------------------------------------------------------------------------------

const Analytics = () => {
  const stylesInjected = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Inject animation styles once on the client
  useEffect(() => {
    if (!stylesInjected.current) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "analytics-animations";
      styleSheet.textContent = ANALYTICS_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }
    setIsLoaded(true);
    return () => {
      const existing = document.getElementById(
        "analytics-animations"
      );
      if (existing) existing.remove();
    };
  }, []);

  const {
    data: trades = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<Trade[]>({
    queryKey: ["trades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select(
          `
          *,
          strategies (
            name
          )
        `
        )
        .order("opened_at", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Trade[];
    },
  });

  const calculateMetrics = (filteredTrades: Trade[]): Metrics => {
    const totalTrades = filteredTrades.length;

    const profitableTrades = filteredTrades.filter(
      (t) => (t.profit_loss_currency || 0) > 0
    ).length;

    const nonProfitableTrades = filteredTrades.filter(
      (t) => (t.profit_loss_currency || 0) <= 0
    ).length;

    const totalProfit = filteredTrades
      .filter((t) => (t.profit_loss_currency || 0) > 0)
      .reduce(
        (sum, t) => sum + (t.profit_loss_currency || 0),
        0
      );

    const totalLossAbs = Math.abs(
      filteredTrades
        .filter((t) => (t.profit_loss_currency || 0) < 0)
        .reduce(
          (sum, t) => sum + (t.profit_loss_currency || 0),
          0
        )
    );

    const netPnL = filteredTrades.reduce(
      (sum, t) => sum + (t.profit_loss_currency || 0),
      0
    );

    const winRate =
      totalTrades > 0
        ? (profitableTrades / totalTrades) * 100
        : 0;

    const profitFactor =
      totalLossAbs > 0
        ? totalProfit / totalLossAbs
        : totalProfit > 0
        ? Infinity
        : 0;

    const avgWin =
      profitableTrades > 0
        ? totalProfit / profitableTrades
        : 0;

    const avgLoss =
      nonProfitableTrades > 0
        ? totalLossAbs / nonProfitableTrades
        : 0;

    const expectedValue =
      totalTrades > 0 ? netPnL / totalTrades : 0;

    const tradingDays = new Set(
      filteredTrades.map((t) =>
        new Date(t.opened_at).toDateString()
      )
    ).size;

    const netDailyPnL =
      tradingDays > 0 ? netPnL / tradingDays : 0;

    const closedTrades = filteredTrades.filter(
      (t) => t.closed_at
    );
    const avgTradeTime =
      closedTrades.length > 0
        ? closedTrades.reduce((sum, t) => {
            const opened = new Date(
              t.opened_at
            ).getTime();
            const closed = new Date(
              t.closed_at as string
            ).getTime();
            // minutes
            return (
              sum + (closed - opened) / (1000 * 60)
            );
          }, 0) / closedTrades.length
        : 0;

    return {
      totalTrades,
      profitableTrades,
      nonProfitableTrades,
      winRate,
      profitFactor,
      netPnL,
      avgWin,
      avgLoss,
      expectedValue,
      netDailyPnL,
      avgTradeTime,
    };
  };

  const getTradesForPeriod = (
    period: PeriodKey
  ): Trade[] => {
    if (period === "all") return trades;

    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case "week":
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "quarter":
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case "year":
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        return trades;
    }

    return trades.filter((t) => {
      const d = new Date(t.opened_at);
      return d >= start && d <= end;
    });
  };

  const periods: {
    key: PeriodKey;
    label: string;
  }[] = [
    { key: "all", label: "All Time" },
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
    { key: "quarter", label: "Quarterly" },
    { key: "year", label: "Yearly" },
  ];

  return (
    <div className="min-h-screen bg-[#05060b] text-white relative overflow-x-hidden">
      <FloatingOrbs />
      <AnimatedGrid />

      <div
        className={cn(
          "relative z-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto transition-all duration-700",
          isLoaded
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        )}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-7 analytics-fade-in">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-xl shadow-emerald-500/40 analytics-float">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white">
                Trading Analytics
              </h1>
              <p className="text-sm text-gray-400">
                A modern view of every key performance metric.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/15 text-gray-300 hover:text-white hover:bg-white/10"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="bg-white/5 border-white/15 text-gray-300 hover:text-white hover:bg-white/10"
            >
              <RefreshCw
                className={cn(
                  "w-4 h-4",
                  isFetching && "animate-spin"
                )}
              />
            </Button>
          </div>
        </div>

        {/* Tabs for periods */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/5 border border-white/10 p-1 rounded-2xl">
            {periods.map((p) => (
              <TabsTrigger
                key={p.key}
                value={p.key}
                className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-emerald-500/25 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/40 border border-transparent transition-all"
              >
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {periods.map((p) => {
            const periodTrades = getTradesForPeriod(p.key);
            const metrics = calculateMetrics(periodTrades);

            return (
              <TabsContent
                key={p.key}
                value={p.key}
                className="space-y-6"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
                    Loading analytics…
                  </div>
                ) : (
                  <AnalyticsContent
                    metrics={metrics}
                    trades={periodTrades}
                    periodLabel={p.label}
                  />
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;