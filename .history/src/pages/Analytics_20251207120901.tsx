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
  AlertCircle,
  ScatterChart as ScatterIcon, 
  BarChart as BarChartIcon
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
  format
} from "date-fns";
import { cn } from "@/lib/utils";

// Recharts Imports
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

// -------------------------------------------------------------------------------------
// Animation + glass styles
// -------------------------------------------------------------------------------------

const ANALYTICS_STYLES = `
  .analytics-float { animation: analytics-float 6s ease-in-out infinite; }
  .analytics-float-delayed { animation: analytics-float 6s ease-in-out infinite; animation-delay: 2s; }
  .analytics-pulse { animation: analytics-pulse 3s ease-in-out infinite; }
  .analytics-slide-up { animation: analytics-slide-up 0.5s ease-out forwards; opacity: 0; }
  .analytics-fade-in { animation: analytics-fade-in 0.6s ease-out forwards; opacity: 0; }
  .analytics-glass {
    background: radial-gradient(circle at top left, rgba(52, 211, 153, 0.05), transparent 45%),
                radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.05), transparent 45%),
                hsl(var(--card) / 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid hsl(var(--border));
  }
  .analytics-card-hover { transition: all 0.3s ease; }
  .analytics-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 20px 40px -15px rgba(0,0,0,0.3);
    border-color: hsl(var(--primary) / 0.4);
  }
  
  /* Custom Tooltip Styles for Recharts */
  .custom-tooltip {
    background-color: hsl(var(--popover));
    border: 1px solid hsl(var(--border));
    padding: 8px 12px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }

  @keyframes analytics-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes analytics-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
  @keyframes analytics-slide-up { 0% { transform: translateY(18px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes analytics-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
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
  if (abs >= 1_000_000) return `${value < 0 ? "-" : ""}$${(absValue / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${value < 0 ? "-" : ""}$${(absValue / 1_000).toFixed(1)}K`;
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
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
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] analytics-float" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] analytics-float-delayed" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] bg-emerald-500/5 rounded-full blur-[150px] analytics-pulse" />
    </div>
  );
});

const AnimatedGrid = memo(function AnimatedGrid() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.2)_1px,transparent_1px)] bg-[size:60px_60px]" />
    </div>
  );
});

// -------------------------------------------------------------------------------------
// Skeletons & Loading
// -------------------------------------------------------------------------------------

const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
       <div className="h-32 w-full rounded-2xl bg-muted/20" />
       <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
         {Array.from({ length: 10 }).map((_, i) => (
           <div key={i} className="h-24 rounded-xl bg-muted/20" />
         ))}
       </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 rounded-xl bg-muted/20" />
          <div className="h-64 rounded-xl bg-muted/20" />
       </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------
// Reusable stat card
// -------------------------------------------------------------------------------------

type AccentColor = "emerald" | "blue" | "purple" | "orange" | "red" | "cyan";

const STAT_COLORS: Record<AccentColor, { bg: string; text: string; glow: string }> = {
  emerald: { bg: "from-emerald-500/10 to-emerald-600/5", text: "text-emerald-500", glow: "shadow-emerald-500/10" },
  blue: { bg: "from-blue-500/10 to-blue-600/5", text: "text-blue-500", glow: "shadow-blue-500/10" },
  purple: { bg: "from-purple-500/10 to-purple-600/5", text: "text-purple-500", glow: "shadow-purple-500/10" },
  orange: { bg: "from-orange-500/10 to-orange-600/5", text: "text-orange-500", glow: "shadow-orange-500/10" },
  red: { bg: "from-red-500/10 to-red-600/5", text: "text-red-500", glow: "shadow-red-500/10" },
  cyan: { bg: "from-cyan-500/10 to-cyan-600/5", text: "text-cyan-500", glow: "shadow-cyan-500/10" },
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

const StatCard = memo(function StatCard({ title, value, subtitle, icon: Icon, trend, color = "emerald", delay = 0 }: StatCardProps) {
  const colors = STAT_COLORS[color];
  const isNegative = typeof value === "string" ? value.startsWith("-") || value.startsWith("$-") : typeof value === "number" && value < 0;

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden group h-full analytics-slide-up" style={{ animationDelay: `${delay}ms` }}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-75 transition-opacity", colors.bg)} />
      <CardContent className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-muted-foreground font-semibold">{title}</p>
            <p className={cn("text-lg sm:text-xl font-bold tabular-nums leading-tight", isNegative ? "text-red-500" : "text-foreground")}>{value}</p>
            {subtitle && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                {trend && trend !== "neutral" && (
                  <span className={cn("flex items-center gap-0.5 font-semibold", trend === "up" ? "text-emerald-500" : "text-red-500")}>
                    {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  </span>
                )}
                <span>{subtitle}</span>
              </div>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110 flex-shrink-0 border border-border/50", colors.bg, colors.glow)}>
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

const TraderLevel = memo(function TraderLevel({ winRate, profitFactor, totalTrades, netPnL }: TraderLevelProps) {
  const { level, color, progress } = useMemo(() => {
    if (totalTrades < 10) return { level: "Beginner", color: "gray" as const, progress: Math.min(totalTrades * 10, 100) };
    if (winRate >= 65 && profitFactor >= 2 && netPnL > 0) return { level: "Elite", color: "emerald" as const, progress: 100 };
    if (winRate >= 55 && profitFactor >= 1.5 && netPnL > 0) return { level: "Advanced", color: "blue" as const, progress: 75 };
    if (winRate >= 45 && profitFactor >= 1) return { level: "Intermediate", color: "purple" as const, progress: 50 };
    return { level: "Developing", color: "orange" as const, progress: 25 };
  }, [winRate, profitFactor, totalTrades, netPnL]);

  const colorMap = {
    gray: "text-muted-foreground bg-muted",
    emerald: "text-emerald-500 bg-emerald-500",
    blue: "text-blue-500 bg-blue-500",
    purple: "text-purple-500 bg-purple-500",
    orange: "text-orange-500 bg-orange-500",
  };

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden analytics-slide-up">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10", colorMap[color].split(" ")[1])} />
      <CardContent className="relative z-10 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className={cn("p-3.5 rounded-2xl bg-card shadow-lg border border-border/50")}>
              <Award className={cn("w-6 h-6", colorMap[color].split(" ")[0])} />
            </div>
            <div>
              <p className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground">Trader Level</p>
              <p className={cn("text-2xl sm:text-3xl font-semibold text-foreground")}>{level}</p>
            </div>
          </div>
          <div className="space-y-1 md:text-right">
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground">Progress</p>
            <p className="text-2xl font-semibold text-foreground">{progress}%</p>
          </div>
        </div>
        <div className="mt-5 h-2.5 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-1000 ease-out", colorMap[color].split(" ")[1])} style={{ width: `${progress}%` }} />
        </div>
      </CardContent>
    </Card>
  );
});

// -------------------------------------------------------------------------------------
// CHART 1: EQUITY CURVE (Area Chart)
// -------------------------------------------------------------------------------------

const EquityCurveChart = memo(function EquityCurveChart({ trades }: { trades: Trade[] }) {
  const chartData = useMemo(() => {
    if (!trades.length) return [];
    let cumulative = 0;
    return trades.map((trade, index) => {
      const pnl = trade.profit_loss_currency || 0;
      cumulative += pnl;
      return {
        name: index + 1,
        date: new Date(trade.opened_at).toLocaleDateString(),
        value: cumulative,
        pnl,
      };
    });
  }, [trades]);

  const isProfitable = (chartData[chartData.length - 1]?.value || 0) >= 0;
  const color = isProfitable ? "#10b981" : "#ef4444"; // emerald-500 or red-500

  if (!chartData.length) return null;

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden h-[400px]">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5" />
      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <LineChart className="w-5 h-5 text-emerald-500" />
          Equity Curve
        </CardTitle>
        <CardDescription className="text-muted-foreground">Cumulative P&L over time</CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 h-[320px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="custom-tooltip">
                      <p className="text-xs text-muted-foreground">Trade #{label}</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(payload[0].value as number)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#colorPnL)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

// -------------------------------------------------------------------------------------
// CHART 2: PNL BY DAY (Bar Chart)
// -------------------------------------------------------------------------------------

const PnLByDayChart = memo(function PnLByDayChart({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const aggregation = days.map(day => ({ day, pnl: 0, count: 0 }));
    
    trades.forEach(t => {
      const date = new Date(t.opened_at);
      const dayIndex = date.getDay(); // 0 = Sun
      aggregation[dayIndex].pnl += (t.profit_loss_currency || 0);
      aggregation[dayIndex].count += 1;
    });

    // Filter out weekends if no trades
    return aggregation.filter(d => d.count > 0 || (d.day !== "Sun" && d.day !== "Sat"));
  }, [trades]);

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden h-[350px]">
      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          PnL by Weekday
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 h-[270px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
            <Tooltip
               cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }}
               content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const val = payload[0].value as number;
                  return (
                    <div className="custom-tooltip">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={cn("text-sm font-bold", val >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {formatCurrency(val)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

// -------------------------------------------------------------------------------------
// CHART 3: DISTRIBUTION (Histogram)
// -------------------------------------------------------------------------------------

const DistributionChart = memo(function DistributionChart({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    if (!trades.length) return [];
    
    // Create buckets
    const pnls = trades.map(t => t.profit_loss_currency || 0);
    const min = Math.floor(Math.min(...pnls) / 50) * 50;
    const max = Math.ceil(Math.max(...pnls) / 50) * 50;
    
    // Dynamic bin size to avoid too many bars
    const range = max - min;
    const binSize = range > 1000 ? 100 : range > 500 ? 50 : 25;

    const buckets: Record<string, { range: string, count: number, min: number }> = {};
    
    // Initialize buckets roughly
    for(let i = min; i < max; i += binSize) {
      const label = `${i} to ${i + binSize}`;
      buckets[label] = { range: label, count: 0, min: i };
    }

    trades.forEach(t => {
      const val = t.profit_loss_currency || 0;
      // Find bucket
      const bucketStart = Math.floor(val / binSize) * binSize;
      const label = `${bucketStart} to ${bucketStart + binSize}`;
      if (!buckets[label]) buckets[label] = { range: label, count: 0, min: bucketStart };
      buckets[label].count += 1;
    });

    return Object.values(buckets).sort((a,b) => a.min - b.min);
  }, [trades]);

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden h-[350px]">
      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <BarChartIcon className="w-5 h-5 text-purple-500" />
          Trade Return Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 h-[270px] w-full pt-2">
         <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
             <XAxis 
                dataKey="range" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => {
                  // Simplified label
                  const num = parseInt(val.split(" ")[0]);
                  return `$${num}`;
                }}
              />
             <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
             <Tooltip 
                cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="custom-tooltip">
                        <p className="text-xs text-muted-foreground">Range: {label}</p>
                        <p className="text-sm font-bold text-foreground">Count: {payload[0].value}</p>
                      </div>
                    );
                  }
                  return null;
                }}
             />
             <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} opacity={0.8} />
          </BarChart>
         </ResponsiveContainer>
      </CardContent>
    </Card>
  )
});

// -------------------------------------------------------------------------------------
// CHART 4: SCATTER (Duration vs PnL - Proxy for Risk vs Reward)
// -------------------------------------------------------------------------------------

const RiskRewardScatter = memo(function RiskRewardScatter({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    return trades
      .filter(t => t.closed_at && t.opened_at)
      .map((t, i) => {
        const duration = differenceInMinutes(parseISO(t.closed_at!), parseISO(t.opened_at));
        return {
          id: i,
          x: duration, // X Axis: Time held (mins)
          y: t.profit_loss_currency || 0, // Y Axis: PnL
          symbol: t.symbol,
          side: t.side
        };
      });
  }, [trades]);

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden h-[350px]">
      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <ScatterIcon className="w-5 h-5 text-orange-500" />
          Duration vs. PnL
        </CardTitle>
        <CardDescription className="text-muted-foreground">Analyze holding time vs performance</CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 h-[270px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Duration" 
              unit="m" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="PnL" 
              unit="$" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Tooltip 
               cursor={{ strokeDasharray: '3 3' }}
               content={({ active, payload }) => {
                 if (active && payload && payload.length) {
                   const data = payload[0].payload;
                   return (
                     <div className="custom-tooltip">
                       <p className="font-bold text-foreground">{data.symbol} <span className="text-xs font-normal text-muted-foreground">({data.side})</span></p>
                       <p className={cn("text-sm", data.y >= 0 ? "text-emerald-500" : "text-red-500")}>PnL: {formatCurrency(data.y)}</p>
                       <p className="text-xs text-muted-foreground">Time: {formatMinutes(data.x)}</p>
                     </div>
                   );
                 }
                 return null;
               }}
            />
            <Scatter name="Trades" data={data} fill="#8884d8">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.y >= 0 ? "#10b981" : "#ef4444"} opacity={0.6} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
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
      { trades: number; wins: number; losses: number; pnl: number }
    > = {};

    trades.forEach((trade) => {
      const strategyName =
        trade.strategies?.name ?? "No Strategy";
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
        // Win rate excluding break-even trades
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
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-500" />
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
              className="flex items-center justify-between p-3.5 rounded-xl bg-accent/40 hover:bg-accent/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold",
                    strategy.pnl >= 0
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-red-500/10 text-red-500"
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
                      ? "text-emerald-500"
                      : "text-red-500"
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
        <div className="p-4 rounded-full bg-muted mb-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">No trades found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          There are no trades recorded for {periodLabel.toLowerCase()}. 
          Try selecting a different period or logging new trades.
        </p>
      </div>
    );
  }

  const summaryCards: StatCardProps[] = [
    { title: "Total Trades", value: metrics.totalTrades, icon: BarChart3, trend: "neutral", color: "purple", subtitle: "Executed orders" },
    { title: "Win Rate", value: `${metrics.winRate.toFixed(1)}%`, icon: Target, trend: metrics.winRate >= 50 ? "up" : "down", color: "blue", subtitle: "Wins / Total" },
    { title: "Profit Factor", value: formatProfitFactor(metrics.profitFactor), icon: Zap, trend: metrics.profitFactor > 1 ? "up" : "down", color: metrics.profitFactor >= 1 ? "emerald" : "orange", subtitle: "Gross profit ÷ loss" },
    { title: "Net P&L", value: formatCurrency(metrics.netPnL), icon: DollarSign, trend: metrics.netPnL > 0 ? "up" : "down", color: metrics.netPnL >= 0 ? "emerald" : "red", subtitle: periodLabel },
    { title: "Avg Win", value: formatCurrency(metrics.avgWin), icon: ArrowUpRight, trend: "up", color: "emerald", subtitle: "Per winning trade" },
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

      {/* Summary metrics */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground tracking-[0.16em] uppercase">Overview</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {summaryCards.map((card, index) => (
            <StatCard key={card.title} {...card} delay={60 + index * 50} />
          ))}
        </div>
      </section>

      {/* Equity curve (Main Chart) */}
      <div className="analytics-slide-up" style={{ animationDelay: "200ms" }}>
        <EquityCurveChart trades={trades} />
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
         <div className="analytics-slide-up" style={{ animationDelay: "300ms" }}>
            <PnLByDayChart trades={trades} />
         </div>
         <div className="analytics-slide-up" style={{ animationDelay: "350ms" }}>
            <DistributionChart trades={trades} />
         </div>
         <div className="analytics-slide-up" style={{ animationDelay: "400ms" }}>
            <RiskRewardScatter trades={trades} />
         </div>
         <div className="analytics-slide-up" style={{ animationDelay: "450ms" }}>
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
  const profitableTrades = filteredTrades.filter((t) => (t.profit_loss_currency || 0) > 0).length;
  const losingTrades = filteredTrades.filter((t) => (t.profit_loss_currency || 0) < 0).length;
  const breakEvenTrades = filteredTrades.filter((t) => (t.profit_loss_currency || 0) === 0).length;
  const nonProfitableTrades = losingTrades + breakEvenTrades;
  
  const totalProfit = filteredTrades.filter((t) => (t.profit_loss_currency || 0) > 0).reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
  const totalLossAbs = Math.abs(filteredTrades.filter((t) => (t.profit_loss_currency || 0) < 0).reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0));
  const netPnL = filteredTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
  
  const decisiveTrades = profitableTrades + losingTrades;
  const winRate = decisiveTrades > 0 ? (profitableTrades / decisiveTrades) * 100 : 0;
  const profitFactor = totalLossAbs > 0 ? totalProfit / totalLossAbs : totalProfit > 0 ? Infinity : 0;
  const avgWin = profitableTrades > 0 ? totalProfit / profitableTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLossAbs / losingTrades : 0;
  const expectedValue = totalTrades > 0 ? netPnL / totalTrades : 0;
  
  const tradingDays = new Set(filteredTrades.map((t) => new Date(t.opened_at).toDateString())).size;
  const netDailyPnL = tradingDays > 0 ? netPnL / tradingDays : 0;
  
  const closedTrades = filteredTrades.filter((t) => t.closed_at && isValid(parseISO(t.closed_at)));
  const avgTradeTime = closedTrades.length > 0 ? closedTrades.reduce((sum, t) => sum + differenceInMinutes(parseISO(t.closed_at!), parseISO(t.opened_at)), 0) / closedTrades.length : 0;

  return { totalTrades, profitableTrades, losingTrades, breakEvenTrades, nonProfitableTrades, winRate, profitFactor, netPnL, avgWin, avgLoss, expectedValue, netDailyPnL, avgTradeTime };
};

const PeriodAnalytics = memo(function PeriodAnalytics({ allTrades, periodKey, periodLabel }: { allTrades: Trade[]; periodKey: PeriodKey; periodLabel: string; }) {
  const { filteredTrades, metrics } = useMemo(() => {
    const getTradesForPeriod = (trades: Trade[], period: PeriodKey): Trade[] => {
      if (period === "all") return trades;
      const now = new Date();
      let start: Date;
      let end: Date;
      switch (period) {
        case "week": start = startOfWeek(now); end = endOfWeek(now); break;
        case "month": start = startOfMonth(now); end = endOfMonth(now); break;
        case "quarter": start = startOfQuarter(now); end = endOfQuarter(now); break;
        case "year": start = startOfYear(now); end = endOfYear(now); break;
        default: return trades;
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

  return <AnalyticsContent metrics={metrics} trades={filteredTrades} periodLabel={periodLabel} />;
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

  const { data: trades = [], isLoading, isFetching, refetch } = useQuery<Trade[]>({
    queryKey: ["trades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select(`*, strategies (name)`)
        .order("opened_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Trade[];
    },
  });

  const periods: { key: PeriodKey; label: string; }[] = [
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
      <div className={cn("relative z-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto transition-all duration-700", isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-7 analytics-fade-in">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-xl shadow-emerald-500/40 analytics-float">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Trading Analytics</h1>
              <p className="text-sm text-muted-foreground">Detailed performance metrics and charts.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="bg-card border-border text-muted-foreground hover:text-foreground">
              <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
              Sync
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-muted/50 border border-border/50 p-1 rounded-2xl">
            {periods.map((p) => (
              <TabsTrigger
                key={p.key}
                value={p.key}
                className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {periods.map((p) => (
            <TabsContent key={p.key} value={p.key} className="space-y-6">
              {isLoading ? <DashboardSkeleton /> : <PeriodAnalytics allTrades={trades} periodKey={p.key} periodLabel={p.label} />}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;