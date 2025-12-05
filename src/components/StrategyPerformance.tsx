import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, TrendingUp, TrendingDown } from "lucide-react";

interface StrategyMetrics {
  strategyId: string;
  strategyName: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  netPnL: number;
}

interface StrategyPerformanceProps {
  trades: any[];
}

export function StrategyPerformance({ trades }: StrategyPerformanceProps) {
  const calculateStrategyMetrics = (): StrategyMetrics[] => {
    const strategyMap = new Map<string, any[]>();
    
    // Group trades by strategy
    trades.forEach(trade => {
      const strategyId = trade.strategy_id || "no-strategy";
      const strategyName = trade.strategies?.name || "No Strategy";
      
      if (!strategyMap.has(strategyId)) {
        strategyMap.set(strategyId, []);
      }
      strategyMap.get(strategyId)!.push({ ...trade, strategyName });
    });

    // Calculate metrics for each strategy
    const metrics: StrategyMetrics[] = [];
    
    strategyMap.forEach((strategyTrades, strategyId) => {
      const totalTrades = strategyTrades.length;
      const profitableTrades = strategyTrades.filter(t => (t.profit_loss_currency || 0) > 0).length;
      const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
      
      const totalProfit = strategyTrades
        .filter(t => (t.profit_loss_currency || 0) > 0)
        .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
      
      const totalLoss = Math.abs(strategyTrades
        .filter(t => (t.profit_loss_currency || 0) < 0)
        .reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0));
      
      const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
      const netPnL = strategyTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);

      metrics.push({
        strategyId,
        strategyName: strategyTrades[0].strategyName,
        totalTrades,
        winRate,
        profitFactor,
        netPnL
      });
    });

    // Sort by net P&L descending
    return metrics.sort((a, b) => b.netPnL - a.netPnL);
  };

  const strategyMetrics = calculateStrategyMetrics();

  if (strategyMetrics.length === 0) {
    return null;
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-serif flex items-center gap-2">
          <Target className="h-5 w-5" />
          Strategy Performance Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Strategy</TableHead>
              <TableHead className="text-center">Trades</TableHead>
              <TableHead className="text-center">Win Rate</TableHead>
              <TableHead className="text-center">Profit Factor</TableHead>
              <TableHead className="text-right">Net P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {strategyMetrics.map((strategy) => (
              <TableRow key={strategy.strategyId}>
                <TableCell className="font-medium">{strategy.strategyName}</TableCell>
                <TableCell className="text-center">{strategy.totalTrades}</TableCell>
                <TableCell className="text-center">
                  <span className={strategy.winRate >= 50 ? "text-success" : "text-destructive"}>
                    {strategy.winRate.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={strategy.profitFactor > 1 ? "text-success" : "text-destructive"}>
                    {strategy.profitFactor === Infinity ? "∞" : strategy.profitFactor.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {strategy.netPnL > 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className={strategy.netPnL > 0 ? "text-success" : "text-destructive"}>
                      ${Math.abs(strategy.netPnL).toFixed(2)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
