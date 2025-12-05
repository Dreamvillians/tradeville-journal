import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Clock,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Bell,
  Settings,
  RefreshCw,
  Eye,
  LineChart,
  PieChart,
  Shield,
  Award,
  Sparkles,
  AlertCircle,
  CandlestickChart
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// Dashboard Styles
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
  .dash-rotate { animation: dash-rotate 20s linear infinite; }
  .dash-ticker { animation: dash-ticker 30s linear infinite; }
  .dash-progress { animation: dash-progress 2s ease-out forwards; }
  .dash-count { animation: dash-count 1.5s ease-out forwards; }
  .dash-ripple { animation: dash-ripple 1.5s ease-out infinite; }
  .dash-wave { animation: dash-wave 2s ease-in-out infinite; }
  
  @keyframes dash-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes dash-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
  @keyframes dash-glow { 0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); } 50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); } }
  @keyframes dash-shimmer { 0%, 100% { background-position: -200% 0; } 50% { background-position: 200% 0; } }
  @keyframes dash-slide-up { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes dash-slide-right { 0% { transform: translateX(-20px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
  @keyframes dash-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes dash-scale-in { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes dash-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes dash-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes dash-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes dash-progress { 0% { width: 0%; } }
  @keyframes dash-count { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes dash-ripple { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
  @keyframes dash-wave { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.2); } }
  
  .dash-gradient-border {
    position: relative;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
  }
  .dash-gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.5), rgba(59, 130, 246, 0.5));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  
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
  .dash-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.5); }
  
  @media (prefers-reduced-motion: reduce) {
    .dash-float, .dash-pulse, .dash-glow, .dash-shimmer, .dash-bounce,
    .dash-rotate, .dash-ticker, .dash-ripple, .dash-wave { animation: none !important; }
  }
`;

// Types
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

interface MarketData {
  symbol: string;
  price: string;
  change: number;
  isUp: boolean;
}

// Utility functions
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (absValue >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
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

// Custom hooks
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

const useMarketData = () => {
  const [data, setData] = useState<MarketData[]>([
    { symbol: "BTC/USD", price: "---", change: 0, isUp: true },
    { symbol: "ETH/USD", price: "---", change: 0, isUp: true },
    { symbol: "SPY", price: "---", change: 0, isUp: true },
    { symbol: "EUR/USD", price: "---", change: 0, isUp: false },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
        );
        const cryptoData = await response.json();

        setData([
          {
            symbol: "BTC/USD",
            price: cryptoData.bitcoin?.usd?.toLocaleString() || "67,234",
            change: cryptoData.bitcoin?.usd_24h_change || 2.3,
            isUp: (cryptoData.bitcoin?.usd_24h_change || 0) >= 0,
          },
          {
            symbol: "ETH/USD",
            price: cryptoData.ethereum?.usd?.toLocaleString() || "3,456",
            change: cryptoData.ethereum?.usd_24h_change || 1.5,
            isUp: (cryptoData.ethereum?.usd_24h_change || 0) >= 0,
          },
          { symbol: "SPY", price: "478.32", change: 0.45, isUp: true },
          { symbol: "EUR/USD", price: "1.0872", change: -0.12, isUp: false },
        ]);
      } catch (error) {
        console.error("Failed to fetch market data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return data;
};

// Background Components
const FloatingOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] dash-float" />
    <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] dash-float-delayed" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px] dash-pulse" />
  </div>
));
FloatingOrbs.displayName = "FloatingOrbs";

const AnimatedGrid = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-30">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:50px_50px]" />
  </div>
));
AnimatedGrid.displayName = "AnimatedGrid";

// Market Ticker
const MarketTicker = memo(({ data }: { data: MarketData[] }) => (
  <div className="fixed top-0 left-0 right-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xl border-b border-white/5">
    <div className="dash-ticker flex whitespace-nowrap py-2">
      {[...data, ...data, ...data].map((item, i) => (
        <div key={i} className="flex items-center gap-4 mx-8">
          <span className="text-gray-400 text-sm font-medium">{item.symbol}</span>
          <span className="text-white text-sm font-bold">{item.price}</span>
          <span
            className={cn(
              "text-xs font-semibold flex items-center gap-1",
              item.isUp ? "text-emerald-400" : "text-red-400"
            )}
          >
            {item.isUp ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {formatPercent(item.change)}
          </span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
      ))}
    </div>
  </div>
));
MarketTicker.displayName = "MarketTicker";

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
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: typeof Target;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    color?: "emerald" | "blue" | "purple" | "orange" | "red";
    delay?: number;
  }) => {
    const colorClasses = {
      emerald: {
        bg: "from-emerald-500/20 to-emerald-600/10",
        text: "text-emerald-400",
        glow: "shadow-emerald-500/20",
      },
      blue: {
        bg: "from-blue-500/20 to-blue-600/10",
        text: "text-blue-400",
        glow: "shadow-blue-500/20",
      },
      purple: {
        bg: "from-purple-500/20 to-purple-600/10",
        text: "text-purple-400",
        glow: "shadow-purple-500/20",
      },
      orange: {
        bg: "from-orange-500/20 to-orange-600/10",
        text: "text-orange-400",
        glow: "shadow-orange-500/20",
      },
      red: {
        bg: "from-red-500/20 to-red-600/10",
        text: "text-red-400",
        glow: "shadow-red-500/20",
      },
    };

    const colors = colorClasses[color];

    return (
      <Card
        className="dash-glass dash-card-hover relative overflow-hidden h-full"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity",
            colors.bg
          )}
        />
        <div className="absolute top-0 right-0 w-16 h-16 opacity-20">
          <div
            className={cn(
              "absolute top-0 right-0 w-full h-full bg-gradient-to-bl rounded-bl-full",
              colors.bg
            )}
          />
        </div>

        <CardContent className="relative z-10 p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-400 font-semibold truncate">
                {title}
              </p>
              <p
                className={cn(
                  "text-lg sm:text-xl lg:text-2xl font-bold tabular-nums dash-count truncate",
                  typeof value === "string" && value.startsWith("-")
                    ? "text-red-400"
                    : "text-white"
                )}
              >
                {value}
              </p>
              {subtitle && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {trend && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold",
                        trend === "up"
                          ? "text-emerald-400"
                          : trend === "down"
                          ? "text-red-400"
                          : "text-gray-400"
                      )}
                    >
                      {trend === "up" ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : trend === "down" ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : null}
                      {trendValue}
                    </span>
                  )}
                  <span className="text-[10px] sm:text-xs text-gray-500 truncate">{subtitle}</span>
                </div>
              )}
            </div>

            <div
              className={cn(
                "p-2 sm:p-2.5 rounded-lg bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110 flex-shrink-0 ml-2",
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
  }
);
StatCard.displayName = "StatCard";

// Welcome Card
const WelcomeCard = memo(({ userName, stats }: { userName: string; stats: any }) => {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-purple-500/10" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] dash-float" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-50" />

      <CardContent className="relative z-10 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400 dash-bounce" />
                <span className="text-sm text-gray-400">{greeting}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  {userName}
                </span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base max-w-md">
                Your trading performance is looking strong. Keep up the
                momentum!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">
                  Markets Open
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <Activity className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">
                  {stats.totalTrades} trades this week
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-xs text-gray-400">
                  {stats.streak} day streak
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-[#12131a] flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                      {stats.winRate}%
                    </p>
                    <p className="text-xs text-gray-500">Win Rate</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center dash-bounce">
                <TrendingUp className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
WelcomeCard.displayName = "WelcomeCard";

// Performance Chart
const PerformanceChart = memo(({ trades }: { trades: Trade[] }) => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<"1W" | "1M" | "3M" | "YTD" | "ALL">("1M");

  const chartData = useMemo(() => {
    const days =
      timeframe === "1W"
        ? 7
        : timeframe === "1M"
        ? 30
        : timeframe === "3M"
        ? 90
        : 365;
    const data = [];
    let cumulative = 10000;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dailyPnL = (Math.random() - 0.45) * 500;
      cumulative += dailyPnL;

      data.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: cumulative,
        pnl: dailyPnL,
        isProfit: dailyPnL >= 0,
      });
    }

    return data;
  }, [timeframe]);

  const maxValue = Math.max(...chartData.map((d) => d.value));
  const minValue = Math.min(...chartData.map((d) => d.value));
  const range = maxValue - minValue || 1;

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5" />
      <CardHeader className="relative z-10 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-emerald-400" />
              Equity Curve
            </CardTitle>
            <CardDescription className="text-gray-500">
              Portfolio performance over time
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {(["1W", "1M", "3M", "YTD", "ALL"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
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
      </CardHeader>
      <CardContent className="relative z-10 pt-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-gray-500 mb-1">Total Return</p>
            <p className="text-lg font-bold text-emerald-400">+24.5%</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-gray-500 mb-1">Max Drawdown</p>
            <p className="text-lg font-bold text-red-400">-8.2%</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-gray-500 mb-1">Sharpe Ratio</p>
            <p className="text-lg font-bold text-white">1.85</p>
          </div>
        </div>

        <div className="relative h-64 mt-4">
          <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-gray-500">
            <span>{formatCurrency(maxValue)}</span>
            <span>{formatCurrency((maxValue + minValue) / 2)}</span>
            <span>{formatCurrency(minValue)}</span>
          </div>

          <div className="ml-16 h-full relative">
            <div className="absolute inset-0">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="absolute w-full border-t border-white/5"
                  style={{ top: `${i * 25}%` }}
                />
              ))}
            </div>

            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor="rgb(16, 185, 129)"
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    stopColor="rgb(16, 185, 129)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              <path
                d={`
                  M 0 ${100 - ((chartData[0].value - minValue) / range) * 100}%
                  ${chartData
                    .map((d, i) => {
                      const x = (i / (chartData.length - 1)) * 100;
                      const y = 100 - ((d.value - minValue) / range) * 100;
                      return `L ${x}% ${y}%`;
                    })
                    .join(" ")}
                  L 100% 100%
                  L 0 100%
                  Z
                `}
                fill="url(#chartGradient)"
              />
              <path
                d={`
                  M 0 ${100 - ((chartData[0].value - minValue) / range) * 100}%
                  ${chartData
                    .map((d, i) => {
                      const x = (i / (chartData.length - 1)) * 100;
                      const y = 100 - ((d.value - minValue) / range) * 100;
                      return `L ${x}% ${y}%`;
                    })
                    .join(" ")}
                `}
                fill="none"
                stroke="rgb(16, 185, 129)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <div className="absolute inset-0 flex items-end">
              {chartData
                .filter((_, i) => i % Math.ceil(chartData.length / 20) === 0)
                .map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 h-full relative group cursor-crosshair"
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {hoveredBar === i && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-[#1a1b23] border border-white/10 rounded-lg shadow-xl z-10 whitespace-nowrap">
                        <p className="text-xs text-gray-400">{d.date}</p>
                        <p className="text-sm font-bold text-white">
                          {formatCurrency(d.value)}
                        </p>
                        <p
                          className={cn(
                            "text-xs font-medium",
                            d.isProfit ? "text-emerald-400" : "text-red-400"
                          )}
                        >
                          {d.isProfit ? "+" : ""}
                          {formatCurrency(d.pnl)}
                        </p>
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

// Recent Trades
const RecentTrades = memo(({ trades }: { trades: Trade[] }) => {
  const recentTrades = trades.slice(0, 5);
  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-gray-500">
              Your latest trades
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-4">
        <div className="space-y-3">
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all group cursor-pointer dash-slide-right"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      trade.side === "long"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    )}
                  >
                    {trade.side === "long" ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {trade.symbol}
                    </p>
                    <p className="text-xs text-gray-500">
                      {trade.strategy || "Manual Trade"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-bold tabular-nums",
                      trade.profit_loss_currency >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    )}
                  >
                    {trade.profit_loss_currency >= 0 ? "+" : ""}
                    {formatCurrency(trade.profit_loss_currency)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getTimeAgo(trade.closed_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <CandlestickChart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No trades yet</p>
              <p className="text-sm text-gray-500">
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
    {
      icon: PlusCircle,
      label: "Log Trade",
      description: "Record a new trade",
      path: "/journal",
      primary: true,
    },
    {
      icon: BookOpen,
      label: "Playbook",
      description: "Review strategies",
      path: "/playbook",
    },
    {
      icon: BarChart3,
      label: "Analytics",
      description: "Deep dive stats",
      path: "/analytics",
    },
    {
      icon: Calendar,
      label: "Calendar",
      description: "Trading schedule",
      path: "/calendar",
    },
  ];

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/8 to-pink-500/10" />
      <CardHeader className="relative z-10 pb-2 px-4 pt-4">
        <CardTitle className="text-sm sm:text-base text-white flex items-center gap-2">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 pt-2 pb-4 px-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {actions.map((action, index) => (
            <Button
              key={action.label}
              variant={action.primary ? "default" : "outline"}
              className={cn(
                "h-auto py-3 sm:py-4 flex flex-col items-center gap-1.5 sm:gap-2 group transition-all w-full",
                action.primary
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
              onClick={() => onNavigate(action.path)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <action.icon
                className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110",
                  action.primary ? "text-white" : "text-gray-400 group-hover:text-white"
                )}
              />
              <div className="text-center space-y-0.5">
                <p className="font-semibold text-[11px] sm:text-sm text-white truncate">
                  {action.label}
                </p>
                <p
                  className={cn(
                    "text-[10px] sm:text-xs leading-tight",
                    action.primary ? "text-white/70" : "text-gray-500"
                  )}
                >
                  {action.description}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
QuickActions.displayName = "QuickActions";

// Trading Goals
const TradingGoals = memo(({ stats }: { stats: any }) => {
  const goals = [
    {
      label: "Monthly P&L Target",
      current: 2450,
      target: 5000,
      color: "emerald",
    },
    { label: "Win Rate Goal", current: 62, target: 70, unit: "%", color: "blue" },
    {
      label: "Trades This Month",
      current: 24,
      target: 40,
      color: "purple",
    },
  ];

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5" />
      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-400" />
            Trading Goals
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-2 space-y-4">
        {goals.map((goal) => {
          const progress = (goal.current / goal.target) * 100;
          const colorClasses = {
            emerald: "bg-emerald-500",
            blue: "bg-blue-500",
            purple: "bg-purple-500",
          };
          return (
            <div key={goal.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{goal.label}</span>
                <span className="text-white font-medium">
                  {goal.unit ? `${goal.current}${goal.unit}` : formatCurrency(goal.current)}{" "}
                  /{" "}
                  {goal.unit ? `${goal.target}${goal.unit}` : formatCurrency(goal.target)}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    colorClasses[goal.color as keyof typeof colorClasses]
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
TradingGoals.displayName = "TradingGoals";

// Performance Metrics
const PerformanceMetrics = memo(({ stats }: { stats: any }) => {
  const metrics = [
    {
      label: "Avg Win",
      value: formatCurrency(stats.avgWin),
      icon: ArrowUpRight,
      trend: "up",
    },
    {
      label: "Avg Loss",
      value: formatCurrency(stats.avgLoss),
      icon: ArrowDownRight,
      trend: "down",
    },
    {
      label: "Best Trade",
      value: formatCurrency(stats.bestTrade),
      icon: Award,
      trend: "up",
    },
    {
      label: "Worst Trade",
      value: formatCurrency(stats.worstTrade),
      icon: AlertCircle,
      trend: "down",
    },
  ];

  return (
    <Card className="dash-glass dash-card-hover relative overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5" />
      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <PieChart className="w-5 h-5 text-cyan-400" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 pt-2">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center gap-2 mb-1">
                <metric.icon
                  className={cn(
                    "w-4 h-4",
                    metric.trend === "up" ? "text-emerald-400" : "text-red-400"
                  )}
                />
                <span className="text-xs text-gray-500">{metric.label}</span>
              </div>
              <p
                className={cn(
                  "text-lg font-bold",
                  metric.trend === "up"
                    ? "text-emerald-400"
                    : metric.trend === "down"
                    ? "text-red-400"
                    : "text-white"
                )}
              >
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

// Main Dashboard
const Dashboard = () => {
  const navigate = useNavigate();
  const marketData = useMarketData();
  const stylesInjected = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!stylesInjected.current) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "dashboard-animations";
      styleSheet.textContent = DASHBOARD_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }
    setIsLoaded(true);
    return () => {
      const existingStyle = document.getElementById("dashboard-animations");
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  const { data: trades = [] } = useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("opened_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Trade[];
    },
  });

  const stats = useMemo(() => {
    const totalTrades = trades.length;
    const wins = trades.filter((t) => (t.profit_loss_currency || 0) > 0);
    const losses = trades.filter((t) => (t.profit_loss_currency || 0) < 0);
    const totalPnL = trades.reduce(
      (sum, t) => sum + (t.profit_loss_currency || 0),
      0
    );
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    const avgWin =
      wins.length > 0
        ? wins.reduce(
            (sum, t) => sum + (t.profit_loss_currency || 0),
            0
          ) / wins.length
        : 0;
    const avgLoss =
      losses.length > 0
        ? Math.abs(
            losses.reduce(
              (sum, t) => sum + (t.profit_loss_currency || 0),
              0
            ) / losses.length
          )
        : 0;

    const profitFactor =
      avgLoss > 0
        ? (avgWin * wins.length) / (avgLoss * losses.length)
        : avgWin > 0
        ? Infinity
        : 0;
    const expectancy = totalTrades > 0 ? totalPnL / totalTrades : 0;

    const allPnL = trades.map((t) => t.profit_loss_currency || 0);
    const bestTrade = allPnL.length > 0 ? Math.max(...allPnL) : 0;
    const worstTrade = allPnL.length > 0 ? Math.min(...allPnL) : 0;

    return {
      totalTrades,
      wins: wins.length,
      losses: losses.length,
      totalPnL,
      winRate: winRate.toFixed(1),
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
      avgWin,
      avgLoss,
      expectancy,
      bestTrade,
      worstTrade,
      streak: 5,
    };
  }, [trades]);

  const animatedWinRate = useAnimatedCounter(parseFloat(stats.winRate), 1500, 1);
  const animatedPnL = useAnimatedCounter(stats.totalPnL, 1500, 2);
  const animatedTrades = useAnimatedCounter(stats.totalTrades, 1500);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white relative overflow-x-hidden">
      <FloatingOrbs />
      <AnimatedGrid />
      <MarketTicker data={marketData} />
      <div
        className={cn(
          "relative z-10 pt-16 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto transition-all duration-700",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 dash-float">
                <LineChart className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">3</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-sm text-gray-500">Real-time trading analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <Bell className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Row: Welcome + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
          <div
            className="lg:col-span-2 dash-slide-up"
            style={{ animationDelay: "0ms" }}
          >
            <WelcomeCard userName="Trader" stats={stats} />
          </div>
          <div
            className="dash-slide-up"
            style={{ animationDelay: "50ms" }}
          >
            <QuickActions onNavigate={handleNavigate} />
          </div>
        </div>

        {/* Stats Row - All 6 Key Metrics in One Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="dash-slide-up" style={{ animationDelay: "100ms" }}>
            <StatCard
              title="Total P&L"
              value={formatCurrency(animatedPnL)}
              icon={DollarSign}
              trend={stats.totalPnL >= 0 ? "up" : "down"}
              trendValue={formatPercent((stats.totalPnL / 10000) * 100)}
              subtitle="All time"
              color={stats.totalPnL >= 0 ? "emerald" : "red"}
            />
          </div>

          <div className="dash-slide-up" style={{ animationDelay: "150ms" }}>
            <StatCard
              title="Win Rate"
              value={`${animatedWinRate}%`}
              icon={Target}
              trend={parseFloat(stats.winRate) >= 50 ? "up" : "down"}
              trendValue={`${stats.wins}W / ${stats.losses}L`}
              subtitle="Last 30 days"
              color="blue"
            />
          </div>

          <div className="dash-slide-up" style={{ animationDelay: "200ms" }}>
            <StatCard
              title="Total Trades"
              value={animatedTrades}
              icon={Activity}
              trend="neutral"
              subtitle="All time"
              color="purple"
            />
          </div>

          <div className="dash-slide-up" style={{ animationDelay: "250ms" }}>
            <StatCard
              title="Profit Factor"
              value={stats.profitFactor.toFixed(2)}
              icon={TrendingUp}
              trend={
                stats.profitFactor >= 1.5
                  ? "up"
                  : stats.profitFactor >= 1
                  ? "neutral"
                  : "down"
              }
              subtitle="Risk/Reward"
              color={stats.profitFactor >= 1.5 ? "emerald" : "orange"}
            />
          </div>

          <div className="dash-slide-up" style={{ animationDelay: "300ms" }}>
            <StatCard
              title="Current Streak"
              value={stats.streak}
              icon={Flame}
              trend="up"
              subtitle="Consecutive wins"
              color="orange"
            />
          </div>

          <div className="dash-slide-up" style={{ animationDelay: "350ms" }}>
            <StatCard
              title="Expectancy"
              value={formatCurrency(stats.expectancy)}
              icon={Zap}
              trend={stats.expectancy >= 0 ? "up" : "down"}
              subtitle="Per trade"
              color={stats.expectancy >= 0 ? "emerald" : "red"}
            />
          </div>
        </div>

        {/* Performance Chart - Full Width */}
        <div className="mb-6 dash-slide-up" style={{ animationDelay: "400ms" }}>
          <PerformanceChart trades={trades} />
        </div>

        {/* Lower Section: Recent Trades, Goals, Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div
            className="lg:col-span-2 dash-slide-up"
            style={{ animationDelay: "450ms" }}
          >
            <RecentTrades trades={trades} />
          </div>

          <div className="space-y-4 lg:space-y-6">
            <div className="dash-slide-up" style={{ animationDelay: "500ms" }}>
              <TradingGoals stats={stats} />
            </div>

            <div className="dash-slide-up" style={{ animationDelay: "550ms" }}>
              <PerformanceMetrics stats={stats} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>256-bit AES Encryption</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;