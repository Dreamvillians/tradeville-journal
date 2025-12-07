import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; // Assuming you have this, or standard input will be used
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
  Check,
  X
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// --- STYLES ---
const DASHBOARD_STYLES = `
  .dash-float { animation: dash-float 6s ease-in-out infinite; }
  .dash-float-delayed { animation: dash-float 6s ease-in-out infinite; animation-delay: 2s; }
  .dash-pulse { animation: dash-pulse 3s ease-in-out infinite; }
  .dash-slide-up { animation: dash-slide-up 0.5s ease-out forwards; }
  .dash-slide-right { animation: dash-slide-right 0.5s ease-out forwards; }
  .dash-bounce { animation: dash-bounce 1s ease-in-out infinite; }
  
  @keyframes dash-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes dash-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
  @keyframes dash-slide-up { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes dash-slide-right { 0% { transform: translateX(-20px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
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
  
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  
  @media (prefers-reduced-motion: reduce) {
    .dash-float, .dash-pulse, .dash-bounce { animation: none !important; }
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
  totalWinAmount: number; // Added for PF Chart
  totalLossAmount: number; // Added for PF Chart
  expectancy: number;
  bestTrade: number;
  worstTrade: number;
  streak: number;
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
const useAnimatedCounter = (end: number, duration: number = 1500, decimals: number = 0) => {
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

// Stat Card
const StatCard = memo(({ title, value, subtitle, icon: Icon, trend, trendValue, color = "emerald", delay = 0, size = "default" }: any) => {
  const colorClasses: any = {
    emerald: { bg: "from-emerald-500/20 to-emerald-600/10", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
    blue: { bg: "from-blue-500/20 to-blue-600/10", text: "text-blue-400", glow: "shadow-blue-500/20" },
    purple: { bg: "from-purple-500/20 to-purple-600/10", text: "text-purple-400", glow: "shadow-purple-500/20" },
    orange: { bg: "from-orange-500/20 to-orange-600/10", text: "text-orange-400", glow: "shadow-orange-500/20" },
    red: { bg: "from-red-500/20 to-red-600/10", text: "text-red-400", glow: "shadow-red-500/20" },
  };
  const colors = colorClasses[color];

  return (
    <Card className={cn("dash-glass dash-card-hover relative overflow-hidden group h-full", size === "large" && "p-1 sm:p-2")} style={{ animationDelay: `${delay}ms` }}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity", colors.bg)} />
      <CardContent className={cn("relative z-10", size === "large" ? "p-4 sm:p-6" : "p-3 sm:p-4")}>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-400 font-semibold truncate">{title}</p>
            <p className={cn("font-bold tabular-nums dash-count truncate", size === "large" ? "text-xl sm:text-3xl" : "text-lg sm:text-2xl", typeof value === "string" && value.startsWith("-") ? "text-red-400" : "text-white")}>{value}</p>
            {subtitle && (
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                {trend && (
                  <span className={cn("flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-semibold", trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-gray-400")}>
                    {trend === "up" ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
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
});
StatCard.displayName = "StatCard";

// Welcome Card
const WelcomeCard = memo(({ userName, stats }: { userName: string; stats: DashboardStats }) => {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const performanceMessage = useMemo(() => {
    if (stats.totalTrades === 0) return "Start logging trades to unlock performance insights.";
    const winRate = parseFloat(stats.winRate);
    const pnl = stats.totalPnL;
    if (pnl > 0 && winRate >= 50) return "Your trading performance is looking strong. Keep up the momentum!";
    if (pnl > 0 && winRate < 50) return "You are profitable, but your win rate is low. Watch your risk management.";
    if (pnl < 0 && winRate >= 50) return "High win rate but negative P&L. Check your risk/reward ratio.";
    if (pnl < 0) return "Markets are tough right now. Focus on capital preservation.";
    return "Consistency is key. Stick to your trading plan.";
  }, [stats]);

  // Profit Factor Calculation for Chart
  const totalVolume = stats.totalWinAmount + stats.totalLossAmount;
  const winPercent = totalVolume > 0 ? (stats.totalWinAmount / totalVolume) * 100 : 0;
  const lossPercent = totalVolume > 0 ? (stats.totalLossAmount / totalVolume) * 100 : 0;

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-purple-500/10" />
      <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-emerald-500/10 rounded-full blur-[60px] sm:blur-[80px] dash-float" />
      <CardContent className="relative z-10 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            </div>

            {/* Win Rate & Profit Factor Visualization */}
            <div className="hidden sm:flex flex-col items-end gap-3 flex-shrink-0">
              <div className="flex items-center gap-4">
                 {/* Win Rate Circle */}
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#12131a] flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xl sm:text-2xl font-bold text-emerald-400">
                          {stats.winRate}%
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500">Win Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit Factor Chart (New Feature) */}
              <div className="w-32 sm:w-40">
                 <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Wins: {formatCurrency(stats.totalWinAmount)}</span>
                    <span>Loss: {formatCurrency(stats.totalLossAmount)}</span>
                 </div>
                 <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
                    <div 
                      style={{ width: `${winPercent}%` }} 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                    />
                    <div 
                      style={{ width: `${lossPercent}%` }} 
                      className="h-full bg-red-500 transition-all duration-1000" 
                    />
                 </div>
                 <div className="text-center mt-1">
                     <span className="text-[10px] font-bold text-gray-300">PF: {stats.profitFactor.toFixed(2)}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
WelcomeCard.displayName = "WelcomeCard";

// Performance Chart - FIXED SVG LOGIC
const PerformanceChart = memo(({ trades }: { trades: Trade[] }) => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<"1W" | "1M" | "3M" | "YTD" | "ALL">("1M");

  const chartData = useMemo(() => {
    if (trades.length === 0) return [];

    const now = new Date();
    let startDate = new Date();
    if (timeframe === "1W") startDate.setDate(now.getDate() - 7);
    else if (timeframe === "1M") startDate.setMonth(now.getMonth() - 1);
    else if (timeframe === "3M") startDate.setMonth(now.getMonth() - 3);
    else if (timeframe === "YTD") startDate = new Date(now.getFullYear(), 0, 1);
    else startDate = new Date(0);

    const filteredTrades = trades
      .filter(t => new Date(t.closed_at || t.opened_at) >= startDate)
      .sort((a, b) => new Date(a.closed_at || a.opened_at).getTime() - new Date(b.closed_at || b.opened_at).getTime());

    const dailyMap = new Map<string, { pnl: number, date: string }>();
    filteredTrades.forEach(t => {
      const dateStr = new Date(t.closed_at || t.opened_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!dailyMap.has(dateStr)) dailyMap.set(dateStr, { pnl: 0, date: dateStr });
      dailyMap.get(dateStr)!.pnl += (t.profit_loss_currency || 0);
    });

    let cumulative = 0; 
    const data = Array.from(dailyMap.values()).map(day => {
      cumulative += day.pnl;
      return { date: day.date, value: cumulative, pnl: day.pnl, isProfit: day.pnl >= 0 };
    });

    if (data.length < 2) data.unshift({ date: "Start", value: 0, pnl: 0, isProfit: true });
    return data;
  }, [trades, timeframe]);

  const maxValue = Math.max(...chartData.map(d => d.value), 100);
  const minValue = Math.min(...chartData.map(d => d.value), -100);
  const range = maxValue - minValue || 1;

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5" />
      <CardHeader className="relative z-10 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
            <LineChart className="w-4 h-4 text-emerald-400" />
            Equity Curve
          </CardTitle>
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto hide-scrollbar">
            {["1W", "1M", "3M", "YTD", "ALL"].map((tf: any) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all flex-shrink-0",
                  timeframe === tf ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-gray-500 hover:text-white hover:bg-white/5"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-2 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="relative h-48 sm:h-64 mt-2">
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-[10px] text-gray-500">
            <span>{formatCurrency(maxValue)}</span>
            <span>{formatCurrency(minValue)}</span>
          </div>
          <div className="ml-12 h-full relative">
             {/* Chart SVG - Fixed Logic: No % in path, use viewBox */}
            {chartData.length > 1 && (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Filled Area */}
                <path
                  d={`
                    M 0 ${100 - ((chartData[0].value - minValue) / range) * 100}
                    ${chartData.map((d, i) => {
                      const x = (i / (chartData.length - 1)) * 100;
                      const y = 100 - ((d.value - minValue) / range) * 100;
                      return `L ${x} ${y}`;
                    }).join(" ")}
                    L 100 100 L 0 100 Z
                  `}
                  fill="url(#chartGradient)"
                />
                {/* Stroke Line */}
                <path
                  d={`
                    M 0 ${100 - ((chartData[0].value - minValue) / range) * 100}
                    ${chartData.map((d, i) => {
                      const x = (i / (chartData.length - 1)) * 100;
                      const y = 100 - ((d.value - minValue) / range) * 100;
                      return `L ${x} ${y}`;
                    }).join(" ")}
                  `}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
            
            {/* Invisible Hover Bars */}
            <div className="absolute inset-0 flex items-end">
                {chartData.map((d, i) => (
                    <div key={i} className="flex-1 h-full relative group" onMouseEnter={() => setHoveredBar(i)} onMouseLeave={() => setHoveredBar(null)}>
                        {hoveredBar === i && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-black/90 border border-white/10 rounded-md z-10 whitespace-nowrap pointer-events-none">
                                <p className="text-xs text-white font-bold">{formatCurrency(d.value)}</p>
                                <p className="text-[10px] text-gray-400">{d.date}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
PerformanceChart.displayName = "PerformanceChart";

// Trading Goals - ADDED SETTINGS MODE
const TradingGoals = memo(({ stats, trades }: { stats: DashboardStats, trades: Trade[] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [targets, setTargets] = useState({ pnl: 5000, trades: 20 });
  const [tempTargets, setTempTargets] = useState(targets);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const thisMonthTrades = trades.filter(t => {
      const date = new Date(t.closed_at || t.opened_at);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const pnl = thisMonthTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
    return { pnl, count: thisMonthTrades.length };
  }, [trades]);

  const handleSave = () => {
    setTargets(tempTargets);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempTargets(targets);
    setIsEditing(false);
  };

  const goals = [
    {
      label: "Monthly P&L",
      current: monthlyStats.pnl,
      target: targets.pnl,
      color: "emerald",
      isEditable: true,
      key: "pnl"
    },
    { label: "Win Rate", current: parseFloat(stats.winRate), target: 60, unit: "%", color: "blue", isEditable: false },
    {
      label: "Trades/Month",
      current: monthlyStats.count,
      target: targets.trades,
      color: "purple",
      isEditable: true,
      key: "trades"
    },
  ];

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5" />
      <CardHeader className="relative z-10 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            <span className="truncate">Trading Goals</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleSave} className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"><Check className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 w-7 p-0 text-red-400 hover:text-red-300"><X className="w-4 h-4" /></Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-white p-1.5 sm:p-2">
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-1 sm:pt-2 space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
        {goals.map((goal: any) => {
          const progress = Math.max(0, (goal.current / goal.target) * 100);
          const colorClasses: any = { emerald: "bg-emerald-500", blue: "bg-blue-500", purple: "bg-purple-500" };
          
          return (
            <div key={goal.label} className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm h-6">
                <span className="text-gray-400 truncate">{goal.label}</span>
                {isEditing && goal.isEditable ? (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-[10px]">Target:</span>
                    <input 
                      type="number" 
                      className="w-16 bg-white/10 border border-white/10 rounded px-1 text-right text-white text-xs focus:outline-none focus:border-emerald-500"
                      value={tempTargets[goal.key as keyof typeof tempTargets]}
                      onChange={(e) => setTempTargets(prev => ({...prev, [goal.key]: Number(e.target.value)}))}
                    />
                  </div>
                ) : (
                  <span className="text-white font-medium text-[11px] sm:text-sm flex-shrink-0 ml-2">
                    {goal.unit ? `${goal.current}${goal.unit}` : formatCurrency(goal.current)} / {goal.unit ? `${goal.target}${goal.unit}` : formatCurrency(goal.target)}
                  </span>
                )}
              </div>
              <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-1000 ease-out", colorClasses[goal.color])} style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
TradingGoals.displayName = "TradingGoals";

// Main Dashboard
const Dashboard = () => {
  const navigate = useNavigate();
  const stylesInjected = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userName, setUserName] = useState("Trader");

  useEffect(() => {
    if (!stylesInjected.current) {
      const styleSheet = document.createElement("style");
      styleSheet.textContent = DASHBOARD_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }
    setIsLoaded(true);

    const getUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.user_metadata?.first_name || user.email?.split('@')[0] || "Trader";
        setUserName(name);
      }
    };
    getUserProfile();
  }, []);

  const { data: trades = [] } = useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trades").select("*").order("opened_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Trade[];
    },
  });

  const stats = useMemo((): DashboardStats => {
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => (t.profit_loss_currency || 0) > 0);
    const losingTrades = trades.filter((t) => (t.profit_loss_currency || 0) < 0);
    const wins = winningTrades.length;
    const losses = losingTrades.length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
    const totalWinAmount = winningTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
    const totalLossAmount = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0));
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 100 : 0;
    
    let streak = 0;
    if (trades.length > 0) {
      const isWinStreak = (trades[0].profit_loss_currency || 0) > 0;
      for (const trade of trades) {
        const pnl = trade.profit_loss_currency || 0;
        if ((isWinStreak && pnl > 0) || (!isWinStreak && pnl < 0)) streak++;
        else break;
      }
      if (!isWinStreak) streak = 0; 
    }

    return {
      totalTrades,
      wins,
      losses,
      breakEven: trades.filter(t => t.profit_loss_currency === 0).length,
      decisiveTrades: wins + losses,
      totalPnL,
      winRate: (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : "0.0",
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
      avgWin: wins > 0 ? totalWinAmount / wins : 0,
      avgLoss: losses > 0 ? totalLossAmount / losses : 0,
      totalWinAmount,
      totalLossAmount,
      expectancy: totalTrades > 0 ? totalPnL / totalTrades : 0,
      bestTrade: Math.max(...trades.map(t => t.profit_loss_currency || 0), 0),
      worstTrade: Math.min(...trades.map(t => t.profit_loss_currency || 0), 0),
      streak,
    };
  }, [trades]);

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white relative overflow-x-hidden">
      <FloatingOrbs />
      <AnimatedGrid />
      <div className={cn("relative z-10 pt-4 sm:pt-6 pb-6 sm:pb-8 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full transition-all duration-700", isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg">
                <LineChart className="w-5 h-5 text-white" />
             </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">Dashboard</h1>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <div className="lg:col-span-2 dash-slide-up">
            <WelcomeCard userName={userName} stats={stats} />
          </div>
          <div className="dash-slide-up">
            <TradingGoals stats={stats} trades={trades} />
          </div>
        </div>

        {/* Charts & Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="col-span-1 sm:col-span-2 lg:col-span-4 h-80 dash-slide-up">
                <PerformanceChart trades={trades} />
             </div>
             {/* Add other stat cards here as needed based on previous code */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;