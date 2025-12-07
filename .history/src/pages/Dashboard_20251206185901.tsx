import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Flame,
  BookOpen,
  PlusCircle,
  BarChart3,
  Activity,
  Zap,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Bell,
  Settings,
  RefreshCw,
  LineChart,
  PieChart,
  Shield,
  Award,
  Sparkles,
  AlertCircle,
  CandlestickChart,
  Save,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// --- STYLES ---
const DASHBOARD_STYLES = `
  .dash-float { animation: dash-float 6s ease-in-out infinite; }
  .dash-float-delayed { animation: dash-float 6s ease-in-out infinite; animation-delay: 2s; }
  .dash-pulse { animation: dash-pulse 3s ease-in-out infinite; }
  .dash-glow { animation: dash-glow 2s ease-in-out infinite; }
  .dash-shimmer { animation: dash-shimmer 3s ease-in-out infinite; background-size: 200% 100%; }
  .dash-slide-up { animation: dash-slide-up 0.5s ease-out forwards; }
  .dash-slide-right { animation: dash-slide-right 0.5s ease-out forwards; }
  .dash-fade-in { animation: dash-fade-in 0.6s ease-out forwards; }
  .dash-scale-in { animation: dash-scale-in 0.4s ease-out forwards; }
  .dash-bounce { animation: dash-bounce 1s ease-in-out infinite; }
  
  @keyframes dash-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes dash-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
  @keyframes dash-glow { 0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); } 50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); } }
  @keyframes dash-slide-up { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes dash-slide-right { 0% { transform: translateX(-20px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
  @keyframes dash-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes dash-scale-in { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes dash-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  
  .dash-glass {
    background: rgba(18, 19, 26, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .dash-card-hover {
    transition: all 0.3s ease;
  }
  .dash-card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border-color: rgba(16, 185, 129, 0.3);
  }
  
  .dash-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .dash-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
  .dash-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.3); border-radius: 3px; }
  
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  
  @media (prefers-reduced-motion: reduce) {
    .dash-float, .dash-pulse, .dash-glow, .dash-bounce { animation: none !important; }
  }
`;

// --- TYPES ---
interface Trade {
  id: string;
  symbol: string;
  side: "long" | "short";
  profit_loss_currency: number;
  profit_loss_percent: number;
  opened_at: string;
  closed_at: string;
  strategy?: string;
  notes?: string;
}

interface UserGoals {
  monthly_pnl_goal: number;
  monthly_trades_goal: number;
  win_rate_goal: number;
}

interface DashboardStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakEven: number;
  decisiveTrades: number;
  totalPnL: number;
  winRate: string;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  bestTrade: number;
  worstTrade: number;
  streak: number;
  monthlyPnL: number;
  monthlyTrades: number;
}

// --- UTILS ---
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) return `${value < 0 ? "-" : ""}$${(absValue / 1000000).toFixed(2)}M`;
  if (absValue >= 1000) return `${value < 0 ? "-" : ""}$${(absValue / 1000).toFixed(1)}K`;
  return `${value < 0 ? "-" : ""}$${absValue.toFixed(2)}`;
};

const formatPercent = (value: number): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const getTimeAgo = (date: string): string => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// --- HOOKS ---
const useAnimatedCounter = (
  end: number,
  duration: number = 1500,
  decimals: number = 0
) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    const start = countRef.current;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * easeOut;

      setCount(Number(current.toFixed(decimals)));
      countRef.current = current;

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [end, duration, decimals]);

  return count;
};

// --- COMPONENTS ---

const FloatingOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute -top-20 -left-20 w-48 sm:w-80 h-48 sm:h-80 bg-emerald-500/10 rounded-full blur-[80px] sm:blur-[100px] dash-float" />
    <div className="absolute -bottom-20 -right-20 w-56 sm:w-96 h-56 sm:h-96 bg-blue-500/10 rounded-full blur-[100px] sm:blur-[120px] dash-float-delayed" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-purple-500/5 rounded-full blur-[100px] sm:blur-[150px] dash-pulse" />
  </div>
));
FloatingOrbs.displayName = "FloatingOrbs";

const AnimatedGrid = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-30">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:30px_30px] sm:bg-[size:50px_50px]" />
  </div>
));
AnimatedGrid.displayName = "AnimatedGrid";

// Profit Factor Mini Chart Component
const ProfitFactorChart = memo(({ profitFactor }: { profitFactor: number }) => {
  // Normalize profit factor for display (0-3+ scale)
  const normalizedValue = Math.min(profitFactor, 3);
  const percentage = (normalizedValue / 3) * 100;
  
  const getColor = () => {
    if (profitFactor >= 2) return "text-emerald-400";
    if (profitFactor >= 1.5) return "text-green-400";
    if (profitFactor >= 1) return "text-yellow-400";
    return "text-red-400";
  };

  const getBarColor = () => {
    if (profitFactor >= 2) return "bg-emerald-500";
    if (profitFactor >= 1.5) return "bg-green-500";
    if (profitFactor >= 1) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] sm:text-xs text-gray-500">Profit Factor</span>
        <span className={cn("text-xs sm:text-sm font-bold", getColor())}>
          {profitFactor.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000", getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[8px] sm:text-[10px] text-gray-600">
        <span>0</span>
        <span>1</span>
        <span>2</span>
        <span>3+</span>
      </div>
    </div>
  );
});
ProfitFactorChart.displayName = "ProfitFactorChart";

// Stat Card
const StatCard = memo(
  ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    trendValue,
    color = "emerald",
    delay = 0,
    size = "default",
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: typeof Target;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    color?: "emerald" | "blue" | "purple" | "orange" | "red";
    delay?: number;
    size?: "default" | "large";
  }) => {
    const colorClasses = {
      emerald: { bg: "from-emerald-500/20 to-emerald-600/10", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
      blue: { bg: "from-blue-500/20 to-blue-600/10", text: "text-blue-400", glow: "shadow-blue-500/20" },
      purple: { bg: "from-purple-500/20 to-purple-600/10", text: "text-purple-400", glow: "shadow-purple-500/20" },
      orange: { bg: "from-orange-500/20 to-orange-600/10", text: "text-orange-400", glow: "shadow-orange-500/20" },
      red: { bg: "from-red-500/20 to-red-600/10", text: "text-red-400", glow: "shadow-red-500/20" },
    };
    const colors = colorClasses[color];

    return (
      <Card
        className={cn("dash-glass dash-card-hover relative overflow-hidden group h-full", size === "large" && "p-1 sm:p-2")}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity", colors.bg)} />
        <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 opacity-20">
          <div className={cn("absolute top-0 right-0 w-full h-full bg-gradient-to-bl rounded-bl-full", colors.bg)} />
        </div>
        <CardContent className={cn("relative z-10", size === "large" ? "p-4 sm:p-6" : "p-3 sm:p-4")}>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-400 font-semibold truncate">{title}</p>
              <p className={cn("font-bold tabular-nums dash-count truncate", size === "large" ? "text-xl sm:text-3xl" : "text-lg sm:text-2xl", typeof value === "string" && value.startsWith("-") ? "text-red-400" : "text-white")}>
                {value}
              </p>
              {subtitle && (
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  {trend && (
                    <span className={cn("flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-semibold", trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-gray-400")}>
                      {trend === "up" ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : trend === "down" ? <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : null}
                      {trendValue}
                    </span>
                  )}
                  <span className="text-[10px] sm:text-xs text-gray-500 truncate">{subtitle}</span>
                </div>
              )}
            </div>
            <div className={cn("p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110 flex-shrink-0", colors.bg, colors.glow)}>
              <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", colors.text)} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
StatCard.displayName = "StatCard";

// Welcome Card with Profit Factor Chart
const WelcomeCard = memo(({ userName, stats }: { userName: string; stats: DashboardStats }) => {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Calculate dynamic message
  const performanceMessage = useMemo(() => {
    if (stats.totalTrades === 0) return "Start logging trades to unlock performance insights.";
    
    const winRate = parseFloat(stats.winRate);
    const pnl = stats.totalPnL;
    const pf = stats.profitFactor;

    if (pnl > 0 && winRate >= 55 && pf >= 1.5) return "Outstanding performance! Your edge is working. Keep it up! 🔥";
    if (pnl > 0 && winRate >= 50) return "Your trading performance is looking strong. Keep up the momentum!";
    if (pnl > 0 && winRate < 50) return "Profitable despite low win rate. Great risk/reward management!";
    if (pnl < 0 && winRate >= 50) return "High win rate but negative P&L. Review your risk/reward ratio.";
    if (pnl < 0 && pf < 1) return "Focus on cutting losses quickly and letting winners run.";
    if (pnl < 0) return "Markets are challenging. Stick to your plan and manage risk carefully.";
    
    return "Consistency is key. Stay disciplined with your trading plan.";
  }, [stats]);

  const isMarketOpen = useMemo(() => {
    const now = new Date();
    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 21; 
  }, []);

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-purple-500/10" />
      <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-emerald-500/10 rounded-full blur-[60px] sm:blur-[80px] dash-float" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-50" />

      <CardContent className="relative z-10 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-3 sm:space-y-4 flex-1 min-w-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 dash-bounce" />
                  <span className="text-xs sm:text-sm text-gray-400">{greeting}</span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                    {userName}
                  </span>
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm md:text-base max-w-md">
                  {performanceMessage}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse", isMarketOpen ? "bg-emerald-400" : "bg-yellow-400")} />
                  <span className={cn("text-[10px] sm:text-xs font-medium", isMarketOpen ? "text-emerald-400" : "text-yellow-400")}>
                    {isMarketOpen ? "Markets Open" : "Markets Closed"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 border border-white/10">
                  <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400" />
                  <span className="text-[10px] sm:text-xs text-gray-400">
                    {stats.totalTrades} trades
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 border border-white/10">
                  <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-400" />
                  <span className="text-[10px] sm:text-xs text-gray-400">
                    {stats.streak} win streak
                  </span>
                </div>
              </div>
            </div>

            {/* Win Rate Circle + Profit Factor Chart */}
            <div className="hidden sm:flex flex-col items-center gap-3 flex-shrink-0">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#12131a] flex items-center justify-center">
                    <div className="text-center">
                      <p className={cn(
                        "text-xl sm:text-2xl font-bold",
                        parseFloat(stats.winRate) >= 50 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {stats.winRate}%
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Win Rate</p>
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center dash-bounce",
                  parseFloat(stats.winRate) >= 50 ? "bg-emerald-500" : "bg-red-500"
                )}>
                  {parseFloat(stats.winRate) >= 50 ? (
                    <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                  ) : (
                    <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                  )}
                </div>
              </div>
              
              {/* Profit Factor Mini Chart */}
              <div className="w-28 sm:w-32">
                <ProfitFactorChart profitFactor={stats.profitFactor} />
              </div>
            </div>
          </div>

          {/* Mobile Win Rate + Profit Factor */}
          <div className="sm:hidden flex items-center justify-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#12131a] flex items-center justify-center">
                  <div className="text-center">
                    <p className={cn(
                      "text-xl font-bold",
                      parseFloat(stats.winRate) >= 50 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {stats.winRate}%
                    </p>
                    <p className="text-[10px] text-gray-500">Win Rate</p>
                  </div>
                </div>
              </div>
              <div className={cn(
                "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center dash-bounce",
                parseFloat(stats.winRate) >= 50 ? "bg-emerald-500" : "bg-red-500"
              )}>
                {parseFloat(stats.winRate) >= 50 ? (
                  <TrendingUp className="w-2.5 h-2.5 text-white" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5 text-white" />
                )}
              </div>
            </div>
            
            {/* Mobile Profit Factor */}
            <div className="w-28">
              <ProfitFactorChart profitFactor={stats.profitFactor} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
WelcomeCard.displayName = "WelcomeCard";

// Fixed Performance Chart with proper SVG rendering
const PerformanceChart = memo(({ trades }: { trades: Trade[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<"1W" | "1M" | "3M" | "YTD" | "ALL">("1M");
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    if (trades.length === 0) {
      return [];
    }

    const now = new Date();
    let startDate = new Date();
    
    if (timeframe === "1W") startDate.setDate(now.getDate() - 7);
    else if (timeframe === "1M") startDate.setMonth(now.getMonth() - 1);
    else if (timeframe === "3M") startDate.setMonth(now.getMonth() - 3);
    else if (timeframe === "YTD") startDate = new Date(now.getFullYear(), 0, 1);
    else {
      const oldestTrade = trades[trades.length - 1];
      startDate = new Date(oldestTrade.closed_at || oldestTrade.opened_at);
    }

    const filteredTrades = trades
      .filter(t => new Date(t.closed_at || t.opened_at) >= startDate)
      .sort((a, b) => new Date(a.closed_at || a.opened_at).getTime() - new Date(b.closed_at || b.opened_at).getTime());

    if (filteredTrades.length === 0) return [];

    const dailyMap = new Map<string, { pnl: number, date: Date, dateStr: string }>();
    
    filteredTrades.forEach(t => {
      const dateObj = new Date(t.closed_at || t.opened_at);
      const dateKey = dateObj.toISOString().split('T')[0];
      const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { pnl: 0, date: dateObj, dateStr });
      }
      const dayData = dailyMap.get(dateKey)!;
      dayData.pnl += (t.profit_loss_currency || 0);
    });

    let cumulative = 0;
    const sortedDays = Array.from(dailyMap.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime());
    
    return sortedDays.map(([_, day]) => {
      cumulative += day.pnl;
      return {
        date: day.dateStr,
        value: cumulative,
        pnl: day.pnl,
        isProfit: day.pnl >= 0
      };
    });
  }, [trades, timeframe]);

  // Calculate chart dimensions and path
  const chartPath = useMemo(() => {
    if (chartData.length < 2) return { linePath: "", areaPath: "", points: [] };

    const padding = 0;
    const width = 100;
    const height = 100;

    const values = chartData.map(d => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    const points = chartData.map((d, i) => ({
      x: padding + (i / (chartData.length - 1)) * (width - 2 * padding),
      y: height - padding - ((d.value - minValue) / range) * (height - 2 * padding),
      data: d
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { linePath, areaPath, points, maxValue, minValue };
  }, [chartData]);

  const periodReturn = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const bestDay = chartData.length > 0 ? Math.max(...chartData.map(d => d.pnl)) : 0;
  const worstDay = chartData.length > 0 ? Math.min(...chartData.map(d => d.pnl)) : 0;

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5" />
      <CardHeader className="relative z-10 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                <LineChart className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                Equity Curve (P&L)
              </CardTitle>
              <CardDescription className="text-gray-500 text-xs sm:text-sm">
                Net profit/loss over selected timeframe
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto hide-scrollbar">
              {(["1W", "1M", "3M", "YTD", "ALL"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all flex-shrink-0",
                    timeframe === tf
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-gray-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-2 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="p-2 sm:p-3 rounded-lg bg-white/5">
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Period P&L</p>
            <p className={cn("text-sm sm:text-lg font-bold", periodReturn >= 0 ? "text-emerald-400" : "text-red-400")}>
              {formatCurrency(periodReturn)}
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-lg bg-white/5">
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Best Day</p>
            <p className="text-sm sm:text-lg font-bold text-emerald-400">
              {formatCurrency(bestDay)}
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-lg bg-white/5">
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Worst Day</p>
            <p className="text-sm sm:text-lg font-bold text-red-400">
              {formatCurrency(worstDay)}
            </p>
          </div>
        </div>

        <div className="relative h-48 sm:h-64" ref={chartRef}>
          {chartData.length >= 2 ? (
            <>
              {/* Y-Axis Labels */}
              <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 flex flex-col justify-between text-[10px] sm:text-xs text-gray-500 pr-2">
                <span className="truncate text-right">{formatCurrency(chartPath.maxValue || 0)}</span>
                <span className="truncate text-right">{formatCurrency(((chartPath.maxValue || 0) + (chartPath.minValue || 0)) / 2)}</span>
                <span className="truncate text-right">{formatCurrency(chartPath.minValue || 0)}</span>
              </div>

              {/* Chart Area */}
              <div className="ml-12 sm:ml-16 h-full relative">
                {/* Grid Lines */}
                <div className="absolute inset-0">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="absolute w-full border-t border-white/5" style={{ top: `${i * 25}%` }} />
                  ))}
                </div>

                {/* SVG Chart */}
                <svg 
                  className="absolute inset-0 w-full h-full" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={periodReturn >= 0 ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={periodReturn >= 0 ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Area Fill */}
                  <path
                    d={chartPath.areaPath}
                    fill="url(#equityGradient)"
                  />
                  
                  {/* Line */}
                  <path
                    d={chartPath.linePath}
                    fill="none"
                    stroke={periodReturn >= 0 ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Data Points */}
                  {chartPath.points?.map((point, i) => (
                    <circle
                      key={i}
                      cx={point.x}
                      cy={point.y}
                      r={hoveredIndex === i ? "1.5" : "0.8"}
                      fill={point.data.isProfit ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                      className="transition-all duration-150"
                    />
                  ))}
                </svg>

                {/* Hover Areas */}
                <div className="absolute inset-0 flex">
                  {chartData.map((d, i) => (
                    <div
                      key={i}
                      className="flex-1 h-full relative cursor-crosshair"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {hoveredIndex === i && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-[#1a1b23] border border-white/10 rounded-lg shadow-xl z-20 whitespace-nowrap">
                          <p className="text-[10px] sm:text-xs text-gray-400">{d.date}</p>
                          <p className="text-xs sm:text-sm font-bold text-white">
                            {formatCurrency(d.value)} (Equity)
                          </p>
                          <p className={cn("text-[10px] sm:text-xs font-medium", d.isProfit ? "text-emerald-400" : "text-red-400")}>
                            {d.isProfit ? "+" : ""}
                            {formatCurrency(d.pnl)} (Day)
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <CandlestickChart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No trade data for this period</p>
                <p className="text-xs text-gray-500 mt-1">Log trades to see your equity curve</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
PerformanceChart.displayName = "PerformanceChart";

// Recent Trades
const RecentTrades = memo(({ trades }: { trades: Trade[] }) => {
  const navigate = useNavigate();
  const recentTrades = trades.slice(0, 5);
  
  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
      <CardHeader className="relative z-10 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
              <span className="truncate">Recent Activity</span>
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs sm:text-sm">
              Your latest trades
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3"
            onClick={() => navigate("/journal")}
          >
            <span className="hidden sm:inline">View All</span>
            <ChevronRight className="w-4 h-4 sm:ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-2 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="space-y-2 sm:space-y-3">
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all group cursor-pointer dash-slide-right gap-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      trade.side === "long" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    )}
                  >
                    {trade.side === "long" ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors text-sm sm:text-base truncate">
                      {trade.symbol}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                      {trade.strategy || "Manual Trade"}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={cn(
                      "font-bold tabular-nums text-sm sm:text-base",
                      trade.profit_loss_currency >= 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {trade.profit_loss_currency >= 0 ? "+" : ""}
                    {formatCurrency(trade.profit_loss_currency)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    {getTimeAgo(trade.closed_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 sm:py-8">
              <CandlestickChart className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-2 sm:mb-3" />
              <p className="text-gray-400 text-sm sm:text-base">No trades yet</p>
              <p className="text-xs sm:text-sm text-gray-500">
                Start logging your trades to see them here
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
RecentTrades.displayName = "RecentTrades";

// Quick Actions
const QuickActions = memo(({ onNavigate }: { onNavigate: (path: string) => void }) => {
  const actions = [
    { icon: PlusCircle, label: "Log Trade", description: "Record new", path: "/journal", primary: true },
    { icon: BookOpen, label: "Playbook", description: "Strategies", path: "/playbook" },
    { icon: BarChart3, label: "Analytics", description: "Statistics", path: "/analytics" },
    { icon: Calendar, label: "Calendar", description: "Schedule", path: "/calendar" },
  ];

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/8 to-pink-500/10" />
      <CardHeader className="relative z-10 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
        <CardTitle className="text-sm sm:text-base text-white flex items-center gap-2">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 pt-1 sm:pt-2 pb-3 sm:pb-4 px-3 sm:px-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {actions.map((action, index) => (
            <Button
              key={action.label}
              variant={action.primary ? "default" : "outline"}
              className={cn(
                "h-auto py-2.5 sm:py-3 md:py-4 flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2 group transition-all w-full",
                action.primary
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
              onClick={() => onNavigate(action.path)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <action.icon className={cn("w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transition-transform group-hover:scale-110", action.primary ? "text-white" : "text-gray-400 group-hover:text-white")} />
              <div className="text-center space-y-0">
                <p className="font-semibold text-[10px] sm:text-[11px] md:text-sm text-white truncate">{action.label}</p>
                <p className={cn("text-[9px] sm:text-[10px] md:text-xs leading-tight hidden sm:block", action.primary ? "text-white/70" : "text-gray-500")}>{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
QuickActions.displayName = "QuickActions";

// Goals Settings Dialog
const GoalsSettingsDialog = memo(({ 
  open, 
  onOpenChange, 
  goals, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  goals: UserGoals;
  onSave: (goals: UserGoals) => void;
}) => {
  const [localGoals, setLocalGoals] = useState<UserGoals>(goals);

  useEffect(() => {
    setLocalGoals(goals);
  }, [goals]);

  const handleSave = () => {
    onSave(localGoals);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12131a] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-orange-400" />
            Edit Trading Goals
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Set your monthly trading targets to track your progress.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pnl-goal" className="text-gray-300">
              Monthly P&L Goal ($)
            </Label>
            <Input
              id="pnl-goal"
              type="number"
              value={localGoals.monthly_pnl_goal}
              onChange={(e) => setLocalGoals(prev => ({ 
                ...prev, 
                monthly_pnl_goal: parseFloat(e.target.value) || 0 
              }))}
              className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50"
              placeholder="5000"
            />
            <p className="text-xs text-gray-500">Your target profit for the month</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="trades-goal" className="text-gray-300">
              Monthly Trades Goal
            </Label>
            <Input
              id="trades-goal"
              type="number"
              value={localGoals.monthly_trades_goal}
              onChange={(e) => setLocalGoals(prev => ({ 
                ...prev, 
                monthly_trades_goal: parseInt(e.target.value) || 0 
              }))}
              className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50"
              placeholder="20"
            />
            <p className="text-xs text-gray-500">Number of trades you aim to execute</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="winrate-goal" className="text-gray-300">
              Win Rate Goal (%)
            </Label>
            <Input
              id="winrate-goal"
              type="number"
              min="0"
              max="100"
              value={localGoals.win_rate_goal}
              onChange={(e) => setLocalGoals(prev => ({ 
                ...prev, 
                win_rate_goal: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
              }))}
              className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50"
              placeholder="60"
            />
            <p className="text-xs text-gray-500">Target win percentage (0-100%)</p>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Goals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
GoalsSettingsDialog.displayName = "GoalsSettingsDialog";

// Trading Goals with Settings
const TradingGoals = memo(({ 
  stats, 
  trades,
  goals,
  onEditGoals
}: { 
  stats: DashboardStats; 
  trades: Trade[];
  goals: UserGoals;
  onEditGoals: () => void;
}) => {
  const goalsData = useMemo(() => [
    {
      label: "Monthly P&L",
      current: stats.monthlyPnL,
      target: goals.monthly_pnl_goal,
      color: "emerald" as const,
    },
    { 
      label: "Win Rate", 
      current: parseFloat(stats.winRate), 
      target: goals.win_rate_goal, 
      unit: "%", 
      color: "blue" as const 
    },
    {
      label: "Trades/Month",
      current: stats.monthlyTrades,
      target: goals.monthly_trades_goal,
      color: "purple" as const,
    },
  ], [stats, goals]);

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5" />
      <CardHeader className="relative z-10 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
            <span className="truncate">Trading Goals</span>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white p-1.5 sm:p-2"
            onClick={onEditGoals}
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-1 sm:pt-2 space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
        {goalsData.map((goal) => {
          const progress = goal.target > 0 ? Math.max(0, (goal.current / goal.target) * 100) : 0;
          const colorClasses = { 
            emerald: "bg-emerald-500", 
            blue: "bg-blue-500", 
            purple: "bg-purple-500" 
          };
          const isComplete = progress >= 100;
          
          return (
            <div key={goal.label} className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-400 truncate flex items-center gap-1">
                  {goal.label}
                  {isComplete && <Award className="w-3 h-3 text-yellow-400" />}
                </span>
                <span className={cn(
                  "font-medium text-[11px] sm:text-sm flex-shrink-0 ml-2",
                  goal.current >= 0 ? "text-white" : "text-red-400"
                )}>
                  {goal.unit 
                    ? `${goal.current.toFixed(1)}${goal.unit}` 
                    : formatCurrency(goal.current)
                  } / {goal.unit 
                    ? `${goal.target}${goal.unit}` 
                    : formatCurrency(goal.target)
                  }
                </span>
              </div>
              <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    colorClasses[goal.color]
                  )} 
                  style={{ width: `${Math.min(progress, 100)}%` }} 
                />
              </div>
              <p className="text-[10px] text-gray-500 text-right">
                {progress.toFixed(0)}% {isComplete ? "✓ Complete!" : "complete"}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
TradingGoals.displayName = "TradingGoals";

// Performance Metrics
const PerformanceMetrics = memo(({ stats }: { stats: DashboardStats }) => {
  const metrics = [
    { label: "Profit Factor", value: stats.profitFactor.toFixed(2), icon: TrendingUp, trend: stats.profitFactor >= 1 ? "up" : "down" },
    { label: "Avg Win", value: formatCurrency(stats.avgWin), icon: ArrowUpRight, trend: "up" },
    { label: "Avg Loss", value: formatCurrency(stats.avgLoss), icon: ArrowDownRight, trend: "down" },
    { label: "Expectancy", value: formatCurrency(stats.expectancy), icon: Target, trend: stats.expectancy >= 0 ? "up" : "down" },
    { label: "Best Trade", value: formatCurrency(stats.bestTrade), icon: Award, trend: "up" },
    { label: "Worst Trade", value: formatCurrency(stats.worstTrade), icon: AlertCircle, trend: "down" },
  ];

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5" />
      <CardHeader className="relative z-10 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
          <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          <span className="truncate">Performance Metrics</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 pt-1 sm:pt-2 px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="p-2 sm:p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all group">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                <metric.icon className={cn("w-3 h-3 sm:w-4 sm:h-4", metric.trend === "up" ? "text-emerald-400" : "text-red-400")} />
                <span className="text-[10px] sm:text-xs text-gray-500 truncate">{metric.label}</span>
              </div>
              <p className={cn("text-sm sm:text-lg font-bold truncate", metric.trend === "up" ? "text-emerald-400" : metric.trend === "down" ? "text-red-400" : "text-white")}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
PerformanceMetrics.displayName = "PerformanceMetrics";

// --- MAIN DASHBOARD ---
const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const stylesInjected = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userName, setUserName] = useState("Trader");
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [userGoals, setUserGoals] = useState<UserGoals>({
    monthly_pnl_goal: 5000,
    monthly_trades_goal: 20,
    win_rate_goal: 60
  });

  // Style Injection & User Fetch
  useEffect(() => {
    if (!stylesInjected.current) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "dashboard-animations";
      styleSheet.textContent = DASHBOARD_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }
    setIsLoaded(true);

    // Fetch User Profile and Goals
    const getUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || 
                     user.user_metadata?.first_name || 
                     user.email?.split('@')[0] || 
                     "Trader";
        setUserName(name);

        // Load goals from localStorage (or could be from Supabase)
        const savedGoals = localStorage.getItem(`trading_goals_${user.id}`);
        if (savedGoals) {
          try {
            setUserGoals(JSON.parse(savedGoals));
          } catch (e) {
            console.error("Failed to parse saved goals");
          }
        }
      }
    };
    getUserProfile();

    return () => {
      const existingStyle = document.getElementById("dashboard-animations");
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  // Save goals handler
  const handleSaveGoals = useCallback(async (newGoals: UserGoals) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem(`trading_goals_${user.id}`, JSON.stringify(newGoals));
      setUserGoals(newGoals);
      toast.success("Trading goals updated successfully!");
    }
  }, []);

  // Fetch Trades
  const { data: trades = [], refetch } = useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("closed_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Trade[];
    },
  });

  // Calculate Comprehensive Stats
  const stats = useMemo((): DashboardStats => {
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => (t.profit_loss_currency || 0) > 0);
    const wins = winningTrades.length;
    const losingTrades = trades.filter((t) => (t.profit_loss_currency || 0) < 0);
    const losses = losingTrades.length;
    const breakEvenTrades = trades.filter((t) => (t.profit_loss_currency || 0) === 0);
    const breakEven = breakEvenTrades.length;
    const decisiveTrades = wins + losses;
    const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
    const winRate = decisiveTrades > 0 ? (wins / decisiveTrades) * 100 : 0;
    const totalWinAmount = winningTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
    const avgWin = wins > 0 ? totalWinAmount / wins : 0;
    const totalLossAmount = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0));
    const avgLoss = losses > 0 ? totalLossAmount / losses : 0;
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 100 : 0;
    const expectancy = totalTrades > 0 ? totalPnL / totalTrades : 0;
    const allPnL = trades.map((t) => t.profit_loss_currency || 0);
    const bestTrade = allPnL.length > 0 ? Math.max(...allPnL) : 0;
    const worstTrade = allPnL.length > 0 ? Math.min(...allPnL) : 0;

    // Calculate monthly stats
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const thisMonthTrades = trades.filter(t => {
      const date = new Date(t.closed_at || t.opened_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const monthlyPnL = thisMonthTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
    const monthlyTrades = thisMonthTrades.length;

    // Calculate Streak
    let streak = 0;
    if (trades.length > 0) {
      const firstTradePnl = trades[0].profit_loss_currency || 0;
      const isWinStreak = firstTradePnl > 0;
      
      for (const trade of trades) {
        const pnl = trade.profit_loss_currency || 0;
        if ((isWinStreak && pnl > 0) || (!isWinStreak && pnl < 0)) {
          streak++;
        } else {
          break;
        }
      }
      if (!isWinStreak) streak = 0; 
    }

    return {
      totalTrades,
      wins,
      losses,
      breakEven,
      decisiveTrades,
      totalPnL,
      winRate: winRate.toFixed(1),
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
      avgWin,
      avgLoss,
      expectancy,
      bestTrade,
      worstTrade,
      streak,
      monthlyPnL,
      monthlyTrades,
    };
  }, [trades]);

  const animatedWinRate = useAnimatedCounter(parseFloat(stats.winRate), 1500, 1);
  const animatedPnL = useAnimatedCounter(stats.totalPnL, 1500, 2);
  const animatedTrades = useAnimatedCounter(stats.totalTrades, 1500);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    refetch();
    toast.success("Dashboard refreshed!");
  }, [refetch]);

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white relative overflow-x-hidden">
      <FloatingOrbs />
      <AnimatedGrid />
      
      {/* Goals Settings Dialog */}
      <GoalsSettingsDialog
        open={goalsDialogOpen}
        onOpenChange={setGoalsDialogOpen}
        goals={userGoals}
        onSave={handleSaveGoals}
      />
      
      <div className={cn("relative z-10 pt-4 sm:pt-6 pb-6 sm:pb-8 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full transition-all duration-700", isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 dash-float">
                <LineChart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Real-time trading analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hidden sm:flex"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden md:inline">Sync</span>
            </Button>
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 p-2 sm:p-2.5">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 p-2 sm:p-2.5">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Row: Welcome + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <div className="lg:col-span-2 dash-slide-up" style={{ animationDelay: "0ms" }}>
            <WelcomeCard userName={userName} stats={stats} />
          </div>
          <div className="dash-slide-up" style={{ animationDelay: "50ms" }}>
            <QuickActions onNavigate={handleNavigate} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Row 1: P&L and Win Rate */}
          <div className="col-span-1 sm:col-span-2 dash-slide-up" style={{ animationDelay: "100ms" }}>
            <StatCard
              title="Total P&L"
              value={formatCurrency(animatedPnL)}
              icon={DollarSign}
              trend={stats.totalPnL >= 0 ? "up" : "down"}
              trendValue={formatPercent((stats.totalPnL / (10000 || 1)) * 100)}
              subtitle="All time"
              color={stats.totalPnL >= 0 ? "emerald" : "red"}
              size="large"
            />
          </div>

          <div className="col-span-1 sm:col-span-2 dash-slide-up" style={{ animationDelay: "150ms" }}>
            <StatCard
              title="Win Rate"
              value={`${animatedWinRate}%`}
              icon={Target}
              trend={parseFloat(stats.winRate) >= 50 ? "up" : "down"}
              trendValue={`${stats.wins}W / ${stats.losses}L`}
              subtitle={stats.breakEven > 0 ? `Excl. ${stats.breakEven} BE` : "Wins / (Wins + Losses)"}
              color="blue"
              size="large"
            />
          </div>

          {/* Row 2: Smaller Stats Cards */}
          <div className="dash-slide-up" style={{ animationDelay: "200ms" }}>
            <StatCard title="Total Trades" value={animatedTrades} icon={Activity} trend="neutral" subtitle={stats.breakEven > 0 ? `${stats.breakEven} break-even` : "All time"} color="purple" />
          </div>
          <div className="dash-slide-up" style={{ animationDelay: "250ms" }}>
            <StatCard title="Profit Factor" value={stats.profitFactor.toFixed(2)} icon={TrendingUp} trend={stats.profitFactor >= 1.5 ? "up" : stats.profitFactor >= 1 ? "neutral" : "down"} subtitle="Gross profit ÷ loss" color={stats.profitFactor >= 1.5 ? "emerald" : "orange"} />
          </div>
          <div className="dash-slide-up" style={{ animationDelay: "300ms" }}>
            <StatCard title="Current Streak" value={stats.streak} icon={Flame} trend={stats.streak > 0 ? "up" : "neutral"} subtitle="Consecutive wins" color="orange" />
          </div>
          <div className="dash-slide-up" style={{ animationDelay: "350ms" }}>
            <StatCard title="Expectancy" value={formatCurrency(stats.expectancy)} icon={Zap} trend={stats.expectancy >= 0 ? "up" : "down"} subtitle="Avg P&L per trade" color={stats.expectancy >= 0 ? "emerald" : "red"} />
          </div>

          {/* Row 3: Performance Chart */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 dash-slide-up" style={{ animationDelay: "400ms" }}>
            <PerformanceChart trades={trades} />
          </div>

          {/* Row 4: Recent Trades */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 dash-slide-up" style={{ animationDelay: "450ms" }}>
            <RecentTrades trades={trades} />
          </div>

          {/* Row 5: Goals & Metrics */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-2 dash-slide-up" style={{ animationDelay: "500ms" }}>
            <TradingGoals 
              stats={stats} 
              trades={trades} 
              goals={userGoals}
              onEditGoals={() => setGoalsDialogOpen(true)}
            />
          </div>
          <div className="col-span-1 sm:col-span-1 lg:col-span-2 dash-slide-up" style={{ animationDelay: "550ms" }}>
            <PerformanceMetrics stats={stats} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
            <span>256-bit AES Encryption</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline">Last updated: {new Date().toLocaleTimeString()}</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;