import { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickStatCard } from "@/components/QuickStatCard";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { StrategyPerformance } from "@/components/StrategyPerformance";
import { TraderLevel } from "@/components/TraderLevel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign,
  BarChart3,
  Calendar,
  Timer,
  Calculator
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfWeek, endOfMonth, endOfQuarter, endOfYear } from "date-fns";

// Types
interface Trade {
  id: string;
  profit_loss_currency: number | null;
  opened_at: string;
  closed_at: string | null;
  strategies?: {
    name: string | null;
  } | null;
  [key: string]: any;
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

const Analytics = () => {
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
      return data as Trade[];
    },
  });

  const calculateMetrics = useCallback((filteredTrades: Trade[]): Metrics => {
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

    // Average Win/Loss
    const avgWin = profitableTrades > 0 ? totalProfit / profitableTrades : 0;
    const avgLoss = nonProfitableTrades > 0 ? totalLoss / nonProfitableTrades : 0;
    
    // Expected Value (average P&L per trade)
    const expectedValue = totalTrades > 0 ? netPnL / totalTrades : 0;
    
    // Net Daily P&L (calculate unique trading days)
    const tradingDays = new Set(filteredTrades.map(t => new Date(t.opened_at).toDateString())).size;
    const netDailyPnL = tradingDays > 0 ? netPnL / tradingDays : 0;
    
    // Average Trade Time (in minutes)
    const closedTrades = filteredTrades.filter(t => t.closed_at);
    const avgTradeTime = closedTrades.length > 0 
      ? closedTrades.reduce((sum, t) => {
          if (!t.closed_at) return sum;
          const opened = new Date(t.opened_at).getTime();
          const closed = new Date(t.closed_at).getTime();
          return sum + (closed - opened) / (1000 * 60); // Convert to minutes
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
  }, []);

  const filterTradesByPeriod = useCallback((period: string) => {
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
  }, [trades]);

  // Memoize metrics for different periods
  const allTimeMetrics = useMemo(() => calculateMetrics(trades), [trades, calculateMetrics]);
  const weeklyTrades = useMemo(() => filterTradesByPeriod("week"), [filterTradesByPeriod]);
  const monthlyTrades = useMemo(() => filterTradesByPeriod("month"), [filterTradesByPeriod]);
  const quarterlyTrades = useMemo(() => filterTradesByPeriod("quarter"), [filterTradesByPeriod]);
  const yearlyTrades = useMemo(() => filterTradesByPeriod("year"), [filterTradesByPeriod]);

  const weeklyMetrics = useMemo(() => calculateMetrics(weeklyTrades), [weeklyTrades, calculateMetrics]);
  const monthlyMetrics = useMemo(() => calculateMetrics(monthlyTrades), [monthlyTrades, calculateMetrics]);
  const quarterlyMetrics = useMemo(() => calculateMetrics(quarterlyTrades), [quarterlyTrades, calculateMetrics]);
  const yearlyMetrics = useMemo(() => calculateMetrics(yearlyTrades), [yearlyTrades, calculateMetrics]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-serif font-bold mb-2 text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Performance insights and statistics</p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1">
          <TabsTrigger value="all">All Time</TabsTrigger>
          <TabsTrigger value="week">Weekly</TabsTrigger>
          <TabsTrigger value="month">Monthly</TabsTrigger>
          <TabsTrigger value="quarter">Quarterly</TabsTrigger>
          <TabsTrigger value="year">Yearly</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6 outline-none mt-6">
          <AnalyticsContent metrics={allTimeMetrics} trades={trades} period="All Time" />
        </TabsContent>

        <TabsContent value="week" className="space-y-6 outline-none mt-6">
          <AnalyticsContent 
            metrics={weeklyMetrics} 
            trades={weeklyTrades}
            period="This Week"
          />
        </TabsContent>

        <TabsContent value="month" className="space-y-6 outline-none mt-6">
          <AnalyticsContent 
            metrics={monthlyMetrics} 
            trades={monthlyTrades}
            period="This Month"
          />
        </TabsContent>

        <TabsContent value="quarter" className="space-y-6 outline-none mt-6">
          <AnalyticsContent 
            metrics={quarterlyMetrics} 
            trades={quarterlyTrades}
            period="This Quarter"
          />
        </TabsContent>

        <TabsContent value="year" className="space-y-6 outline-none mt-6">
          <AnalyticsContent 
            metrics={yearlyMetrics} 
            trades={yearlyTrades}
            period="This Year"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const AnalyticsContent = ({ metrics, trades, period }: { metrics: Metrics, trades: Trade[], period: string }) => {
  return (
    <>
      <div className="animate-slide-up fade-in-5">
        <TraderLevel 
          winRate={parseFloat(metrics.winRate)}
          profitFactor={parseFloat(metrics.profitFactor === "∞" ? "999" : metrics.profitFactor)}
          totalTrades={metrics.totalTrades}
          netPnL={metrics.netPnL}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStatCard
          title="Total Trades"
          value={metrics.totalTrades}
          icon={BarChart3}
          trend="neutral"
        />
        <QuickStatCard
          title="Profitable Trades"
          value={metrics.profitableTrades}
          icon={TrendingUp}
          trend="up"
        />
        <QuickStatCard
          title="Non-Profitable Trades"
          value={metrics.nonProfitableTrades}
          icon={TrendingDown}
          trend="down"
        />
        <QuickStatCard
          title="Win Rate"
          value={`${metrics.winRate}%`}
          icon={Target}
          trend={parseFloat(metrics.winRate) >= 50 ? "up" : "down"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickStatCard
          title="Profit Factor"
          value={metrics.profitFactor}
          icon={DollarSign}
          trend={parseFloat(metrics.profitFactor) > 1 ? "up" : "down"}
          subtitle="Gross profit / Gross loss"
        />
        <QuickStatCard
          title="Net P&L"
          value={`$${metrics.netPnL.toFixed(2)}`}
          icon={DollarSign}
          trend={metrics.netPnL > 0 ? "up" : metrics.netPnL < 0 ? "down" : "neutral"}
          subtitle={period}
        />
        <QuickStatCard
          title="Expected Value"
          value={`$${metrics.expectedValue.toFixed(2)}`}
          icon={Calculator}
          trend={metrics.expectedValue > 0 ? "up" : metrics.expectedValue < 0 ? "down" : "neutral"}
          subtitle="Avg P&L per trade"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickStatCard
          title="Average Win"
          value={`$${metrics.avgWin.toFixed(2)}`}
          icon={TrendingUp}
          trend="up"
          subtitle="Avg profit per win"
        />
        <QuickStatCard
          title="Average Loss"
          value={`$${metrics.avgLoss.toFixed(2)}`}
          icon={TrendingDown}
          trend="down"
          subtitle="Avg loss per loss"
        />
        <QuickStatCard
          title="Net Daily P&L"
          value={`$${metrics.netDailyPnL.toFixed(2)}`}
          icon={Calendar}
          trend={metrics.netDailyPnL > 0 ? "up" : metrics.netDailyPnL < 0 ? "down" : "neutral"}
          subtitle="Avg P&L per day"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickStatCard
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
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <EquityCurveChart trades={trades} />
        </div>
        <div className="lg:col-span-2">
          <StrategyPerformance trades={trades} />
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl font-serif flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Performance Summary - {period}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">Win Rate Score</p>
                <p className={`text-3xl font-bold ${parseFloat(metrics.winRate) >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {metrics.winRate}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">Success Rate</p>
                <p className="text-3xl font-bold text-foreground">
                  {metrics.totalTrades > 0 
                    ? `${((metrics.profitableTrades / metrics.totalTrades) * 100).toFixed(1)}%`
                    : "0%"}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3 font-medium">Trade Distribution</p>
              <div className="flex w-full h-10 rounded-lg overflow-hidden">
                {metrics.totalTrades > 0 ? (
                  <>
                    <div 
                      className="bg-emerald-500/90 hover:bg-emerald-500 transition-colors flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(metrics.profitableTrades / metrics.totalTrades) * 100}%` }}
                    >
                      {metrics.profitableTrades > 0 && `Wins: ${metrics.profitableTrades}`}
                    </div>
                    <div 
                      className="bg-red-500/90 hover:bg-red-500 transition-colors flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(metrics.nonProfitableTrades / metrics.totalTrades) * 100}%` }}
                    >
                      {metrics.nonProfitableTrades > 0 && `Losses: ${metrics.nonProfitableTrades}`}
                    </div>
                  </>
                ) : (
                  <div className="w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    No trades recorded
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default Analytics;