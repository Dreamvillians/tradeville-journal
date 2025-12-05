import { useState, useEffect, useMemo, memo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  PieChart,
  Flame,
  RefreshCw,
  Filter
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";

// Analytics Styles
const ANALYTICS_STYLES = `
  .analytics-float { animation: analytics-float 6s ease-in-out infinite; }
  .analytics-float-delayed { animation: analytics-float 6s ease-in-out infinite; animation-delay: 2s; }
  .analytics-pulse { animation: analytics-pulse 3s ease-in-out infinite; }
  .analytics-slide-up { animation: analytics-slide-up 0.7s ease-out forwards; opacity: 0; animation-fill-mode: both; }
  .analytics-fade-in { animation: analytics-fade-in 0.8s ease-out forwards; }
  
  @keyframes analytics-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
  @keyframes analytics-pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.06); } }
  @keyframes analytics-slide-up { 0% { transform: translateY(30px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes analytics-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
  
  .analytics-glass {
    background: rgba(18, 19, 26, 0.75);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.4s ease;
  }
  .analytics-glass:hover {
    border-color: rgba(16, 185, 129, 0.3);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    transform: translateY(-4px);
  }
`;

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

// Floating Background
const FloatingOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-20 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] analytics-float" />
    <div className="absolute bottom-20 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] analytics-float-delayed" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[180px] analytics-pulse" />
  </div>
));
FloatingOrbs.displayName = "FloatingOrbs";

// Stat Card – Clean & Spacious
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
  icon: any;
  trend?: "up" | "down" | "neutral";
  color?: "emerald" | "blue" | "purple" | "orange" | "red" | "cyan";
  delay?: number;
}) => {
  const colors = {
    emerald: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 shadow-emerald-500/20",
    blue: "from-blue-500/20 to-blue-600/10 text-blue-400 shadow-blue-500/20",
    purple: "from-purple-500/20 to-purple-600/10 text-purple-400 shadow-purple-500/20",
    orange: "from-orange-500/20 to-orange-600/10 text-orange-400 shadow-orange-500/20",
    red: "from-red-500/20 to-red-600/10 text-red-400 shadow-red-500/20",
    cyan: "from-cyan-500/20 to-cyan-600/10 text-cyan-400 shadow-cyan-500/20",
  }[color];

  return (
    <Card className={cn("analytics-glass analytics-slide-up relative overflow-hidden group")} style={{ animationDelay: `${delay}ms` }}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity", colors.split(" ")[0])} />
      
      <CardContent className="p-5 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-400 tracking-wider">{title}</p>
          {trend && trend !== "neutral" && (
            <div className={cn("p-1.5 rounded-lg", colors.split(" ")[0] + " " + colors.split(" ")[2])}>
              {trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </div>
          )}
        </div>

        <p className={cn(
          "text-2xl font-bold tracking-tight",
          value.toString().startsWith("-") ? "text-red-400" : "text-white"
        )}>
          {value}
        </p>

        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </CardContent>

      <div className={cn("absolute top-4 right-4 p-3 rounded-xl opacity-20 group-hover:opacity-40 transition-opacity", colors)}>
        <Icon className="w-6 h-6" />
      </div>
    </Card>
  );
});
StatCard.displayName = "StatCard";

// Trader Level – Premium Look
const TraderLevel = memo(({ winRate, profitFactor, totalTrades, netPnL }: any) => {
  const level = totalTrades < 10 ? "Beginner" :
                winRate >= 65 && profitFactor >= 2 ? "Elite" :
                winRate >= 55 && profitFactor >= 1.5 ? "Advanced" :
                winRate >= 45 ? "Intermediate" : "Developing";

  const color = level === "Elite" ? "emerald" :
               level === "Advanced" ? "blue" :
               level === "Intermediate" ? "purple" :
               level === "Developing" ? "orange" : "gray";

  const bg = {
    emerald: "from-emerald-500/20 to-emerald-600/10",
    blue: "from-blue-500/20 to-blue-600/10",
    purple: "from-purple-500/20 to-purple-600/10",
    orange: "from-orange-500/20 to-orange-600/10",
    gray: "from-gray-500/20 to-gray-600/10"
  }[color];

  return (
    <Card className="analytics-glass analytics-slide-up relative overflow-hidden">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40", bg)} />
      <CardContent className="p-8 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-2">Trader Level</p>
            <h3 className={cn("text-3xl font-bold", color === "emerald" ? "text-emerald-400" : color === "blue" ? "text-blue-400" : color === "purple" ? "text-purple-400" : color === "orange" ? "text-orange-400" : "text-gray-400")}>
              {level}
            </h3>
          </div>
          <Award className={cn("w-16 h-16 opacity-30", color === "emerald" ? "text-emerald-400" : color === "blue" ? "text-blue-400" : color === "purple" ? "text-purple-400" : color === "orange" ? "text-orange-400" : "text-gray-400")} />
        </div>
        <div className="mt-6 h-3 bg-white/10 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-1000", color === "emerald" ? "bg-emerald-500" : color === "blue" ? "bg-blue-500" : color === "purple" ? "bg-purple-500" : color === "orange" ? "bg-orange-500" : "bg-gray-500")}
            style={{ width: level === "Elite" ? "100%" : level === "Advanced" ? "78%" : level === "Intermediate" ? "55%" : level === "Developing" ? "30%" : "10%" }}
          />
        </div>
      </CardContent>
    </Card>
  );
});
TraderLevel.displayName = "TraderLevel";

const Analytics = () => {
  const stylesInjected = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!stylesInjected.current) {
      const styleSheet = document.createElement("style");
      styleSheet.textContent = ANALYTICS_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }
    setIsLoaded(true);
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
    return (filtered: Trade[]): Metrics => {
      const totalTrades = filtered.length;
      const wins = filtered.filter(t => t.profit_loss_currency > 0);
      const losses = filtered.filter(t => t.profit_loss_currency <= 0);
      const totalProfit = wins.reduce((s, t) => s + t.profit_loss_currency, 0);
      const totalLoss = Math.abs(losses.reduce((s, t) => s + t.profit_loss_currency, 0));
      const netPnL = filtered.reduce((s, t) => s + t.profit_loss_currency, 0);
      const tradingDays = new Set(filtered.map(t => new Date(t.opened_at).toDateString())).size;

      const avgTradeTime = filtered.filter(t => t.closed_at).length > 0
        ? filtered.filter(t => t.closed_at).reduce((s, t) => {
            const diff = (new Date(t.closed_at!).getTime() - new Date(t.opened_at).getTime()) / 60000;
            return s + diff;
          }, 0) / filtered.filter(t => t.closed_at).length
        : 0;

      return {
        totalTrades,
        profitableTrades: wins.length,
        nonProfitableTrades: losses.length,
        winRate: totalTrades ? ((wins.length / totalTrades) * 100).toFixed(1) : "0.0",
        profitFactor: totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : totalProfit > 0 ? "∞" : "0.00",
        netPnL,
        avgWin: wins.length ? totalProfit / wins.length : 0,
        avgLoss: losses.length ? totalLoss / losses.length : 0,
        expectedValue: totalTrades ? netPnL / totalTrades : 0,
        netDailyPnL: tradingDays ? netPnL / tradingDays : 0,
        avgTradeTime,
      };
    };
  }, []);

  const filterByPeriod = useMemo(() => {
    return (period: string) => {
      const now = new Date();
      const ranges: Record<string, { start: Date; end: Date }> = {
        week: { start: startOfWeek(now), end: now },
        month: { start: startOfMonth(now), end: now },
        quarter: { start: startOfQuarter(now), end: now },
        year: { start: startOfYear(now), end: now },
      };
      if (!ranges[period]) return trades;
      const { start } = ranges[period];
      return trades.filter(t => new Date(t.opened_at) >= start);
    };
  }, [trades]);

  const allMetrics = calculateMetrics(trades);
  const weeklyMetrics = calculateMetrics(filterByPeriod("week"));
  const monthlyMetrics = calculateMetrics(filterByPeriod("month"));
  const quarterlyMetrics = calculateMetrics(filterByPeriod("quarter"));
  const yearlyMetrics = calculateMetrics(filterByPeriod("year"));

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white relative overflow-hidden">
      <FloatingOrbs />
      
      <div className={cn("relative z-10 max-w-7xl mx-auto px-6 py-10", isLoaded ? "analytics-fade-in" : "opacity-0")}>
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Analytics</h1>
              <p className="text-gray-400 mt-1">Deep insights into your trading performance</p>
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

        <Tabs defaultValue="all" className="space-y-10">
          <TabsList className="grid grid-cols-5 w-full bg-white/5 border border-white/10 p-1.5 rounded-2xl">
            {["all", "week", "month", "quarter", "year"].map((val) => (
              <TabsTrigger
                key={val}
                value={val}
                className="rounded-xl data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 transition-all font-medium capitalize"
              >
                {val === "all" ? "All Time" : val === "week" ? "This Week" : val === "month" ? "This Month" : val === "quarter" ? "This Quarter" : "This Year"}
              </TabsTrigger>
            ))}
          </TabsList>

          {(["all", "week", "month", "quarter", "year"] as const).map((period) => {
            const metrics = period === "all" ? allMetrics : period === "week" ? weeklyMetrics : period === "month" ? monthlyMetrics : period === "quarter" ? quarterlyMetrics : yearlyMetrics;
            const periodTrades = period === "all" ? trades : filterByPeriod(period);

            return (
              <TabsContent key={period} value={period} className="space-y-10 mt-8">
                <TraderLevel {...metrics} netPnL={metrics.netPnL} profitFactor={metrics.profitFactor} />

                {/* Primary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
                  <StatCard title="Total Trades" value={metrics.totalTrades} icon={BarChart3} color="purple" delay={100} />
                  <StatCard title="Wins" value={metrics.profitableTrades} icon={TrendingUp} trend="up" color="emerald" delay={150} />
                  <StatCard title="Losses" value={metrics.nonProfitableTrades} icon={TrendingDown} trend="down" color="red" delay={200} />
                  <StatCard title="Win Rate" value={`${metrics.winRate}%`} icon={Target} trend={parseFloat(metrics.winRate) >= 55 ? "up" : "down"} color="blue" delay={250} />
                  <StatCard title="Profit Factor" value={metrics.profitFactor} icon={Zap} trend={parseFloat(metrics.profitFactor) > 1.5 ? "up" : "down"} color={parseFloat(metrics.profitFactor) > 1.5 ? "emerald" : "orange"} delay={300} />
                  <StatCard title="Net P&L" value={`$${metrics.netPnL.toFixed(0)}`} icon={DollarSign} trend={metrics.netPnL > 0 ? "up" : "down"} color={metrics.netPnL >= 0 ? "emerald" : "red"} subtitle={period === "all" ? "All Time" : period.replace(/^\w/, c => c.toUpperCase())} delay={350} />
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <StatCard title="Expectancy" value={`$${metrics.expectedValue.toFixed(1)}`} icon={Calculator} trend={metrics.expectedValue > 0 ? "up" : "down"} color={metrics.expectedValue >= 0 ? "emerald" : "red"} subtitle="Per trade" delay={400} />
                  <StatCard title="Avg Win" value={`$${metrics.avgWin.toFixed(0)}`} icon={ArrowUpRight} trend="up" color="emerald" delay={450} />
                  <StatCard title="Avg Loss" value={`$${metrics.avgLoss.toFixed(0)}`} icon={ArrowDownRight} trend="down" color="red" delay={500} />
                  <StatCard title="Daily P&L" value={`$${metrics.netDailyPnL.toFixed(0)}`} icon={Calendar} trend={metrics.netDailyPnL > 0 ? "up" : "down"} color={metrics.netDailyPnL >= 0 ? "emerald" : "red"} delay={550} />
                </div>

                {/* Holding Time */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <StatCard
                    title="Avg Holding Time"
                    value={metrics.avgTradeTime < 60 ? `${Math.round(metrics.avgTradeTime)}m` : metrics.avgTradeTime < 1440 ? `${(metrics.avgTradeTime / 60).toFixed(1)}h` : `${(metrics.avgTradeTime / 1440).toFixed(1)}d`}
                    icon={Timer}
                    trend="neutral"
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
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

// Re-use EquityCurveChart & StrategyPerformance from previous version (cleaned up above)

export default Analytics;