import { useState, useEffect, useMemo, memo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  PieChart,
  Flame,
  ChevronRight,
  RefreshCw,
  Settings,
  Filter
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfWeek, endOfMonth, endOfQuarter, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";

// Analytics Styles (same as dashboard)
const ANALYTICS_STYLES = `
  .analytics-float { animation: analytics-float 6s ease-in-out infinite; }
  .analytics-float-delayed { animation: analytics-float 6s ease-in-out infinite; animation-delay: 2s; }
  .analytics-pulse { animation: analytics-pulse 3s ease-in-out infinite; }
  .analytics-slide-up { animation: analytics-slide-up 0.5s ease-out forwards; }
  .analytics-fade-in { animation: analytics-fade-in 0.6s ease-out forwards; }
  .analytics-count { animation: analytics-count 1.5s ease-out forwards; }
  
  @keyframes analytics-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes analytics-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
  @keyframes analytics-slide-up { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes analytics-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes analytics-count { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
  
  .analytics-glass {
    background: rgba(18, 19, 26, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .analytics-card-hover {
    transition: all 0.3s ease;
  }
  .analytics-card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border-color: rgba(16, 185, 129, 0.3);
  }
  
  @media (prefers-reduced-motion: reduce) {
    .analytics-float, .analytics-pulse { animation: none !important; }
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
  strategy_id?: string;
  strategies?: { name: string };
}

// Utility functions
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (absValue >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

// Background Components
const FloatingOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] analytics-float" />
    <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] analytics-float-delayed" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] analytics-pulse" />
  </div>
));
FloatingOrbs.displayName = "FloatingOrbs";

const AnimatedGrid = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-30">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:50px_50px]" />
  </div>
));
AnimatedGrid.displayName = "AnimatedGrid";

// Stat Card Component
const StatCard = memo(({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "emerald",
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Target;
  trend?: "up" | "down" | "neutral";
  color?: "emerald" | "blue" | "purple" | "orange" | "red" | "cyan";
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
    cyan: {
      bg: "from-cyan-500/20 to-cyan-600/10",
      text: "text-cyan-400",
      glow: "shadow-cyan-500/20",
    },
  };

  const colors = colorClasses[color];

  return (
    <Card
      className="analytics-glass analytics-card-hover relative overflow-hidden group h-full analytics-slide-up"
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
                "text-lg sm:text-xl lg:text-2xl font-bold tabular-nums analytics-count truncate",
                typeof value === "string" && value.startsWith("-")
                  ? "text-red-400"
                  : typeof value === "string" && value.startsWith("$-")
                  ? "text-red-400"
                  : "text-white"
              )}
            >
              {value}
            </p>
            {subtitle && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {trend && trend !== "neutral" && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold",
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
                <span className="text-[10px] sm:text-xs text-gray-500 truncate">
                  {subtitle}
                </span>
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
});
StatCard.displayName = "StatCard";

// Trader Level Component
const TraderLevel = memo(({ winRate, profitFactor, totalTrades, netPnL }: {
  winRate: number;
  profitFactor: string | number;
  totalTrades: number;
  netPnL: number;
}) => {
  const getLevel = () => {
    const pf = typeof profitFactor === 'string' ? parseFloat(profitFactor) || 0 : profitFactor;
    
    if (totalTrades < 10) return { level: "Beginner", color: "gray", progress: 10 };
    if (winRate >= 65 && pf >= 2 && netPnL > 0) return { level: "Elite", color: "emerald", progress: 100 };
    if (winRate >= 55 && pf >= 1.5 && netPnL > 0) return { level: "Advanced", color: "blue", progress: 75 };
    if (winRate >= 45 && pf >= 1) return { level: "Intermediate", color: "purple", progress: 50 };
    return { level: "Developing", color: "orange", progress: 25 };
  };

  const { level, color, progress } = getLevel();

  const colorClasses: Record<string, string> = {
    gray: "from-gray-500/20 to-gray-600/10 text-gray-400",
    emerald: "from-emerald-500/20 to-emerald-600/10 text-emerald-400",
    blue: "from-blue-500/20 to-blue-600/10 text-blue-400",
    purple: "from-purple-500/20 to-purple-600/10 text-purple-400",
    orange: "from-orange-500/20 to-orange-600/10 text-orange-400",
  };

  const progressColors: Record<string, string> = {
    gray: "bg-gray-500",
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
  };

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30", colorClasses[color])} />
      <CardContent className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-xl bg-gradient-to-br", colorClasses[color])}>
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Trader Level</p>
              <p className={cn("text-2xl font-bold", colorClasses[color].split(" ").pop())}>{level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Progress</p>
            <p className="text-2xl font-bold text-white">{progress}%</p>
          </div>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-1000", progressColors[color])}
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
});
TraderLevel.displayName = "TraderLevel";

// Equity Curve Chart Component
const EquityCurveChart = memo(({ trades }: { trades: Trade[] }) => {
  const chartData = useMemo(() => {
    if (trades.length === 0) return [];
    
    let cumulative = 0;
    return trades.map((trade, index) => {
      cumulative += trade.profit_loss_currency || 0;
      return {
        index,
        date: new Date(trade.opened_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: cumulative,
        pnl: trade.profit_loss_currency || 0,
        isProfit: (trade.profit_loss_currency || 0) >= 0,
      };
    });
  }, [trades]);

  if (chartData.length === 0) {
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
          <p className="text-gray-400">No trades to display</p>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...chartData.map((d) => d.value));
  const minValue = Math.min(...chartData.map((d) => d.value));
  const range = maxValue - minValue || 1;
  const isPositive = chartData[chartData.length - 1]?.value >= 0;

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5" />
      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-emerald-400" />
              Equity Curve
            </CardTitle>
            <CardDescription className="text-gray-500">
              Cumulative P&L over time
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Current</p>
            <p className={cn("text-xl font-bold", isPositive ? "text-emerald-400" : "text-red-400")}>
              {formatCurrency(chartData[chartData.length - 1]?.value || 0)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-4">
        <div className="relative h-64">
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
                <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={isPositive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
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
                fill="url(#equityGradient)"
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
                stroke={isPositive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
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
EquityCurveChart.displayName = "EquityCurveChart";

// Strategy Performance Component
const StrategyPerformance = memo(({ trades }: { trades: Trade[] }) => {
  const strategyStats = useMemo(() => {
    const stats: Record<string, { trades: number; wins: number; pnl: number }> = {};
    
    trades.forEach((trade) => {
      const strategyName = trade.strategies?.name || "No Strategy";
      if (!stats[strategyName]) {
        stats[strategyName] = { trades: 0, wins: 0, pnl: 0 };
      }
      stats[strategyName].trades++;
      if ((trade.profit_loss_currency || 0) > 0) stats[strategyName].wins++;
      stats[strategyName].pnl += trade.profit_loss_currency || 0;
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  if (strategyStats.length === 0) {
    return null;
  }

  return (
    <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-400" />
          Strategy Performance
        </CardTitle>
        <CardDescription className="text-gray-500">
          Performance breakdown by strategy
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 pt-4">
        <div className="space-y-3">
          {strategyStats.slice(0, 5).map((strategy, index) => (
            <div
              key={strategy.name}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                  strategy.pnl >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                )}>
                  #{index + 1}
                </div>
                <div>
                  <p className="font-semibold text-white">{strategy.name}</p>
                  <p className="text-xs text-gray-500">{strategy.trades} trades • {strategy.winRate.toFixed(1)}% win rate</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-bold tabular-nums",
                  strategy.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  {strategy.pnl >= 0 ? "+" : ""}{formatCurrency(strategy.pnl)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
StrategyPerformance.displayName = "StrategyPerformance";

// Performance Summary Component
const PerformanceSummary = memo(({ metrics, period }: { metrics: any; period: string }) => (
  <Card className="analytics-glass analytics-card-hover relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5" />
    <CardHeader className="relative z-10 pb-2">
      <CardTitle className="text-lg text-white flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-cyan-400" />
        Performance Summary - {period}
      </CardTitle>
    </CardHeader>
    <CardContent className="relative z-10 pt-4">
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="p-4 rounded-lg bg-white/5">
          <p className="text-sm text-gray-400 mb-1">Win Rate Score</p>
          <p className="text-3xl font-bold text-white">{metrics.winRate}%</p>
        </div>
        <div className="p-4 rounded-lg bg-white/5">
          <p className="text-sm text-gray-400 mb-1">Success Rate</p>
          <p className="text-3xl font-bold text-white">
            {metrics.totalTrades > 0 
              ? `${((metrics.profitableTrades / metrics.totalTrades) * 100).toFixed(1)}%`
              : "0%"}
          </p>
        </div>
      </div>
      <div className="pt-4 border-t border-white/10">
        <p className="text-sm text-gray-400 mb-3">Trade Distribution</p>
        <div className="flex gap-2">
          <div 
            className="bg-emerald-500/20 border border-emerald-500/30 h-12 rounded-lg flex items-center justify-center text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/30"
            style={{ flex: metrics.profitableTrades || 1 }}
          >
            Wins: {metrics.profitableTrades}
          </div>
          <div 
            className="bg-red-500/20 border border-red-500/30 h-12 rounded-lg flex items-center justify-center text-sm font-medium text-red-400 transition-all hover:bg-red-500/30"
            style={{ flex: metrics.nonProfitableTrades || 1 }}
          >
            Losses: {metrics.nonProfitableTrades}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
));
PerformanceSummary.displayName = "PerformanceSummary";

// Analytics Content Component
const AnalyticsContent = memo(({ metrics, trades, period }: { metrics: any; trades: Trade[]; period: string }) => {
  return (
    <div className="space-y-6">
      {/* Trader Level */}
      <div className="analytics-slide-up" style={{ animationDelay: "0ms" }}>
        <TraderLevel 
          winRate={parseFloat(metrics.winRate)}
          profitFactor={metrics.profitFactor}
          totalTrades={metrics.totalTrades}
          netPnL={metrics.netPnL}
        />
      </div>

      {/* Row 1: Primary Stats (6 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Trades"
          value={metrics.totalTrades}
          icon={BarChart3}
          trend="neutral"
          color="purple"
          delay={50}
        />
        <StatCard
          title="Profitable"
          value={metrics.profitableTrades}
          icon={TrendingUp}
          trend="up"
          color="emerald"
          delay={100}
        />
        <StatCard
          title="Non-Profitable"
          value={metrics.nonProfitableTrades}
          icon={TrendingDown}
          trend="down"
          color="red"
          delay={150}
        />
        <StatCard
          title="Win Rate"
          value={`${metrics.winRate}%`}
          icon={Target}
          trend={parseFloat(metrics.winRate) >= 50 ? "up" : "down"}
          color="blue"
          delay={200}
        />
        <StatCard
          title="Profit Factor"
          value={metrics.profitFactor}
          icon={Zap}
          trend={parseFloat(metrics.profitFactor) > 1 ? "up" : "down"}
          subtitle="Gross profit / loss"
          color={parseFloat(metrics.profitFactor) > 1 ? "emerald" : "orange"}
          delay={250}
        />
        <StatCard
          title="Net P&L"
          value={formatCurrency(metrics.netPnL)}
          icon={DollarSign}
          trend={metrics.netPnL > 0 ? "up" : metrics.netPnL < 0 ? "down" : "neutral"}
          subtitle={period}
          color={metrics.netPnL >= 0 ? "emerald" : "red"}
          delay={300}
        />
      </div>

      {/* Row 2: Secondary Stats (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Expected Value"
          value={formatCurrency(metrics.expectedValue)}
          icon={Calculator}
          trend={metrics.expectedValue > 0 ? "up" : metrics.expectedValue < 0 ? "down" : "neutral"}
          subtitle="Avg P&L per trade"
          color={metrics.expectedValue >= 0 ? "emerald" : "red"}
          delay={350}
        />
        <StatCard
          title="Average Win"
          value={formatCurrency(metrics.avgWin)}
          icon={ArrowUpRight}
          trend="up"
          subtitle="Avg profit per win"
          color="emerald"
          delay={400}
        />
        <StatCard
          title="Average Loss"
          value={formatCurrency(metrics.avgLoss)}
          icon={ArrowDownRight}
          trend="down"
          subtitle="Avg loss per loss"
          color="red"
          delay={450}
        />
        <StatCard
          title="Net Daily P&L"
          value={formatCurrency(metrics.netDailyPnL)}
          icon={Calendar}
          trend={metrics.netDailyPnL > 0 ? "up" : metrics.netDailyPnL < 0 ? "down" : "neutral"}
          subtitle="Avg P&L per day"
          color={metrics.netDailyPnL >= 0 ? "emerald" : "red"}
          delay={500}
        />
      </div>

      {/* Row 3: Trade Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Average Trade Time"
          value={
            metrics.avgTradeTime < 60 
              ? `${Math.round(metrics.avgTradeTime)}m` 
              : metrics.avgTradeTime < 1440
              ? `${(metrics.avgTradeTime / 60).toFixed(1)}h`
              : `${(metrics.avgTradeTime / 1440).toFixed(1)}d`
          }
          icon={Timer}
          trend="neutral"
          subtitle="Avg holding time"
          color="cyan"
          delay={550}
        />
        <StatCard
          title="Risk/Reward Ratio"
          value={metrics.avgLoss > 0 ? (metrics.avgWin / metrics.avgLoss).toFixed(2) : "∞"}
          icon={Activity}
          trend={metrics.avgLoss > 0 && metrics.avgWin / metrics.avgLoss >= 1 ? "up" : "down"}
          subtitle="Avg win / Avg loss"
          color={metrics.avgLoss > 0 && metrics.avgWin / metrics.avgLoss >= 1 ? "emerald" : "orange"}
          delay={600}
        />
      </div>

      {/* Equity Curve */}
      <div className="analytics-slide-up" style={{ animationDelay: "650ms" }}>
        <EquityCurveChart trades={trades} />
      </div>

      {/* Strategy Performance + Summary Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="analytics-slide-up" style={{ animationDelay: "700ms" }}>
          <StrategyPerformance trades={trades} />
        </div>
        <div className="analytics-slide-up" style={{ animationDelay: "750ms" }}>
          <PerformanceSummary metrics={metrics} period={period} />
        </div>
      </div>
    </div>
  );
});
AnalyticsContent.displayName = "AnalyticsContent";

// Main Analytics Component
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
      const existingStyle = document.getElementById("analytics-animations");
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  const { data: trades = [] } = useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select(`
          *,
          strategies (
            name
          )
        `)
        .order("opened_at", { ascending: true });
      
      if (error) throw error;
      return (data || []) as Trade[];
    },
  });

  const calculateMetrics = (filteredTrades: Trade[]) => {
    const totalTrades = filteredTrades.length;
    const profitableTrades = filteredTrades.filter(t => (t.profit_loss_currency || 0) > 0).length;
    const nonProfitableTrades = filteredTrades.filter(t => (t.profit_loss_currency || 0) <= 0).length;
    const winRate = totalTrades > 0 ? ((profitableTrades / totalTrades) * 100).toFixed(1) : "0.0";
    
    const totalProfit = filteredTrades
      .filter(t => (t.profit_loss_currency || 0) > 0)
      .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
    
    const totalLoss = Math.abs(filteredTrades
      .filter(t => (t.profit_loss_currency || 0) < 0)
      .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0));
    
    const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : totalProfit > 0 ? "∞" : "0.00";
    
    const netPnL = filteredTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);

    const avgWin = profitableTrades > 0 ? totalProfit / profitableTrades : 0;
    const avgLoss = nonProfitableTrades > 0 ? totalLoss / nonProfitableTrades : 0;
    
    const expectedValue = totalTrades > 0 ? netPnL / totalTrades : 0;
    
    const tradingDays = new Set(filteredTrades.map(t => new Date(t.opened_at).toDateString())).size;
    const netDailyPnL = tradingDays > 0 ? netPnL / tradingDays : 0;
    
    const closedTrades = filteredTrades.filter(t => t.closed_at);
    const avgTradeTime = closedTrades.length > 0 
      ? closedTrades.reduce((sum, t) => {
          const opened = new Date(t.opened_at).getTime();
          const closed = new Date(t.closed_at).getTime();
          return sum + (closed - opened) / (1000 * 60);
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
      avgTradeTime
    };
  };

  const filterTradesByPeriod = (period: string) => {
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

    return trades.filter(t => {
      const tradeDate = new Date(t.opened_at);
      return tradeDate >= start && tradeDate <= end;
    });
  };

  const allTimeMetrics = calculateMetrics(trades);

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white relative overflow-x-hidden">
      <FloatingOrbs />
      <AnimatedGrid />
      
      <div
        className={cn(
          "relative z-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto transition-all duration-700",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 analytics-float">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Analytics</h1>
              <p className="text-sm text-gray-500">Performance insights and statistics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/5 border border-white/10 p-1 rounded-xl">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30 rounded-lg transition-all"
            >
              All Time
            </TabsTrigger>
            <TabsTrigger 
              value="week"
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30 rounded-lg transition-all"
            >
              Weekly
            </TabsTrigger>
            <TabsTrigger 
              value="month"
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30 rounded-lg transition-all"
            >
              Monthly
            </TabsTrigger>
            <TabsTrigger 
              value="quarter"
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30 rounded-lg transition-all"
            >
              Quarterly
            </TabsTrigger>
            <TabsTrigger 
              value="year"
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30 rounded-lg transition-all"
            >
              Yearly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <AnalyticsContent metrics={allTimeMetrics} trades={trades} period="All Time" />
          </TabsContent>

          <TabsContent value="week" className="space-y-6">
            <AnalyticsContent 
              metrics={calculateMetrics(filterTradesByPeriod("week"))} 
              trades={filterTradesByPeriod("week")}
              period="This Week"
            />
          </TabsContent>

          <TabsContent value="month" className="space-y-6">
            <AnalyticsContent 
              metrics={calculateMetrics(filterTradesByPeriod("month"))} 
              trades={filterTradesByPeriod("month")}
              period="This Month"
            />
          </TabsContent>

          <TabsContent value="quarter" className="space-y-6">
            <AnalyticsContent 
              metrics={calculateMetrics(filterTradesByPeriod("quarter"))} 
              trades={filterTradesByPeriod("quarter")}
              period="This Quarter"
            />
          </TabsContent>

          <TabsContent value="year" className="space-y-6">
            <AnalyticsContent 
              metrics={calculateMetrics(filterTradesByPeriod("year"))} 
              trades={filterTradesByPeriod("year")}
              period="This Year"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;