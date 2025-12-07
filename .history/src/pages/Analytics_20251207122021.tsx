"use client";

import {
  useState,
  useMemo,
  memo,
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

// Recharts
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
// 1. Modern CSS & Animations (Injected via Style Tag for Portability)
// -------------------------------------------------------------------------------------

const GlobalAnalyticsStyles = () => (
  <style jsx global>{`
    @keyframes analytics-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes analytics-float-delayed { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes analytics-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.02); } }
    @keyframes analytics-slide-up { 0% { transform: translateY(18px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
    @keyframes analytics-shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }

    .analytics-float { animation: analytics-float 6s ease-in-out infinite; }
    .analytics-float-delayed { animation: analytics-float-delayed 7s ease-in-out infinite; animation-delay: 1s; }
    .analytics-pulse { animation: analytics-pulse 4s ease-in-out infinite; }
    .analytics-slide-up { animation: analytics-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .analytics-shimmer { animation: analytics-shimmer 2s linear infinite; background: linear-gradient(to right, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 100%); background-size: 1000px 100%; }

    .analytics-glass {
      background: rgba(15, 16, 24, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    }
    
    .bg-grid-pattern {
      background-size: 40px 40px;
      background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    }
    
    .bg-noise {
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
    }

    .analytics-card-hover {
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    .analytics-card-hover:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
    }
  `}</style>
);

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
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
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

const BackgroundLayer = memo(function BackgroundLayer() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[#05060b]" />
      <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay" />
      <div className="absolute inset-0 bg-grid-pattern [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" />
      
      {/* Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] analytics-float mix-blend-screen" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px] analytics-float-delayed mix-blend-screen" />
    </div>
  );
});

// -------------------------------------------------------------------------------------
// Skeletons & Loading
// -------------------------------------------------------------------------------------

const DashboardSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="h-40 w-full rounded-2xl bg-white/5 analytics-shimmer border border-white/5" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white/5 analytics-shimmer border border-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 rounded-xl bg-white/5 analytics-shimmer border border-white/5" />
        <div className="h-72 rounded-xl bg-white/5 analytics-shimmer border border-white/5" />
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------
// Reusable Components
// -------------------------------------------------------------------------------------

const CustomTooltip = ({ active, payload, label, prefix = "", suffix = "" }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-black/80 backdrop-blur-xl px-3 py-2 text-xs shadow-2xl animate-in fade-in zoom-in-95 duration-100">
      <p className="text-gray-400 font-medium mb-1">{label}</p>
      {payload.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-gray-300 capitalize">{item.name}:</span>
          <span className="font-mono font-medium text-white">
            {prefix}{item.value !== undefined && typeof item.value === 'number' ? item.value.toLocaleString() : item.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  );
};

type AccentColor = "emerald" | "blue" | "purple" | "orange" | "red" | "cyan";

const STAT_COLORS: Record<AccentColor, { bg: string; text: string; border: string }> = {
  emerald: { bg: "from-emerald-500/10 to-transparent", text: "text-emerald-400", border: "border-emerald-500/20" },
  blue: { bg: "from-blue-500/10 to-transparent", text: "text-blue-400", border: "border-blue-500/20" },
  purple: { bg: "from-purple-500/10 to-transparent", text: "text-purple-400", border: "border-purple-500/20" },
  orange: { bg: "from-orange-500/10 to-transparent", text: "text-orange-400", border: "border-orange-500/20" },
  red: { bg: "from-red-500/10 to-transparent", text: "text-rose-400", border: "border-rose-500/20" },
  cyan: { bg: "from-cyan-500/10 to-transparent", text: "text-cyan-400", border: "border-cyan-500/20" },
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
  const isNegative = typeof value === "string" && (value.includes("-") || value.includes("$-"));

  return (
    <Card
      className={cn(
        "analytics-glass analytics-card-hover relative overflow-hidden group analytics-slide-up border-l-2",
        colors.border
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity duration-500 group-hover:opacity-70", colors.bg)} />
      
      <CardContent className="relative z-10 p-5 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-2">
          <div className={cn("p-2 rounded-lg bg-white/5 ring-1 ring-white/10", colors.text)}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && trend !== "neutral" && (
            <div className={cn("flex items-center text-xs font-medium px-2 py-1 rounded-full bg-white/5", trend === "up" ? "text-emerald-400" : "text-rose-400")}>
              {trend === "up" ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              {trend === "up" ? "Good" : "Careful"}
            </div>
          )}
        </div>
        
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">{title}</p>
          <p className={cn("text-2xl font-bold tracking-tight", isNegative ? "text-rose-400" : "text-white")}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
});

// -------------------------------------------------------------------------------------
// Chart Components
// -------------------------------------------------------------------------------------

const EquityCurveChart = memo(function EquityCurveChart({ trades }: { trades: Trade[] }) {
  const chartData = useMemo(() => {
    if (!trades.length) return [];
    let cumulative = 0;
    return trades.map((trade) => {
      const pnl = trade.profit_loss_currency || 0;
      cumulative += pnl;
      return {
        date: new Date(trade.opened_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: cumulative,
        pnl,
      };
    });
  }, [trades]);

  const lastValue = chartData[chartData.length - 1]?.value ?? 0;
  const isPositive = lastValue >= 0;
  const strokeColor = isPositive ? "#10b981" : "#f43f5e";

  return (
    <Card className="analytics-glass analytics-card-hover col-span-1 lg:col-span-2 relative overflow-hidden h-[350px]">
      <CardHeader className="relative z-10 pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <LineChart className="w-4 h-4 text-emerald-400" /> Equity Curve
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">Cumulative performance</CardDescription>
          </div>
          <div className="text-right">
             <span className={cn("text-lg font-bold", isPositive ? "text-emerald-400" : "text-rose-400")}>
              {formatCurrency(lastValue)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 p-0 h-[260px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
            <RechartsTooltip content={<CustomTooltip prefix="$" />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
            <Area type="monotone" dataKey="value" name="Equity" stroke={strokeColor} strokeWidth={2} fill="url(#equityGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

// -------------------------------------------------------------------------------------
// Trader Level Component
// -------------------------------------------------------------------------------------

const TraderLevel = memo(function TraderLevel({ winRate, profitFactor, totalTrades, netPnL }: any) {
  const { level, color, progress, nextLevel } = useMemo(() => {
    if (totalTrades < 10) return { level: "Rookie", color: "text-gray-400", progress: (totalTrades / 10) * 100, nextLevel: "Developing" };
    if (winRate >= 60 && profitFactor >= 2 && netPnL > 0) return { level: "Elite", color: "text-emerald-400", progress: 100, nextLevel: "Legend" };
    if (winRate >= 50 && profitFactor >= 1.5 && netPnL > 0) return { level: "Pro", color: "text-blue-400", progress: 75, nextLevel: "Elite" };
    if (winRate >= 45 && profitFactor >= 1) return { level: "Intermediate", color: "text-purple-400", progress: 50, nextLevel: "Pro" };
    return { level: "Developing", color: "text-orange-400", progress: 25, nextLevel: "Intermediate" };
  }, [winRate, profitFactor, totalTrades, netPnL]);

  return (
    <Card className="analytics-glass relative overflow-hidden analytics-slide-up group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5 opacity-50" />
      <CardContent className="relative z-10 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 border border-white/10 shadow-xl">
            <Award className={cn("w-8 h-8", color)} />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Current Rank</p>
            <h3 className={cn("text-2xl font-bold tracking-tight", color)}>{level}</h3>
          </div>
        </div>
        <div className="hidden sm:block w-1/3">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1 uppercase tracking-wide font-medium">
            <span>Progress</span>
            <span>Next: {nextLevel}</span>
          </div>
          <div className="h-2 w-full bg-gray-800/50 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// -------------------------------------------------------------------------------------
// Analytics Layout & Logic
// -------------------------------------------------------------------------------------

const AnalyticsContent = memo(function AnalyticsContent({ metrics, trades, periodLabel }: { metrics: Metrics; trades: Trade[]; periodLabel: string }) {
  if (metrics.totalTrades === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center analytics-fade-in border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
        <div className="p-4 rounded-full bg-white/5 mb-4 ring-1 ring-white/10">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-white">No trades found</h3>
        <p className="text-sm text-gray-500 mt-1">There are no trades recorded for {periodLabel.toLowerCase()}.</p>
      </div>
    );
  }

  // Calculate Data for Charts
  const pnlByStrategy = useMemo(() => {
    const map = new Map<string, number>();
    trades.forEach(t => {
      const name = t.strategies?.name || "No Strategy";
      map.set(name, (map.get(name) || 0) + (t.profit_loss_currency || 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [trades]);

  const winLossData = [
    { name: "Wins", value: metrics.profitableTrades, color: "#10b981" },
    { name: "Losses", value: metrics.losingTrades, color: "#f43f5e" },
    { name: "Break Even", value: metrics.breakEvenTrades, color: "#64748b" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <TraderLevel {...metrics} />

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Row 1 */}
        <StatCard title="Net P&L" value={formatCurrency(metrics.netPnL)} icon={DollarSign} trend={metrics.netPnL >= 0 ? "up" : "down"} color={metrics.netPnL >= 0 ? "emerald" : "red"} delay={100} />
        <StatCard title="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} icon={Target} trend={metrics.winRate > 50 ? "up" : "down"} color="blue" delay={150} />
        <StatCard title="Profit Factor" value={formatProfitFactor(metrics.profitFactor)} icon={Zap} trend={metrics.profitFactor > 1.5 ? "up" : "neutral"} color="purple" delay={200} />
        <StatCard title="Total Trades" value={metrics.totalTrades} icon={BarChart3} color="cyan" delay={250} />

        {/* Row 2: Equity Chart (Double Width) */}
        <div className="col-span-1 md:col-span-2 xl:col-span-2 row-span-2 analytics-slide-up" style={{ animationDelay: "300ms" }}>
            <EquityCurveChart trades={trades} />
        </div>

        {/* Row 2 continued */}
        <StatCard title="Avg Win" value={formatCurrency(metrics.avgWin)} icon={ArrowUpRight} color="emerald" delay={350} />
        <StatCard title="Avg Loss" value={formatCurrency(metrics.avgLoss)} icon={ArrowDownRight} color="red" delay={400} />
        
        {/* Row 3 */}
        <StatCard title="Expectancy" value={formatCurrency(metrics.expectedValue)} icon={Calculator} subtitle="Per Trade" color={metrics.expectedValue > 0 ? "emerald" : "orange"} delay={450} />
        <StatCard title="Avg Duration" value={formatMinutes(metrics.avgTradeTime)} icon={Timer} subtitle="Holding Time" color="cyan" delay={500} />
      </div>

      {/* Secondary Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 analytics-slide-up" style={{ animationDelay: "600ms" }}>
        
        {/* Strategy Performance */}
        <Card className="analytics-glass analytics-card-hover col-span-1 lg:col-span-2 h-[320px]">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-300 uppercase tracking-wider flex items-center gap-2">
               <Activity className="w-4 h-4 text-purple-400" /> Top Strategies
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlByStrategy} layout="vertical" margin={{ left: 0 }}>
                 <CartesianGrid stroke="rgba(255,255,255,0.03)" horizontal={false} />
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={100} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                 <RechartsTooltip content={<CustomTooltip prefix="$" />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                 <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {pnlByStrategy.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "#10b981" : "#f43f5e"} />
                    ))}
                 </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Win/Loss Distribution */}
        <Card className="analytics-glass analytics-card-hover h-[320px]">
          <CardHeader>
             <CardTitle className="text-sm font-medium text-gray-300 uppercase tracking-wider flex items-center gap-2">
               <PieChart className="w-4 h-4 text-blue-400" /> Outcome Dist.
             </CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={winLossData} margin={{ top: 20 }}>
                   <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                   <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                   <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

// -------------------------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------------------------

const calculateMetrics = (filteredTrades: Trade[]): Metrics => {
  const totalTrades = filteredTrades.length;
  const profitableTrades = filteredTrades.filter(t => (t.profit_loss_currency || 0) > 0).length;
  const losingTrades = filteredTrades.filter(t => (t.profit_loss_currency || 0) < 0).length;
  const breakEvenTrades = filteredTrades.filter(t => (t.profit_loss_currency || 0) === 0).length;
  
  const totalProfit = filteredTrades.filter(t => (t.profit_loss_currency || 0) > 0).reduce((a, b) => a + (b.profit_loss_currency || 0), 0);
  const totalLossAbs = Math.abs(filteredTrades.filter(t => (t.profit_loss_currency || 0) < 0).reduce((a, b) => a + (b.profit_loss_currency || 0), 0));
  const netPnL = totalProfit - totalLossAbs;
  
  const decisiveTrades = profitableTrades + losingTrades;
  const winRate = decisiveTrades > 0 ? (profitableTrades / decisiveTrades) * 100 : 0;
  const profitFactor = totalLossAbs > 0 ? totalProfit / totalLossAbs : totalProfit > 0 ? Infinity : 0;
  
  const closedTrades = filteredTrades.filter(t => t.closed_at && isValid(parseISO(t.closed_at)));
  const avgTradeTime = closedTrades.length > 0
    ? closedTrades.reduce((sum, t) => sum + differenceInMinutes(parseISO(t.closed_at!), parseISO(t.opened_at)), 0) / closedTrades.length
    : 0;

  return {
    totalTrades,
    profitableTrades,
    losingTrades,
    breakEvenTrades,
    nonProfitableTrades: losingTrades + breakEvenTrades,
    winRate,
    profitFactor,
    netPnL,
    avgWin: profitableTrades > 0 ? totalProfit / profitableTrades : 0,
    avgLoss: losingTrades > 0 ? totalLossAbs / losingTrades : 0,
    expectedValue: totalTrades > 0 ? netPnL / totalTrades : 0,
    netDailyPnL: 0, // Simplified for this view
    avgTradeTime,
  };
};

const Analytics = () => {
  const { data: trades = [], isLoading, refetch, isFetching } = useQuery<Trade[]>({
    queryKey: ["trades"],
    queryFn: async () => {
      // In production, consider pagination or server-side aggregation for >5000 trades
      const { data, error } = await supabase.from("trades").select(`*, strategies(name)`).order("opened_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Trade[];
    },
  });

  const [currentTab, setCurrentTab] = useState<PeriodKey>("all");

  const filteredTrades = useMemo(() => {
    if (currentTab === "all") return trades;
    const now = new Date();
    const filterFn = (date: Date) => {
      if (currentTab === "week") return date >= startOfWeek(now) && date <= endOfWeek(now);
      if (currentTab === "month") return date >= startOfMonth(now) && date <= endOfMonth(now);
      if (currentTab === "quarter") return date >= startOfQuarter(now) && date <= endOfQuarter(now);
      if (currentTab === "year") return date >= startOfYear(now) && date <= endOfYear(now);
      return true;
    };
    return trades.filter(t => filterFn(new Date(t.opened_at)));
  }, [trades, currentTab]);

  const metrics = useMemo(() => calculateMetrics(filteredTrades), [filteredTrades]);

  return (
    <div className="min-h-screen bg-[#05060b] text-white relative overflow-x-hidden selection:bg-emerald-500/30">
      <GlobalAnalyticsStyles />
      <BackgroundLayer />

      <div className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 analytics-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Performance</h1>
              <p className="text-sm text-gray-400">Real-time trading analytics and insights.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md">
              <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as PeriodKey)} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl w-full sm:w-auto overflow-x-auto flex-nowrap justify-start">
            {[
              { key: "all", label: "All Time" },
              { key: "week", label: "This Week" },
              { key: "month", label: "This Month" },
              { key: "quarter", label: "This Quarter" },
              { key: "year", label: "This Year" },
            ].map((p) => (
              <TabsTrigger
                key={p.key}
                value={p.key}
                className="rounded-lg text-xs sm:text-sm px-4 py-2 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all text-gray-400 hover:text-gray-200"
              >
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={currentTab} className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            {isLoading ? <DashboardSkeleton /> : <AnalyticsContent metrics={metrics} trades={filteredTrades} periodLabel={currentTab} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;