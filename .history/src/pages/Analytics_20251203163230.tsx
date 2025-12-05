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
      return data || [];
    },
  });

  const calculateMetrics = (filteredTrades: any[]) => {
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
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold mb-2">Analytics</h1>
        <p className="text-muted-foreground">Performance insights and statistics</p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Time</TabsTrigger>
          <TabsTrigger value="week">Weekly</TabsTrigger>
          <TabsTrigger value="month">Monthly</TabsTrigger>
          <TabsTrigger value="quarter">Quarterly</TabsTrigger>
          <TabsTrigger value="year">Yearly</TabsTrigger>
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
  );
};

const AnalyticsContent = ({ metrics, trades, period }: any) => {
  return (
    <>
      <TraderLevel 
        winRate={parseFloat(metrics.winRate)}
        profitFactor={metrics.profitFactor}
        totalTrades={metrics.totalTrades}
        netPnL={metrics.netPnL}
      />

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

      <EquityCurveChart trades={trades} />

      <StrategyPerformance trades={trades} />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-serif flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Performance Summary - {period}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Win Rate Score</p>
                <p className="text-2xl font-bold">{metrics.winRate}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {metrics.totalTrades > 0 
                    ? `${((metrics.profitableTrades / metrics.totalTrades) * 100).toFixed(1)}%`
                    : "0%"}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Trade Distribution</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-success h-8 rounded flex items-center justify-center text-xs font-medium">
                  Wins: {metrics.profitableTrades}
                </div>
                <div className="flex-1 bg-destructive h-8 rounded flex items-center justify-center text-xs font-medium">
                  Losses: {metrics.nonProfitableTrades}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default Analytics;
