"use client";

import {
  useState,
  useEffect,
  useMemo,
  memo,
  useCallback,
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
import { Badge } from "@/components/ui/badge";
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
  AlertCircle,
  Sparkles,
  ChevronRight,
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
  format,
} from "date-fns";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Lazy load heavy chart components
const LazyAreaChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.AreaChart })),
  { ssr: false }
);
const LazyBarChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.BarChart })),
  { ssr: false }
);
const LazyScatterChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.ScatterChart })),
  { ssr: false }
);

import {
  ResponsiveContainer,
  Area,
  Bar,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  ReferenceLine,
} from "recharts";

// ============================================================================
// TYPES
// ============================================================================

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
  winRate: number;
  profitFactor: number;
  netPnL: number;
  avgWin: number;
  avgLoss: number;
  expectedValue: number;
  netDailyPnL: number;
  avgTradeTime: number;
  maxDrawdown: number;
  sharpeRatio: number;
  bestTrade: number;
  worstTrade: number;
}

type PeriodKey = "all" | "week" | "month" | "quarter" | "year";
type AccentColor = "emerald" | "blue" | "purple" | "orange" | "red" | "cyan" | "amber";

interface TooltipPayload {
  date?: string;
  value?: number;
  pnl?: number;
  label?: string;
  trades?: number;
  mid?: number;
  count?: number;
  symbol?: string;
  rMultiple?: number;
  side?: "long" | "short";
}

// ============================================================================
// CONSTANTS & UTILITIES
// ============================================================================

const ACCENT_COLORS: Record<AccentColor, { bg: string; text: string; glow: string; border: string }> = {
  emerald: {
    bg: "from-emerald-500/20 to-emerald-600/5",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/25",
    border: "border-emerald-500/30",
  },
  blue: {
    bg: "from-blue-500/20 to-blue-600/5",
    text: "text-blue-400",
    glow: "shadow-blue-500/25",
    border: "border-blue-500/30",
  },
  purple: {
    bg: "from-purple-500/20 to-purple-600/5",
    text: "text-purple-400",
    glow: "shadow-purple-500/25",
    border: "border-purple-500/30",
  },
  orange: {
    bg: "from-orange-500/20 to-orange-600/5",
    text: "text-orange-400",
    glow: "shadow-orange-500/25",
    border: "border-orange-500/30",
  },
  red: {
    bg: "from-red-500/20 to-red-600/5",
    text: "text-red-400",
    glow: "shadow-red-500/25",
    border: "border-red-500/30",
  },
  cyan: {
    bg: "from-cyan-500/20 to-cyan-600/5",
    text: "text-cyan-400",
    glow: "shadow-cyan-500/25",
    border: "border-cyan-500/30",
  },
  amber: {
    bg: "from-amber-500/20 to-amber-600/5",
    text: "text-amber-400",
    glow: "shadow-amber-500/25",
    border: "border-amber-500/30",
  },
};

const formatCurrency = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const formatProfitFactor = (value: number): string => {
  if (!isFinite(value)) return "∞";
  return value.toFixed(2);
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
};

// ============================================================================
// BACKGROUND EFFECTS
// ============================================================================

const GridBackground = memo(function GridBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_100%_100%,rgba(59,130,246,0.08),transparent)]" />
      
      {/* Grid pattern */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.015]" aria-hidden="true">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M0 32V0h32" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Floating orbs */}
      <div 
        className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"
        style={{ animationDuration: "8s" }}
      />
      <div 
        className="absolute bottom-1/4 -right-32 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] animate-pulse"
        style={{ animationDuration: "6s", animationDelay: "2s" }}
      />
    </div>
  );
});

// ============================================================================
// LOADING SKELETONS
// ============================================================================

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-xl bg-white/5", className)} />
);

const StatCardSkeleton = () => (
  <Card className="relative overflow-hidden border-white/5 bg-white/[0.02]">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </CardContent>
  </Card>
);

const ChartSkeleton = ({ height = "h-64" }: { height?: string }) => (
  <Card className="border-white/5 bg-white/[0.02]">
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-3 w-48" />
    </CardHeader>
    <CardContent>
      <Skeleton className={cn("w-full rounded-xl", height)} />
    </CardContent>
  </Card>
);

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <Skeleton className="h-28 w-full rounded-2xl" />
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  </div>
);

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Target;
  trend?: "up" | "down" | "neutral";
  color?: AccentColor;
  index?: number;
}

const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "emerald",
  index = 0,
}: StatCardProps) {
  const colors = ACCENT_COLORS[color];
  const isNegative = String(value).includes("-");

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-white/5 bg-white/[0.02] backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        "hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20"
      )}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          colors.bg
        )}
      />

      {/* Corner accent */}
      <div
        className={cn(
          "absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity",
          color === "emerald" && "bg-emerald-500",
          color === "blue" && "bg-blue-500",
          color === "purple" && "bg-purple-500",
          color === "red" && "bg-red-500",
          color === "orange" && "bg-orange-500",
          color === "cyan" && "bg-cyan-500",
          color === "amber" && "bg-amber-500"
        )}
      />

      <CardContent className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-medium text-slate-500">
              {title}
            </p>
            <p
              className={cn(
                "text-xl sm:text-2xl font-bold tracking-tight tabular-nums",
                isNegative ? "text-red-400" : "text-white"
              )}
            >
              {value}
            </p>
            {subtitle && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                {trend && trend !== "neutral" && (
                  <span
                    className={cn(
                      "flex items-center",
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
                <span className="truncate">{subtitle}</span>
              </div>
            )}
          </div>

          <div
            className={cn(
              "p-2.5 rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110",
              colors.bg,
              colors.border,
              "border"
            )}
          >
            <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", colors.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// TRADER LEVEL COMPONENT
// ============================================================================

interface TraderLevelProps {
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  netPnL: number;
}

const TraderLevel = memo(function TraderLevel({
  winRate,
  profitFactor,
  totalTrades,
  netPnL,
}: TraderLevelProps) {
  const { level, description, progress, color, nextLevel } = useMemo(() => {
    if (totalTrades < 10) {
      return {
        level: "Beginner",
        description: "Complete 10 trades to advance",
        progress: Math.min(totalTrades * 10, 100),
        color: "slate" as const,
        nextLevel: "Developing",
      };
    }
    if (winRate >= 65 && profitFactor >= 2 && netPnL > 0) {
      return {
        level: "Elite",
        description: "Top-tier performance achieved",
        progress: 100,
        color: "emerald" as const,
        nextLevel: null,
      };
    }
    if (winRate >= 55 && profitFactor >= 1.5 && netPnL > 0) {
      return {
        level: "Advanced",
        description: "Strong consistent performance",
        progress: 75,
        color: "blue" as const,
        nextLevel: "Elite",
      };
    }
    if (winRate >= 45 && profitFactor >= 1) {
      return {
        level: "Intermediate",
        description: "Developing edge in the market",
        progress: 50,
        color: "purple" as const,
        nextLevel: "Advanced",
      };
    }
    return {
      level: "Developing",
      description: "Building trading foundation",
      progress: 25,
      color: "orange" as const,
      nextLevel: "Intermediate",
    };
  }, [winRate, profitFactor, totalTrades, netPnL]);

  const colorClasses = {
    slate: { bg: "bg-slate-500", text: "text-slate-400", gradient: "from-slate-500/20" },
    emerald: { bg: "bg-emerald-500", text: "text-emerald-400", gradient: "from-emerald-500/20" },
    blue: { bg: "bg-blue-500", text: "text-blue-400", gradient: "from-blue-500/20" },
    purple: { bg: "bg-purple-500", text: "text-purple-400", gradient: "from-purple-500/20" },
    orange: { bg: "bg-orange-500", text: "text-orange-400", gradient: "from-orange-500/20" },
  };

  const colors = colorClasses[color];

  return (
    <Card className="relative overflow-hidden border-white/5 bg-white/[0.02]">
      <div className={cn("absolute inset-0 bg-gradient-to-r to-transparent opacity-50", colors.gradient)} />
      
      <CardContent className="relative z-10 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-2xl", colors.bg + "/20", "border", colors.bg.replace("bg-", "border-") + "/30")}>
              <Award className={cn("w-6 h-6", colors.text)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={cn("text-2xl font-bold", colors.text)}>{level}</h3>
                {level === "Elite" && (
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                )}
              </div>
              <p className="text-sm text-slate-500">{description}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-2xl font-bold text-white">{progress}%</span>
            {nextLevel && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                Next: {nextLevel} <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-1000 ease-out", colors.bg)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// PERFORMANCE BANNER
// ============================================================================

interface PerformanceBannerProps {
  metrics: Metrics;
  tradesCount: number;
}

const PerformanceBanner = memo(function PerformanceBanner({
  metrics,
  tradesCount,
}: PerformanceBannerProps) {
  const isPositive = metrics.netPnL >= 0;

  return (
    <Card className="relative overflow-hidden border-white/5 bg-white/[0.02]">
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r opacity-30",
          isPositive
            ? "from-emerald-500/20 via-transparent to-blue-500/10"
            : "from-red-500/20 via-transparent to-orange-500/10"
        )}
      />

      <CardContent className="relative z-10 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Main P&L */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Lifetime Net P&L
            </p>
            <div className="flex items-baseline gap-3">
              <span
                className={cn(
                  "text-4xl sm:text-5xl font-bold tracking-tight",
                  isPositive ? "text-emerald-400" : "text-red-400"
                )}
              >
                {formatCurrency(metrics.netPnL)}
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                )}
              >
                {isPositive ? "+" : ""}{((metrics.netPnL / Math.max(Math.abs(metrics.avgWin), 1)) * 100).toFixed(0)}%
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Across {tradesCount} total trades
            </p>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-16 bg-white/10" />

          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1">
            <div>
              <p className="text-xs text-slate-500 mb-1">Win Rate</p>
              <p className="text-xl font-semibold text-white">{formatPercent(metrics.winRate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Profit Factor</p>
              <p className={cn(
                "text-xl font-semibold",
                metrics.profitFactor >= 1.5 ? "text-emerald-400" : "text-white"
              )}>
                {formatProfitFactor(metrics.profitFactor)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Expectancy</p>
              <p className={cn(
                "text-xl font-semibold",
                metrics.expectedValue > 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {formatCurrency(metrics.expectedValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Best Trade</p>
              <p className="text-xl font-semibold text-emerald-400">
                {formatCurrency(metrics.bestTrade)}
              </p>
            </div>
          </div>

          {/* Win/Loss bar */}
          <div className="min-w-[180px] space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{metrics.profitableTrades} Wins</span>
              <span>{metrics.losingTrades} Losses</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
              <div
                className="bg-emerald-500 transition-all duration-1000"
                style={{
                  width: `${(metrics.profitableTrades / (metrics.profitableTrades + metrics.losingTrades || 1)) * 100}%`,
                }}
              />
              <div
                className="bg-red-500 transition-all duration-1000"
                style={{
                  width: `${(metrics.losingTrades / (metrics.profitableTrades + metrics.losingTrades || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// EQUITY CURVE CHART
// ============================================================================

interface EquityDataPoint {
  date: string;
  value: number;
  pnl: number;
  tradeNumber: number;
}

const CustomTooltip = memo(function CustomTooltip({
  active,
  payload,
  type,
}: {
  active?: boolean;
  payload?: Array<{ payload: TooltipPayload }>;
  type: "equity" | "bar" | "histogram" | "scatter";
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl">
      {type === "equity" && (
        <>
          <p className="text-slate-400">{data.date}</p>
          <p className="font-medium text-white mt-1">
            Equity: {formatCurrency(data.value ?? 0)}
          </p>
          <p className={cn("mt-0.5", (data.pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
            {(data.pnl ?? 0) >= 0 ? "+" : ""}
            {formatCurrency(data.pnl ?? 0)}
          </p>
        </>
      )}
      {type === "bar" && (
        <>
          <p className="text-slate-400">{data.label}</p>
          <p className={cn("font-medium", (data.pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
            {(data.pnl ?? 0) >= 0 ? "+" : ""}
            {formatCurrency(data.pnl ?? 0)}
          </p>
          <p className="text-slate-500 mt-0.5">{data.trades} trades</p>
        </>
      )}
      {type === "histogram" && (
        <>
          <p className="text-slate-400">~{(data.mid ?? 0).toFixed(1)}%</p>
          <p className="font-medium text-white">{data.count} trades</p>
        </>
      )}
      {type === "scatter" && (
        <>
          <p className="text-slate-400">{data.symbol} · {data.side?.toUpperCase()}</p>
          <p className="text-white">R: {(data.rMultiple ?? 0).toFixed(2)}</p>
          <p className={cn((data.pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
            {formatCurrency(data.pnl ?? 0)}
          </p>
        </>
      )}
    </div>
  );
});

const EquityCurveChart = memo(function EquityCurveChart({
  trades,
}: {
  trades: Trade[];
}) {
  const chartData = useMemo((): EquityDataPoint[] => {
    if (!trades.length) return [];

    let cumulative = 0;
    return trades.map((trade, index) => {
      const pnl = trade.profit_loss_currency || 0;
      cumulative += pnl;
      return {
        date: format(new Date(trade.opened_at), "MMM d"),
        value: cumulative,
        pnl,
        tradeNumber: index + 1,
      };
    });
  }, [trades]);

  if (!chartData.length) {
    return (
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <LineChart className="w-5 h-5 text-emerald-400" />
            Equity Curve
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No trades to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lastValue = chartData[chartData.length - 1]?.value ?? 0;
  const isPositive = lastValue >= 0;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";
  const gradientId = `equity-gradient-${isPositive ? "pos" : "neg"}`;

  return (
    <Card className="border-white/5 bg-white/[0.02]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-emerald-400" />
              Equity Curve
            </CardTitle>
            <CardDescription className="text-slate-500">
              Cumulative P&L over {chartData.length} trades
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Current</p>
            <p className={cn("text-xl font-bold", isPositive ? "text-emerald-400" : "text-red-400")}>
              {formatCurrency(lastValue)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LazyAreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgba(148,163,184,0.6)", fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={65}
                tick={{ fill: "rgba(148,163,184,0.6)", fontSize: 11 }}
                tickFormatter={(v) => formatCurrency(v as number)}
              />
              <ReferenceLine y={0} stroke="rgba(148,163,184,0.3)" strokeDasharray="3 3" />
              <RechartsTooltip content={<CustomTooltip type="equity" />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: strokeColor,
                  fill: "#0f172a",
                }}
              />
            </LazyAreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// P&L BY CATEGORY CHART
// ============================================================================

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CategoryData {
  label: string;
  pnl: number;
  trades: number;
}

const PnLByCategoryChart = memo(function PnLByCategoryChart({
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

      const weekday = WEEKDAY_LABELS[new Date(t.opened_at).getDay()];
      const w = weekdayMap.get(weekday) || { pnl: 0, trades: 0 };
      w.pnl += pnl;
      w.trades += 1;
      weekdayMap.set(weekday, w);
    });

    const toArr = (m: Map<string, { pnl: number; trades: number }>): CategoryData[] =>
      Array.from(m.entries())
        .map(([label, v]) => ({ label, ...v }))
        .sort((a, b) => b.pnl - a.pnl);

    return {
      byStrategy: toArr(stratMap).slice(0, 8),
      bySymbol: toArr(symbolMap).slice(0, 8),
      byWeekday: WEEKDAY_LABELS.map((d) => ({
        label: d,
        ...(weekdayMap.get(d) || { pnl: 0, trades: 0 }),
      })).filter((d) => d.trades > 0),
    };
  }, [trades]);

  const renderBarChart = (data: CategoryData[]) => {
    if (!data.length) {
      return (
        <div className="flex h-full items-center justify-center text-slate-500 text-sm">
          No data available
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LazyBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(148,163,184,0.6)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={65}
            tick={{ fill: "rgba(148,163,184,0.6)", fontSize: 11 }}
            tickFormatter={(v) => formatCurrency(v as number)}
          />
          <RechartsTooltip content={<CustomTooltip type="bar" />} />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#ef4444"} />
            ))}
          </Bar>
        </LazyBarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="border-white/5 bg-white/[0.02]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          P&L Breakdown
        </CardTitle>
        <CardDescription className="text-slate-500">
          Performance by strategy, symbol, and weekday
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="strategy">
          <TabsList className="grid grid-cols-3 bg-white/5 p-1 rounded-lg mb-4">
            <TabsTrigger
              value="strategy"
              className="text-xs rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              Strategy
            </TabsTrigger>
            <TabsTrigger
              value="symbol"
              className="text-xs rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              Symbol
            </TabsTrigger>
            <TabsTrigger
              value="weekday"
              className="text-xs rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white"
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

// ============================================================================
// RETURNS HISTOGRAM
// ============================================================================

const ReturnsHistogram = memo(function ReturnsHistogram({
  trades,
}: {
  trades: Trade[];
}) {
  const data = useMemo(() => {
    const returns = trades.map((t) => t.profit_loss_percent ?? 0);
    if (!returns.length) return [];

    const min = Math.min(...returns);
    const max = Math.max(...returns);
    if (min === max) return [{ mid: min, count: returns.length }];

    const binCount = 12;
    const binSize = (max - min) / binCount;
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
      .map((b) => ({ mid: (b.start + b.end) / 2, count: b.count }))
      .filter((b) => b.count > 0);
  }, [trades]);

  if (!data.length) {
    return (
      <Card className="border-white/5 bg-white/[0.02] h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Returns Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-slate-500 text-sm">No data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/5 bg-white/[0.02] h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          Returns Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LazyBarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="mid"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgba(148,163,184,0.6)", fontSize: 10 }}
                tickFormatter={(v) => `${(v as number).toFixed(0)}%`}
              />
              <YAxis hide />
              <RechartsTooltip content={<CustomTooltip type="histogram" />} />
              <Bar dataKey="count" fill="#06b6d4" radius={[2, 2, 0, 0]} />
            </LazyBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// RISK REWARD SCATTER
// ============================================================================

const RiskRewardScatter = memo(function RiskRewardScatter({
  trades,
  avgLoss,
}: {
  trades: Trade[];
  avgLoss: number;
}) {
  const data = useMemo(() => {
    if (!trades.length) return [];
    const basis = Math.abs(avgLoss) || 1;
    return trades.map((t) => ({
      rMultiple: (t.profit_loss_currency || 0) / basis,
      pnl: t.profit_loss_currency || 0,
      symbol: t.symbol,
      side: t.side,
    }));
  }, [trades, avgLoss]);

  if (!data.length) {
    return (
      <Card className="border-white/5 bg-white/[0.02] h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            R-Multiple Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-slate-500 text-sm">No data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/5 bg-white/[0.02] h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          R-Multiple Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LazyScatterChart margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="rMultiple"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgba(148,163,184,0.6)", fontSize: 10 }}
                tickFormatter={(v) => `${(v as number).toFixed(1)}R`}
              />
              <YAxis
                type="number"
                dataKey="pnl"
                tickLine={false}
                axisLine={false}
                width={55}
                tick={{ fill: "rgba(148,163,184,0.6)", fontSize: 10 }}
                tickFormatter={(v) => formatCurrency(v as number)}
              />
              <RechartsTooltip content={<CustomTooltip type="scatter" />} />
              <Scatter data={data}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#ef4444"} />
                ))}
              </Scatter>
            </LazyScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// STRATEGY PERFORMANCE LIST
// ============================================================================

const StrategyPerformance = memo(function StrategyPerformance({
  trades,
}: {
  trades: Trade[];
}) {
  const strategyStats = useMemo(() => {
    const stats: Record<string, { trades: number; wins: number; losses: number; pnl: number }> = {};

    trades.forEach((trade) => {
      const name = trade.strategies?.name ?? "No Strategy";
      if (!stats[name]) stats[name] = { trades: 0, wins: 0, losses: 0, pnl: 0 };
      const pnl = trade.profit_loss_currency || 0;
      stats[name].trades++;
      if (pnl > 0) stats[name].wins++;
      if (pnl < 0) stats[name].losses++;
      stats[name].pnl += pnl;
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
        winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  if (!strategyStats.length) return null;

  return (
    <Card className="border-white/5 bg-white/[0.02]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-400" />
          Strategy Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {strategyStats.slice(0, 5).map((strategy, index) => (
            <div
              key={strategy.name}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold",
                    strategy.pnl >= 0
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                  )}
                >
                  #{index + 1}
                </span>
                <div>
                  <p className="font-medium text-white text-sm">{strategy.name}</p>
                  <p className="text-xs text-slate-500">
                    {strategy.trades} trades · {strategy.winRate.toFixed(0)}% WR
                  </p>
                </div>
              </div>
              <p
                className={cn(
                  "font-semibold text-sm tabular-nums",
                  strategy.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {strategy.pnl >= 0 ? "+" : ""}
                {formatCurrency(strategy.pnl)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// METRICS CALCULATION
// ============================================================================

const calculateMetrics = (trades: Trade[]): Metrics => {
  const totalTrades = trades.length;
  const profitableTrades = trades.filter((t) => (t.profit_loss_currency || 0) > 0).length;
  const losingTrades = trades.filter((t) => (t.profit_loss_currency || 0) < 0).length;
  const breakEvenTrades = trades.filter((t) => (t.profit_loss_currency || 0) === 0).length;

  const totalProfit = trades
    .filter((t) => (t.profit_loss_currency || 0) > 0)
    .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);

  const totalLossAbs = Math.abs(
    trades
      .filter((t) => (t.profit_loss_currency || 0) < 0)
      .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0)
  );

  const netPnL = trades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
  const decisiveTrades = profitableTrades + losingTrades;
  const winRate = decisiveTrades > 0 ? (profitableTrades / decisiveTrades) * 100 : 0;
  const profitFactor = totalLossAbs > 0 ? totalProfit / totalLossAbs : totalProfit > 0 ? Infinity : 0;
  const avgWin = profitableTrades > 0 ? totalProfit / profitableTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLossAbs / losingTrades : 0;
  const expectedValue = totalTrades > 0 ? netPnL / totalTrades : 0;

  const tradingDays = new Set(trades.map((t) => new Date(t.opened_at).toDateString())).size;
  const netDailyPnL = tradingDays > 0 ? netPnL / tradingDays : 0;

  const closedTrades = trades.filter((t) => t.closed_at && isValid(parseISO(t.closed_at)));
  const avgTradeTime =
    closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => {
          return sum + differenceInMinutes(parseISO(t.closed_at!), parseISO(t.opened_at));
        }, 0) / closedTrades.length
      : 0;

  const pnls = trades.map((t) => t.profit_loss_currency || 0);
  const bestTrade = pnls.length ? Math.max(...pnls) : 0;
  const worstTrade = pnls.length ? Math.min(...pnls) : 0;

  // Max drawdown calculation
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;
  trades.forEach((t) => {
    cumulative += t.profit_loss_currency || 0;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  // Simplified Sharpe (daily returns std dev)
  const dailyReturns: number[] = [];
  const dailyMap = new Map<string, number>();
  trades.forEach((t) => {
    const day = new Date(t.opened_at).toDateString();
    dailyMap.set(day, (dailyMap.get(day) || 0) + (t.profit_loss_currency || 0));
  });
  dailyMap.forEach((v) => dailyReturns.push(v));
  const avgReturn = dailyReturns.length ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 1
    ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (dailyReturns.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  return {
    totalTrades,
    profitableTrades,
    losingTrades,
    breakEvenTrades,
    winRate,
    profitFactor,
    netPnL,
    avgWin,
    avgLoss,
    expectedValue,
    netDailyPnL,
    avgTradeTime,
    maxDrawdown,
    sharpeRatio,
    bestTrade,
    worstTrade,
  };
};

// ============================================================================
// ANALYTICS CONTENT
// ============================================================================

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
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
        <div className="p-4 rounded-full bg-white/5 mb-4">
          <AlertCircle className="w-8 h-8 text-slate-600" />
        </div>
        <h3 className="text-lg font-medium text-white">No trades found</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md text-center">
          No trades recorded for {periodLabel.toLowerCase()}. Try a different period.
        </p>
      </div>
    );
  }

  const riskReward = metrics.avgLoss > 0 ? metrics.avgWin / metrics.avgLoss : Infinity;

  const statCards: StatCardProps[] = [
    { title: "Total Trades", value: metrics.totalTrades, icon: BarChart3, color: "purple", subtitle: "Executed" },
    { title: "Winners", value: metrics.profitableTrades, icon: TrendingUp, trend: "up", color: "emerald", subtitle: "Profitable trades" },
    { title: "Losers", value: metrics.losingTrades, icon: TrendingDown, trend: "down", color: "red", subtitle: `${metrics.breakEvenTrades} break-even` },
    { title: "Win Rate", value: formatPercent(metrics.winRate), icon: Target, trend: metrics.winRate >= 50 ? "up" : "down", color: "blue" },
    { title: "Profit Factor", value: formatProfitFactor(metrics.profitFactor), icon: Zap, trend: metrics.profitFactor > 1 ? "up" : "down", color: metrics.profitFactor >= 1 ? "emerald" : "orange" },
    { title: "Net P&L", value: formatCurrency(metrics.netPnL), icon: DollarSign, trend: metrics.netPnL > 0 ? "up" : metrics.netPnL < 0 ? "down" : "neutral", color: metrics.netPnL >= 0 ? "emerald" : "red", subtitle: periodLabel },
    { title: "Expectancy", value: formatCurrency(metrics.expectedValue), icon: Calculator, trend: metrics.expectedValue > 0 ? "up" : "down", color: metrics.expectedValue >= 0 ? "emerald" : "red", subtitle: "Per trade" },
    { title: "Avg Win", value: formatCurrency(metrics.avgWin), icon: ArrowUpRight, trend: "up", color: "emerald" },
    { title: "Avg Loss", value: formatCurrency(metrics.avgLoss), icon: ArrowDownRight, trend: "down", color: "red" },
    { title: "Daily P&L", value: formatCurrency(metrics.netDailyPnL), icon: Calendar, trend: metrics.netDailyPnL > 0 ? "up" : "down", color: metrics.netDailyPnL >= 0 ? "emerald" : "red" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Trader Level */}
      <TraderLevel
        winRate={metrics.winRate}
        profitFactor={metrics.profitFactor}
        totalTrades={metrics.totalTrades}
        netPnL={metrics.netPnL}
      />

      {/* Stat Cards Grid */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {statCards.map((card, index) => (
            <StatCard key={card.title} {...card} index={index} />
          ))}
        </div>
      </section>

      {/* Extra Metrics Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Avg Hold Time"
          value={formatDuration(metrics.avgTradeTime)}
          icon={Timer}
          color="cyan"
          subtitle="Per trade"
        />
        <StatCard
          title="Risk/Reward"
          value={isFinite(riskReward) ? riskReward.toFixed(2) : "∞"}
          icon={Activity}
          trend={riskReward >= 1 ? "up" : "down"}
          color={riskReward >= 1 ? "emerald" : "orange"}
        />
        <StatCard
          title="Max Drawdown"
          value={formatCurrency(metrics.maxDrawdown)}
          icon={TrendingDown}
          color="red"
        />
        <StatCard
          title="Sharpe Ratio"
          value={metrics.sharpeRatio.toFixed(2)}
          icon={Zap}
          trend={metrics.sharpeRatio > 1 ? "up" : "neutral"}
          color={metrics.sharpeRatio > 1 ? "emerald" : "amber"}
        />
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EquityCurveChart trades={trades} />
        <PnLByCategoryChart trades={trades} />
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <StrategyPerformance trades={trades} />
        </div>
        <div className="space-y-4">
          <ReturnsHistogram trades={trades} />
          <RiskRewardScatter trades={trades} avgLoss={metrics.avgLoss} />
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// PERIOD ANALYTICS WRAPPER
// ============================================================================

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
      let start: Date, end: Date;

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
    return { filteredTrades: trades, metrics: calculateMetrics(trades) };
  }, [allTrades, periodKey]);

  return <AnalyticsContent metrics={metrics} trades={filteredTrades} periodLabel={periodLabel} />;
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Analytics() {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("all");

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
        .select(`*, strategies (name)`)
        .order("opened_at", { ascending: true });

      if (error) throw error;
      return (data || []) as Trade[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const allMetrics = useMemo(() => calculateMetrics(trades), [trades]);

  const periods: { key: PeriodKey; label: string }[] = [
    { key: "all", label: "All Time" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "quarter", label: "This Quarter" },
    { key: "year", label: "This Year" },
  ];

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <GridBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg shadow-emerald-500/25">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Trading Analytics</h1>
              <p className="text-sm text-slate-500">
                {trades.length} trades · Last updated {format(new Date(), "MMM d, h:mm a")}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </header>

        {/* Performance Banner (All Time) */}
        {!isLoading && trades.length > 0 && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <PerformanceBanner metrics={allMetrics} tradesCount={trades.length} />
          </div>
        )}

        {/* Period Tabs */}
        <Tabs value={activePeriod} onValueChange={(v) => setActivePeriod(v as PeriodKey)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/5 border border-white/10 p-1 rounded-xl h-auto">
            {periods.map((p) => (
              <TabsTrigger
                key={p.key}
                value={p.key}
                className={cn(
                  "text-xs sm:text-sm py-2.5 rounded-lg transition-all",
                  "data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-white"
                )}
              >
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {periods.map((p) => (
            <TabsContent key={p.key} value={p.key} className="mt-6 focus-visible:outline-none">
              {isLoading ? (
                <DashboardSkeleton />
              ) : (
                <PeriodAnalytics allTrades={trades} periodKey={p.key} periodLabel={p.label} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}