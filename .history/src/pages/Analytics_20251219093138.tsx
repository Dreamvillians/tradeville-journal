"use client";

import {
  useState,
  useEffect,
  useMemo,
  memo,
  useRef,
  Suspense,
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
  AlertCircle,
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
  isValid,
  parseISO,
  differenceInMinutes,
} from "date-fns";
import { cn } from "@/lib/utils";

// Recharts imports
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";

// -------------------------------------------------------------------------------------
// Animation + glass styles (now theme‑aware)
// -------------------------------------------------------------------------------------

const ANALYTICS_STYLES = `
  .analytics-float { animation: analytics-float 6s ease-in-out infinite; }
  .analytics-float-delayed { animation: analytics-float 6s ease-in-out infinite; animation-delay: 2s; }
  .analytics-pulse { animation: analytics-pulse 3s ease-in-out infinite; }
  .analytics-slide-up { animation: analytics-slide-up 0.5s ease-out forwards; opacity: 0; }
  .analytics-fade-in { animation: analytics-fade-in 0.6s ease-out forwards; opacity: 0; }
  .analytics-count { animation: analytics-count 1.5s ease-out forwards; }
  .analytics-shimmer {
    animation: analytics-shimmer 2s linear infinite;
    background: linear-gradient(
      to right,
      rgba(255,255,255,0.05) 0%,
      rgba(255,255,255,0.1) 50%,
      rgba(255,255,255,0.05) 100%
    );
    background-size: 1000px 100%;
  }

  @keyframes analytics-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes analytics-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
  @keyframes analytics-slide-up { 0% { transform: translateY(18px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes analytics-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes analytics-count { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes analytics-shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }

  /* Theme-aware glass card background */
  .analytics-glass {
    background:
      radial-gradient(circle at top left, hsla(var(--primary) / 0.12), transparent 45%),
      radial-gradient(circle at bottom right, hsla(var(--accent) / 0.12), transparent 45%),
      hsla(var(--card) / 0.98);
    backdrop-filter: blur(18px);
    border: 1px solid hsla(var(--border) / 0.9);
  }

  .analytics-card-hover {
    transition:
      transform 0.25s ease,
      box-shadow 0.25s ease,
      border-color 0.25s ease,
      background 0.25s ease;
  }
  .analytics-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 24px 45px rgba(15, 23, 42, 0.45);
    border-color: hsla(var(--primary) / 0.6);
  }

  @media (prefers-reduced-motion: reduce) {
    .analytics-float,
    .analytics-float-delayed,
    .analytics-pulse,
    .analytics-slide-up,
    .analytics-fade-in,
    .analytics-count,
    .analytics-shimmer {
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
  losingTrades: number;
  breakEvenTrades: number;
  nonProfitableTrades: number;
  winRate: number; // %
  profitFactor: number;
  netPnL: number;
  avgWin: number;
  avgLoss: number;
  expectedValue: number;
  netDailyPnL: number;
  avgTradeTime: number; // minutes
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
// Skeletons & Loading
// -------------------------------------------------------------------------------------

const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 w-full rounded-2xl bg-muted/40 analytics-shimmer" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/40 analytics-shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-muted/40 analytics-shimmer" />
        <div className="h-64 rounded-xl bg-muted/40 analytics-shimmer" />
      </div>
    </div>
  );
};

const ChartSkeleton = () => (
  <div className="h-64 w-full rounded-xl bg-muted/40 animate-pulse flex items-center justify-center">
    <BarChart3 className="w-8 h-8 text-muted-foreground/30 animate-bounce" />
  </div>
);

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
      <CardContent className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              {title}
            </p>
            <p
              className={cn(
                "text-lg sm:text-xl font-bold tabular-nums analytics-count leading-tight",
                isNegative ? "text-red-400" : "text-foreground"
              )}
            >
              {value}
            </p>

            {subtitle && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
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
      return {
        level: "Beginner",
        color: "gray" as const,
        progress: Math.min(totalTrades * 10, 100),
      };
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
              <p className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground">
                Trader Level
              </p>
              <p className={cn("text-2xl sm:text-3xl font-semibold", colors.text)}>
                {level}
              </p>
            </div>
          </div>

          <div className="space-y-1 md:text-right">
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground">
              Progress
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {progress}%
            </p>
          </div>
        </div>

        <div className="mt-5 h-2.5 bg-muted rounded-full overflow-hidden">
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
// Chart Components
// -------------------------------------------------------------------------------------

const EquityTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload as {
    date: string;
    value: number;
    pnl: number;
  };
  return (
    <div className="rounded-md border border-border bg-background/95 px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{d.date}</p>
      <p className="font-medium text-foreground">
        Equity: {formatCurrency(d.value)}
      </p>
      <p
        className={cn(
          "mt-1",
          d.pnl >= 0 ? "text-emerald-400" : "text-red-400"
        )}
      >
        {d.pnl >= 0 ? "+" : ""}
        {formatCurrency(d.pnl)} on trade
      </p>
    </div>
  );
};

const EquityCurveChart = memo(function EquityCurveChart({
  trades,
}: {
  trades: Trade[];
}) {
  const chartData = useMemo(() => {
    if (!trades.length) return [];

    let cumulative = 0;
    return trades.map((trade) => {
      const pnl = trade.profit_loss_currency || 0;
      cumulative += pnl;
      return {
        date: new Date(trade.opened_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: cumulative,
        pnl,
      };
    });
  }, [trades]);

  if (!chartData.length) {
    return (
      <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
        <CardHeader className="relative z-10">
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <LineChart className="w-5 h-5 text-emerald-400" />
            Equity Curve
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">
            No trades to display yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const lastValue = chartData[chartData.length - 1]?.value ?? 0;
  const isPositive = lastValue >= 0;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";
  const gradientId = isPositive
    ? "equityGradientPositive"
    : "equityGradientNegative";

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/7 to-blue-500/7" />
      <CardHeader className="relative z-10 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <LineChart className="w-5 h-5 text-emerald-400" />
              Equity Curve
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Cumulative P&amp;L over time (gradient area, smoothed)
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current Equity</p>
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
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={strokeColor}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor={strokeColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(148,163,184,0.25)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={70}
                tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 11 }}
                tickFormatter={(v) => formatCurrency(v as number)}
              />
              <RechartsTooltip content={<EquityTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PnLByCategory = memo(function PnLByCategory({
  trades,
}: {
  trades: Trade[];
}) {
  const { byStrategy, bySymbol, byWeekday } = useMemo(() => {
    const stratMap = new Map<string, { pnl: number; trades: number }>();
    const symbolMap = new Map<string, { pnl: number; trades: number }>();
    const weekdayMap = new Map<string, { pnl: number; trades: number }>();

    trades.forEach((t) => {
      const pnl = t.profit_loss_currency || 0;

      const stratName = t.strategies?.name || "No Strategy";
      const s = stratMap.get(stratName) || { pnl: 0, trades: 0 };
      s.pnl += pnl;
      s.trades += 1;
      stratMap.set(stratName, s);

      const sym = t.symbol || "Unknown";
      const sy = symbolMap.get(sym) || { pnl: 0, trades: 0 };
      sy.pnl += pnl;
      sy.trades += 1;
      symbolMap.set(sym, sy);

      const d = new Date(t.opened_at);
      const weekday = weekdayLabels[d.getDay()];
      const w = weekdayMap.get(weekday) || { pnl: 0, trades: 0 };
      w.pnl += pnl;
      w.trades += 1;
      weekdayMap.set(weekday, w);
    });

    const toArr = (m: Map<string, { pnl: number; trades: number }>) =>
      Array.from(m.entries())
        .map(([label, v]) => ({ label, ...v }))
        .sort((a, b) => b.pnl - a.pnl);

    return {
      byStrategy: toArr(stratMap).slice(0, 8),
      bySymbol: toArr(symbolMap).slice(0, 8),
      byWeekday: weekdayLabels
        .map((d) => ({
          label: d,
          ...(weekdayMap.get(d) || { pnl: 0, trades: 0 }),
        }))
        .filter((d) => d.trades > 0),
    };
  }, [trades]);

  const renderBarChart = (data: { label: string; pnl: number; trades: number }[]) => {
    if (!data.length) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Not enough data
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            stroke="rgba(148,163,184,0.25)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={70}
            tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 11 }}
            tickFormatter={(v) => formatCurrency(v as number)}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const p = payload[0].payload as {
                label: string;
                pnl: number;
                trades: number;
              };
              return (
                <div className="rounded-md border border-border bg-background/95 px-3 py-2 text-xs shadow-lg">
                  <p className="text-muted-foreground">{p.label}</p>
                  <p
                    className={cn(
                      "font-medium",
                      p.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {p.pnl >= 0 ? "+" : ""}
                    {formatCurrency(p.pnl)}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {p.trades} trade{p.trades === 1 ? "" : "s"}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.pnl >= 0 ? "#22c55e" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-sky-500/10" />
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          P&amp;L by Category
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Compare performance by strategy, symbol, and weekday
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 pt-2">
        <Tabs defaultValue="strategy">
          <TabsList className="grid grid-cols-3 bg-muted/40 border border-border p-1 rounded-2xl mb-3">
            <TabsTrigger
              value="strategy"
              className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-emerald-500/25 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/40 border border-transparent transition-all"
            >
              Strategy
            </TabsTrigger>
            <TabsTrigger
              value="symbol"
              className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-emerald-500/25 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/40 border border-transparent transition-all"
            >
              Symbol
            </TabsTrigger>
            <TabsTrigger
              value="weekday"
              className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-emerald-500/25 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/40 border border-transparent transition-all"
            >
              Weekday
            </TabsTrigger>
          </TabsList>

          <div className="h-64">
            <TabsContent value="strategy" className="h-full m-0">
              {renderBarChart(byStrategy)}
            </TabsContent>
            <TabsContent value="symbol" className="h-full m-0">
              {renderBarChart(bySymbol)}
            </TabsContent>
            <TabsContent value="weekday" className="h-full m-0">
              {renderBarChart(byWeekday)}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
});

const ReturnsHistogramChart = memo(function ReturnsHistogramChart({
  trades,
}: {
  trades: Trade[];
}) {
  const data = useMemo(() => {
    const returns = trades.map(
      (t) => t.profit_loss_percent ?? 0
    );
    if (!returns.length) return [];

    const min = Math.min(...returns);
    const max = Math.max(...returns);
    if (min === max) {
      return [
        {
          mid: min,
          count: returns.length,
        },
      ];
    }

    const binCount = 15;
    const range = max - min || 1;
    const binSize = range / binCount;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      start: min + i * binSize,
      end: min + (i + 1) * binSize,
      count: 0,
    }));

    returns.forEach((r) => {
      let idx = Math.floor((r - min) / binSize);
      if (idx === binCount) idx = binCount - 1;
      bins[idx].count += 1;
    });

    return bins
      .map((b) => ({
        mid: (b.start + b.end) / 2,
        count: b.count,
      }))
      .filter((b) => b.count > 0);
  }, [trades]);

  if (!data.length) {
    return (
      <Card className="analytics-glass analytics-card-hover relative overflow-hidden h-full">
        <CardHeader className="relative z-10 pb-3">
          <CardTitle className="text-sm text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Returns Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 flex items-center justify-center h-48">
          <p className="text-sm text-muted-foreground">
            No trades to display.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-sky-500/10" />
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="text-sm text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          Distribution of Trade Returns
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Histogram of profit / loss (%) per trade
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 pt-2">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid
                stroke="rgba(148,163,184,0.25)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="mid"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 10 }}
                tickFormatter={(v) => `${(v as number).toFixed(1)}%`}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={40}
                tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 10 }}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload as { mid: number; count: number };
                  return (
                    <div className="rounded-md border border-border bg-background/95 px-3 py-2 text-xs shadow-lg">
                      <p className="text-muted-foreground">
                        Around {p.mid.toFixed(2)}%
                      </p>
                      <p className="text-foreground font-medium">
                        {p.count} trade{p.count === 1 ? "" : "s"}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

const RiskRewardScatterChart = memo(function RiskRewardScatterChart({
  trades,
  avgLoss,
}: {
  trades: Trade[];
  avgLoss: number;
}) {
  const data = useMemo(() => {
    if (!trades.length) return [];
    const basis = Math.abs(avgLoss) || 1;
    return trades.map((t) => {
      const pnl = t.profit_loss_currency || 0;
      return {
        rMultiple: pnl / basis,
        pnl,
        symbol: t.symbol,
        side: t.side,
      };
    });
  }, [trades, avgLoss]);

  if (!data.length) {
    return (
      <Card className="analytics-glass analytics-card-hover relative overflow-hidden h-full">
        <CardHeader className="relative z-10 pb-3">
          <CardTitle className="text-sm text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Risk vs Reward
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 flex items-center justify-center h-48">
          <p className="text-sm text-muted-foreground">No trades to display.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-lime-500/10" />
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="text-sm text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Risk vs Reward (R Multiple vs P&amp;L)
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Each dot is a trade; winners above, losers below
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 pt-2">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                stroke="rgba(148,163,184,0.25)"
                strokeDasharray="3 3"
              />
              <XAxis
                type="number"
                dataKey="rMultiple"
                name="R Multiple"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 10 }}
                tickFormatter={(v) => (v as number).toFixed(1)}
              />
              <YAxis
                type="number"
                dataKey="pnl"
                name="P&L"
                tickLine={false}
                axisLine={false}
                width={60}
                tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 10 }}
                tickFormatter={(v) => formatCurrency(v as number)}
              />
              <RechartsTooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload as {
                    symbol: string;
                    rMultiple: number;
                    pnl: number;
                    side: "long" | "short";
                  };
                  return (
                    <div className="rounded-md border border-border bg-background/95 px-3 py-2 text-xs shadow-lg">
                      <p className="text-muted-foreground">
                        {p.symbol} · {p.side.toUpperCase()}
                      </p>
                      <p className="text-foreground font-medium">
                        R Multiple: {p.rMultiple.toFixed(2)}R
                      </p>
                      <p
                        className={cn(
                          "mt-1",
                          p.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                        )}
                      >
                        {p.pnl >= 0 ? "+" : ""}
                        {formatCurrency(p.pnl)}
                      </p>
                    </div>
                  );
                }}
              />
              <Scatter data={data}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.pnl >= 0 ? "#22c55e" : "#ef4444"}
                    radius={4}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

const StrategyPerformance = memo(function StrategyPerformance({
  trades,
}: {
  trades: Trade[];
}) {
  const strategyStats = useMemo(() => {
    const stats: Record<
      string,
      { trades: number; wins: number; losses: number; pnl: number }
    > = {};

    trades.forEach((trade) => {
      const strategyName = trade.strategies?.name ?? "No Strategy";
      if (!stats[strategyName]) {
        stats[strategyName] = { trades: 0, wins: 0, losses: 0, pnl: 0 };
      }
      const pnl = trade.profit_loss_currency || 0;
      stats[strategyName].trades++;
      if (pnl > 0) stats[strategyName].wins++;
      if (pnl < 0) stats[strategyName].losses++;
      stats[strategyName].pnl += pnl;
    });

    return Object.entries(stats)
      .map(([name, data]) => {
        const decisiveTrades = data.wins + data.losses;
        return {
          name,
          ...data,
          winRate:
            decisiveTrades > 0
              ? (data.wins / decisiveTrades) * 100
              : 0,
        };
      })
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  if (!strategyStats.length) return null;

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/7 to-pink-500/7" />
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-400" />
          Strategy Performance
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Top strategies ranked by net P&amp;L
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 pt-3">
        <div className="space-y-3">
          {strategyStats.slice(0, 5).map((strategy, index) => (
            <div
              key={strategy.name}
              className="flex items-center justify-between p-3.5 rounded-xl bg-muted/60 hover:bg-muted transition-all"
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
                  <p className="font-medium text-foreground">
                    {strategy.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
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
// Performance summary block
// -------------------------------------------------------------------------------------

const PerformanceSummary = memo(function PerformanceSummary({
  metrics,
  periodLabel,
}: {
  metrics: Metrics;
  periodLabel: string;
}) {
  const decisiveTrades = metrics.profitableTrades + metrics.losingTrades;
  const successRate =
    decisiveTrades > 0
      ? (metrics.profitableTrades / decisiveTrades) * 100
      : 0;

  const isAllTime = /all time/i.test(periodLabel);

  if (isAllTime) {
    return (
      <Card className="analytics-glass analytics-card-hover relative overflow-hidden w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 opacity-50" />
        <CardContent className="relative z-10 p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-10">
            <div className="flex flex-col min-w-[140px]">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                Lifetime Net P&L
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-3xl font-bold tracking-tight",
                    metrics.netPnL >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  )}
                >
                  {formatCurrency(metrics.netPnL)}
                </span>
                <span className="text-xs text-muted-foreground">total</span>
              </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-white/10" />

            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 flex-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                  Win Rate
                </span>
                <div className="flex items-end gap-1.5">
                  <span className="text-xl font-semibold text-foreground">
                    {metrics.winRate.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground mb-1">
                    ({decisiveTrades} decisive)
                  </span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                  Profit Factor
                </span>
                <span
                  className={cn(
                    "text-xl font-semibold",
                    metrics.profitFactor >= 1.5
                      ? "text-emerald-400"
                      : "text-foreground"
                  )}
                >
                  {formatProfitFactor(metrics.profitFactor)}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                  Expectancy
                </span>
                <span
                  className={cn(
                    "text-xl font-semibold",
                    metrics.expectedValue > 0
                      ? "text-emerald-400"
                      : "text-foreground"
                  )}
                >
                  {formatCurrency(metrics.expectedValue)}
                </span>
              </div>
            </div>

            <div className="flex flex-col min-w-[180px] w-full lg:w-auto gap-2">
              <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase">
                <span>Wins</span>
                <span>Losses</span>
              </div>
              <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full bg-emerald-500 transition-all duration-1000"
                  style={{
                    width:
                      decisiveTrades > 0
                        ? `${
                            (metrics.profitableTrades /
                              decisiveTrades) *
                            100
                          }%`
                        : "0%",
                  }}
                />
                <div
                  className="h-full bg-red-500 transition-all duration-1000"
                  style={{
                    width:
                      decisiveTrades > 0
                        ? `${
                            (metrics.losingTrades /
                              decisiveTrades) *
                            100
                          }%`
                        : "0%",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{metrics.profitableTrades}</span>
                <span>{metrics.losingTrades}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/7 to-teal-500/7" />
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          Performance Summary · {periodLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 pt-3 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-muted/40">
            <p className="text-xs text-muted-foreground mb-1">
              Win Rate
            </p>
            <p className="text-3xl font-semibold text-foreground">
              {metrics.winRate.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Excludes {metrics.breakEvenTrades} break-even
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/40">
            <p className="text-xs text-muted-foreground mb-1">
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

        <div className="pt-4 border-top border-border">
          <p className="text-xs text-muted-foreground mb-3">
            Trade Distribution
          </p>
          <div className="flex gap-2">
            <div
              className="bg-emerald-500/20 border border-emerald-500/30 h-10 rounded-lg flex-1 flex items-center justify-center text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors"
              style={{
                flexGrow: metrics.profitableTrades || 1,
              }}
            >
              Wins: {metrics.profitableTrades}
            </div>
            <div
              className="bg-red-500/20 border border-red-500/30 h-10 rounded-lg flex-1 flex items-center justify-center text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors"
              style={{
                flexGrow: metrics.losingTrades || 1,
              }}
            >
              Losses: {metrics.losingTrades}
            </div>
            {metrics.breakEvenTrades > 0 && (
              <div
                className="bg-muted/60 border border-border h-10 rounded-lg flex-1 flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                style={{
                  flexGrow: metrics.breakEvenTrades || 1,
                }}
              >
                BE: {metrics.breakEvenTrades}
              </div>
            )}
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Success rate this period:{" "}
            <span className="font-semibold text-foreground">
              {successRate.toFixed(1)}%
            </span>
            {metrics.breakEvenTrades > 0 && (
              <span className="text-muted-foreground/80">
                {" "}
                (excl. break-even)
              </span>
            )}
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
  if (metrics.totalTrades === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center analytics-fade-in">
        <div className="p-4 rounded-full bg-muted/60 mb-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">
          No trades found
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          There are no trades recorded for {periodLabel.toLowerCase()}.
          Try selecting a different period or logging new trades.
        </p>
      </div>
    );
  }

  const riskReward =
    metrics.avgLoss > 0 ? metrics.avgWin / metrics.avgLoss : Infinity;

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
      title: "Losing Trades",
      value: metrics.losingTrades,
      icon: TrendingDown,
      trend: "down",
      color: "red",
      subtitle: `Closed at loss (${metrics.breakEvenTrades} BE)`,
    },
    {
      title: "Win Rate",
      value: `${metrics.winRate.toFixed(1)}%`,
      icon: Target,
      trend: metrics.winRate >= 50 ? "up" : "down",
      color: "blue",
      subtitle: "Wins / (Wins + Losses)",
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
      color: metrics.profitFactor >= 1 ? "emerald" : "orange",
      subtitle: "Gross profit ÷ gross loss",
    },
    {
      title: "Net P&L",
      value: formatCurrency(metrics.netPnL),
      icon: DollarSign,
      trend:
        metrics.netPnL > 0 ? "up" : metrics.netPnL < 0 ? "down" : "neutral",
      color: metrics.netPnL >= 0 ? "emerald" : "red",
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
      color: metrics.expectedValue >= 0 ? "emerald" : "red",
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
      color: metrics.netDailyPnL >= 0 ? "emerald" : "red",
      subtitle: "Avg P&L per trading day",
    },
  ];

  return (
    <div className="space-y-6">
      <TraderLevel
        winRate={metrics.winRate}
        profitFactor={metrics.profitFactor}
        totalTrades={metrics.totalTrades}
        netPnL={metrics.netPnL}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground tracking-[0.16em] uppercase">
            Overview
          </h2>
          <p className="text-xs text-muted-foreground">
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
          value={isFinite(riskReward) ? riskReward.toFixed(2) : "∞"}
          icon={Activity}
          trend={
            isFinite(riskReward) && riskReward >= 1 ? "up" : "down"
          }
          color={
            isFinite(riskReward) && riskReward >= 1 ? "emerald" : "orange"
          }
          subtitle="Average win ÷ average loss"
          delay={670}
        />
      </section>

      {/* Equity curve */}
      <div
        className="analytics-slide-up"
        style={{ animationDelay: "720ms" }}
      >
        <Suspense fallback={<ChartSkeleton />}>
          <EquityCurveChart trades={trades} />
        </Suspense>
      </div>

      {/* Category charts + histogram + risk/reward scatter */}
      <section
        className="grid grid-cols-1 xl:grid-cols-2 gap-4 analytics-slide-up"
        style={{ animationDelay: "780ms" }}
      >
        <Suspense fallback={<ChartSkeleton />}>
          <PnLByCategory trades={trades} />
        </Suspense>

        <div className="grid grid-rows-2 gap-4">
          <Suspense fallback={<ChartSkeleton />}>
            <ReturnsHistogramChart trades={trades} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <RiskRewardScatterChart
              trades={trades}
              avgLoss={metrics.avgLoss}
            />
          </Suspense>
        </div>
      </section>

      {/* Summary + strategy ranking */}
      <div className="grid grid-cols-1 gap-4">
        <div
          className="analytics-slide-up"
          style={{ animationDelay: "830ms" }}
        >
          <PerformanceSummary metrics={metrics} periodLabel={periodLabel} />
        </div>

        <div
          className="analytics-slide-up"
          style={{ animationDelay: "880ms" }}
        >
          <StrategyPerformance trades={trades} />
        </div>
      </div>
    </div>
  );
});

// -------------------------------------------------------------------------------------
// Calculation Logic
// -------------------------------------------------------------------------------------

const calculateMetrics = (filteredTrades: Trade[]): Metrics => {
  const totalTrades = filteredTrades.length;

  const profitableTrades = filteredTrades.filter(
    (t) => (t.profit_loss_currency || 0) > 0
  ).length;

  const losingTrades = filteredTrades.filter(
    (t) => (t.profit_loss_currency || 0) < 0
  ).length;

  const breakEvenTrades = filteredTrades.filter(
    (t) => (t.profit_loss_currency || 0) === 0
  ).length;

  const nonProfitableTrades = losingTrades + breakEvenTrades;

  const totalProfit = filteredTrades
    .filter((t) => (t.profit_loss_currency || 0) > 0)
    .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);

  const totalLossAbs = Math.abs(
    filteredTrades
      .filter((t) => (t.profit_loss_currency || 0) < 0)
      .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0)
  );

  const netPnL = filteredTrades.reduce(
    (sum, t) => sum + (t.profit_loss_currency || 0),
    0
  );

  const decisiveTrades = profitableTrades + losingTrades;
  const winRate =
    decisiveTrades > 0 ? (profitableTrades / decisiveTrades) * 100 : 0;

  const profitFactor =
    totalLossAbs > 0
      ? totalProfit / totalLossAbs
      : totalProfit > 0
      ? Infinity
      : 0;

  const avgWin =
    profitableTrades > 0 ? totalProfit / profitableTrades : 0;

  const avgLoss = losingTrades > 0 ? totalLossAbs / losingTrades : 0;

  const expectedValue = totalTrades > 0 ? netPnL / totalTrades : 0;

  const tradingDays = new Set(
    filteredTrades.map((t) => new Date(t.opened_at).toDateString())
  ).size;

  const netDailyPnL = tradingDays > 0 ? netPnL / tradingDays : 0;

  const closedTrades = filteredTrades.filter(
    (t) => t.closed_at && isValid(parseISO(t.closed_at))
  );

  const avgTradeTime =
    closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => {
          const opened = parseISO(t.opened_at);
          const closed = parseISO(t.closed_at as string);
          return sum + differenceInMinutes(closed, opened);
        }, 0) / closedTrades.length
      : 0;

  return {
    totalTrades,
    profitableTrades,
    losingTrades,
    breakEvenTrades,
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

const PeriodAnalytics = memo(function PeriodAnalytics({
  allTrades,
  periodKey,
  periodLabel,
}: {
  allTrades: Trade[];
  periodKey: PeriodKey;
  periodLabel: string;
}) {
  const { filteredTrades, metrics } = useMemo(() => {
    const getTradesForPeriod = (trades: Trade[], period: PeriodKey): Trade[] => {
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

    const trades = getTradesForPeriod(allTrades, periodKey);
    const stats = calculateMetrics(trades);

    return { filteredTrades: trades, metrics: stats };
  }, [allTrades, periodKey]);

  return (
    <AnalyticsContent
      metrics={metrics}
      trades={filteredTrades}
      periodLabel={periodLabel}
    />
  );
});

// -------------------------------------------------------------------------------------
// Main analytics component
// -------------------------------------------------------------------------------------

const Analytics = () => {
  const stylesInjected = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

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
      const existing = document.getElementById("analytics-animations");
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
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <FloatingOrbs />
      <AnimatedGrid />

      <div
        className={cn(
          "relative z-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto transition-all duration-700",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
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
              <h1 className="text-2xl md:text-3xl font-semibold">
                Trading Analytics
              </h1>
              <p className="text-sm text-muted-foreground">
                A modern view of every key performance metric.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted/70"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted/70"
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
          <TabsList className="grid w-full grid-cols-5 bg-muted/40 border border-border p-1 rounded-2xl">
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

          {periods.map((p) => (
            <TabsContent
              key={p.key}
              value={p.key}
              className="space-y-6"
            >
              {isLoading ? (
                <DashboardSkeleton />
              ) : (
                <PeriodAnalytics
                  allTrades={trades}
                  periodKey={p.key}
                  periodLabel={p.label}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;