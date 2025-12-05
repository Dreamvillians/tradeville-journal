import { useState, useEffect, useMemo, memo, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "date-fns";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────
// Analytics Styles – Glassmorphism + Subtle Animations
// ────────────────────────────────────────────────────────────────
const ANALYTICS_STYLES = `
  .analytics-float { animation: analytics-float 8s ease-in-out infinite; }
  .analytics-float-delayed { animation: analytics-float 8s ease-in-out infinite 3s; }
  .analytics-pulse { animation: analytics-pulse 4s ease-in-out infinite; }
  .analytics-slide-up { animation: analytics-slide-up 0.8s ease-out forwards; opacity: 0; animation-fill-mode: both; }
  
  @keyframes analytics-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
  @keyframes analytics-pulse { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.08)} }
  @keyframes analytics-slide-up { 0%{transform:translateY(40px);opacity:0} 100%{transform:translateY(0);opacity:1} }

  .analytics-glass {
    background: rgba(18, 19, 26, 0.82);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.4s ease;
  }
  .analytics-glass:hover {
    border-color: rgba(16, 185, 129, 0.35);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
    transform: translateY(-6px);
  }
`;

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
interface Trade {
  id: string;
  profit_loss_currency: number;
  opened_at: string;
  closed_at: string | null;
  strategies?: { name: string } | null;
}

interface Metrics {
  totalTrades: number;
  profitableTrades: number;
  nonProfitableTrades: number;
  winRate: string;
  profitFactor: string;
  netPnL: number;
  avgWin: number;
  avgLoss: number;
  expectedValue: number;
  netDailyPnL: number;
  avgTradeTime: number;
}

// ────────────────────────────────────────────────────────────────
// Background Orbs
// ────────────────────────────────────────────────────────────────
const FloatingOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-20 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] analytics-float" />
    <div className="absolute bottom-20 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] analytics-float-delayed" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-purple-500/5 rounded-full blur-[200px] analytics-pulse" />
  </div>
));
FloatingOrbs.displayName = "FloatingOrbs";

// ────────────────────────────────────────────────────────────────
// Stat Card – Clean & Elegant
// ────────────────────────────────────────────────────────────────
const StatCard = memo(
  ({
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
    icon: any;
    trend?: "up" | "down" | "neutral";
    color?: "emerald" | "blue" | "purple" | "orange" | "red" | "cyan";
    delay?: number;
  }) => {
    const palette = {
      emerald: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 shadow-emerald-500/20",
      blue: "from-blue-500/20 to-blue-600/10 text-blue-400 shadow-blue-500/20",
      purple: "from-purple-500/20 to-purple-600/10 text-purple-400 shadow-purple-500/20",
      orange: "from-orange-500/20 to-orange-600/10 text-orange-400 shadow-orange-500/20",
      red: "from-red-500/20 to-red-600/10 text-red-400 shadow-red-500/20",
      cyan: "from-cyan-500/20 to-cyan-600/10 text-cyan-400 shadow-cyan-500/20",
    }[color];

    return (
      <Card
        className={cn("analytics-glass analytics-slide-up relative overflow-hidden group")}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity", palette.split(" ")[0])} />
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-gray-400 tracking-wider">{title}</p>
            {trend && trend !== "neutral" && (
              <div className={cn("p-2 rounded-lg", palette.split(" ")[0] + " " + palette.split(" ")[2])}>
                {trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            )}
          </div>

          <p className={cn("text-3xl font-bold tracking-tight", value.toString().startsWith("-") ? "text-red-400" : "text-white")}>
            {value}
          </p>

          {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
        </CardContent>

        <div className={cn("absolute top-5 right-5 p-3.5 rounded-xl opacity-15 group-hover:opacity-30 transition-opacity", palette)}>
          <Icon className="w-7 h-7" />
        </div>
      </Card>
    );
  }
);
StatCard.displayName = "StatCard";

// ────────────────────────────────────────────────────────────────
// Trader Level Card
// ────────────────────────────────────────────────────────────────
const TraderLevel = memo(({ winRate, profitFactor, totalTrades, netPnL }: any) => {
  const levelData = totalTrades < 15
    ? { level: "Beginner", color: "gray", progress: 15 }
    : winRate >= 65 && profitFactor >= 2
    ? { level: "Elite", color: "emerald", progress: 100 }
    : winRate >= 58 && profitFactor >= 1.7
    ? { level: "Advanced", color: "blue", progress: 82 }
    : winRate >= 50 && profitFactor >= 1.3
    ? { level: "Intermediate", color: "purple", progress: 60 }
    : { level: "Developing", color: "orange", progress: 35 };

  const { level, color, progress } = levelData;

  const bg = {
    emerald: "from-emerald-500/20 to-emerald-600/10",
    blue: "from-blue-500/20 to-blue-600/10",
    purple: "from-purple-500/20 to-purple-600/10",
    orange: "from-orange-500/20 to-orange-600/10",
    gray: "from-gray-500/20 to-gray-600/10",
  }[color];

  const textColor = color === "emerald" ? "text-emerald-400" : color === "blue" ? "text-blue-400" : color === "purple" ? "text-purple-400" : color === "orange" ? "text-orange-400" : "text-gray-400";

  return (
    <Card className="analytics-glass analytics-slide-up relative overflow-hidden">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40", bg)} />
      <CardContent className="p-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-400 mb-2">Trader Level</p>
            <h3 className={cn("text-4xl font-bold", textColor)}>{level}</h3>
          </div>
          <Award className={cn("w-20 h-20 opacity-20", textColor)} />
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-1500", color === "emerald" ? "bg-emerald-500" : color === "blue" ? "bg-blue-500" : color === "purple" ? "bg-purple-500" : color === "orange" ? "bg-orange-500" : "bg-gray-500")}
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
});
TraderLevel.displayName = "TraderLevel";

// ────────────────────────────────────────────────────────────────
// Equity Curve Chart
// ────────────────────────────────────────────────────────────────
const EquityCurveChart = memo(({ trades }: { trades: Trade[] }) => {
  const data = useMemo(() => {
    if (!trades.length) return [];
    let cum = 0;
    return trades.map(t => {
      cum += t.profit_loss_currency;
      return { value: cum, pnl: t.profit_loss_currency };
    });
  }, [trades]);

  if (!data.length) {
    return (
      <Card className="analytics-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LineChart className="w-5 h-5 text-emerald-400" />
            Equity Curve
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-gray-500">
          No trades yet
        </CardContent>
      </Card>
    );
  }

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const final = data[data.length - 1].value;

  return (
    <Card className="analytics-glass analytics-slide-up">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LineChart className="w-5 h-5 text-emerald-400" />
            Equity Curve
          </CardTitle>
          <p className={cn("text-2xl font-bold", final >= 0 ? "text-emerald-400" : "text-red-400")}>
            ${final.toFixed(0)}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 relative">
          <svg className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="eqGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(16,185,129)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M 0 100 ${data.map((d, i) => {
                const x = (i / (data.length - 1)) * 100;
                const y = 100 - ((d.value - min) / range) * 100;
                return `L ${x} ${y}`;
              }).join(" ")} L 100 100 Z`}
              fill="url(#eqGrad)"
            />
            <path
              d={`M 0 100 ${data.map((d, i) => {
                const x = (i / (data.length - 1)) * 100;
                const y = 100 - ((d.value - min) / range) * 100;
                return `L ${x} ${y}`;
              }).join(" ")}`}
              fill="none"
              stroke="rgb(16,185,129)"
              strokeWidth="2.5"
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
});
EquityCurveChart.displayName = "EquityCurveChart";

// ────────────────────────────────────────────────────────────────
// Strategy Performance
// ────────────────────────────────────────────────────────────────
const StrategyPerformance = memo(({ trades }: { trades: Trade[] }) => {
  const stats = useMemo(() => {
    const map = new Map<string, { trades: number; wins: number; pnl: number }>();
    trades.forEach(t => {
      const name = t.strategies?.name || "Manual";
      const cur = map.get(name) || { trades: 0, wins: 0, pnl: 0 };
      cur.trades++;
      if (t.profit_loss_currency > 0) cur.wins++;
      cur.pnl += t.profit_loss_currency;
      map.set(name, cur);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d, winRate: (d.wins / d.trades) * 100 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 6);
  }, [trades]);

  if (!stats.length) return null;

  return (
    <Card className="analytics-glass analytics-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChart className="w-5 h-5 text-purple-400" />
          Strategy Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((s, i) => (
          <div key={s.name} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-lg flex-center font-bold text-sm", s.pnl >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                #{i + 1}
              </div>
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-500">{s.trades} trades · {s.winRate.toFixed(0)}% WR</p>
              </div>
            </div>
            <p className={cn("font-bold", s.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
              {s.pnl >= 0 ? "+" : ""}${Math.abs(s.pnl).toFixed(0)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
});
StrategyPerformance.displayName = "StrategyPerformance";

// ────────────────────────────────────────────────────────────────
// Main Analytics Component
// ────────────────────────────────────────────────────────────────
const Analytics = () => {
  const stylesInjected = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!stylesInjected.current) {
      const style = document.createElement("style");
      style.textContent = ANALYTICS_STYLES;
      document.head.appendChild(style);
      stylesInjected.current = true;
    }
    setLoaded(true);
  }, []);

  const { data: trades = [] } = useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*, strategies(name)")
        .order("opened_at", { ascending: true });
      if (error) throw error;
      return data as Trade[];
    },
  });

  const calculateMetrics = useMemo(() => {
    return (list: Trade[]): Metrics => {
      const total = list.length;
      const wins = list.filter(t => t.profit_loss_currency > 0);
      const losses = list.filter(t => t.profit_loss_currency <= 0);
      const profit = wins.reduce((s, t) => s + t.profit_loss_currency, 0);
      const loss = Math.abs(losses.reduce((s, t) => s + t.profit_loss_currency, 0));
      const net = list.reduce((s, t) => s + t.profit_loss_currency, 0);
      const days = new Set(list.map(t => new Date(t.opened_at).toDateString())).size;
      const closed = list.filter(t => t.closed_at);
      const avgTime = closed.length
        ? closed.reduce((s, t) => s + (new Date(t.closed_at!).getTime() - new Date(t.opened_at).getTime()) / 60000, 0) / closed.length
        : 0;

      return {
        totalTrades: total,
        profitableTrades: wins.length,
        nonProfitableTrades: losses.length,
        winRate: total ? ((wins.length / total) * 100).toFixed(1) : "0.0",
        profitFactor: loss > 0 ? (profit / loss).toFixed(2) : profit > 0 ? "∞" : "0.00",
        netPnL: net,
        avgWin: wins.length ? profit / wins.length : 0,
        avgLoss: losses.length ? loss / losses.length : 0,
        expectedValue: total ? net / total : 0,
        netDailyPnL: days ? net / days : 0,
        avgTradeTime: avgTime,
      };
    };
  }, []);

  const filterPeriod = useMemo(() => {
    const now = new Date();
    return (type: string) => {
      const map: Record<string, Date> = {
        week: startOfWeek(now),
        month: startOfMonth(now),
        quarter: startOfQuarter(now),
        year: startOfYear(now),
      };
      const start = map[type];
      return start ? trades.filter(t => new Date(t.opened_at) >= start) : trades;
    };
  }, [trades]);

  const allMetrics = calculateMetrics(trades);
  const weekly = calculateMetrics(filterPeriod("week"));
  const monthly = calculateMetrics(filterPeriod("month"));
  const quarterly = calculateMetrics(filterPeriod("quarter"));
  const yearly = calculateMetrics(filterPeriod("year"));

  const tabs = [
    { value: "all", label: "All Time", metrics: allMetrics, trades },
    { value: "week", label: "This Week", metrics: weekly, trades: filterPeriod("week") },
    { value: "month", label: "This Month", metrics: monthly, trades: filterPeriod("month") },
    { value: "quarter", label: "This Quarter", metrics: quarterly, trades: filterPeriod("quarter") },
    { value: "year", label: "This Year", metrics: yearly, trades: filterPeriod("year") },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white relative overflow-hidden">
      <FloatingOrbs />
      
      <div className={cn("relative z-10 max-w-7xl mx-auto px-6 py-12", loaded ? "opacity-100" : "opacity-0")}>
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex-center shadow-2xl shadow-emerald-500/40">
              <BarChart3 className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Analytics</h1>
              <p className="text-gray-400 mt-1">Deep performance insights</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10">
              <Filter className="w-4 h-4 mr-2" /> Filter
            </Button>
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-12">
          <TabsList className="grid grid-cols-5 w-full bg-white/5 border border-white/10 p-2 rounded-2xl">
            {tabs.map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-xl data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:shadow-lg transition-all font-medium"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map(({ value, metrics, trades: periodTrades }) => (
            <TabsContent key={value} value={value} className="space-y-12">
              <TraderLevel winRate={parseFloat(metrics.winRate)} profitFactor={metrics.profitFactor} totalTrades={metrics.totalTrades} netPnL={metrics.netPnL} />

              {/* Primary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
                <StatCard title="Total Trades" value={metrics.totalTrades} icon={BarChart3} color="purple" delay={100} />
                <StatCard title="Wins" value={metrics.profitableTrades} icon={TrendingUp} trend="up" color="emerald" delay={150} />
                <StatCard title="Losses" value={metrics.nonProfitableTrades} icon={TrendingDown} trend="down" color="red" delay={200} />
                <StatCard title="Win Rate" value={`${metrics.winRate}%`} icon={Target} trend={parseFloat(metrics.winRate) >= 55 ? "up" : "down"} color="blue" delay={250} />
                <StatCard title="Profit Factor" value={metrics.profitFactor} icon={Zap} trend={parseFloat(metrics.profitFactor) > 1.5 ? "up" : "down"} color={parseFloat(metrics.profitFactor) > 1.5 ? "emerald" : "orange"} delay={300} />
                <StatCard title="Net P&L" value={`$${metrics.netPnL.toFixed(0)}`} icon={DollarSign} trend={metrics.netPnL >= 0 ? "up" : "down"} color={metrics.netPnL >= 0 ? "emerald" : "red"} delay={350} />
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <StatCard title="Expectancy" value={`$${metrics.expectedValue.toFixed(1)}`} icon={Calculator} trend={metrics.expectedValue >= 0 ? "up" : "down"} color={metrics.expectedValue >= 0 ? "emerald" : "red"} subtitle="Per trade" delay={400} />
                <StatCard title="Avg Win" value={`$${metrics.avgWin.toFixed(0)}`} icon={ArrowUpRight} trend="up" color="emerald" delay={450} />
                <StatCard title="Avg Loss" value={`$${metrics.avgLoss.toFixed(0)}`} icon={ArrowDownRight} trend="down" color="red" delay={500} />
                <StatCard title="Daily P&L" value={`$${metrics.netDailyPnL.toFixed(0)}`} icon={Calendar} trend={metrics.netDailyPnL >= 0 ? "up" : "down"} color={metrics.netDailyPnL >= 0 ? "emerald" : "red"} delay={550} />
              </div>

              {/* Holding Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <StatCard
                  title="Avg Holding Time"
                  value={
                    metrics.avgTradeTime < 60
                      ? `${Math.round(metrics.avgTradeTime)}m`
                      : metrics.avgTradeTime < 1440
                      ? `${(metrics.avgTradeTime / 60).toFixed(1)}h`
                      : `${(metrics.avgTradeTime / 1440).toFixed(1)}d`
                  }
                  icon={Timer}
                  color="cyan"
                  delay={600}
                />
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <EquityCurveChart trades={periodTrades} />
                <StrategyPerformance trades={periodTrades} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;