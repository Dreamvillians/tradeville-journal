import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, Target, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TradeData {
  instrument?: string;
  direction?: string;
  entry_price?: string;
  exit_price?: string;
  stop_loss?: string;
  take_profit?: string;
  position_size?: string;
  risk_amount?: string;
  session?: string;
  market_condition?: string;
  setup_type?: string;
  confluence?: string;
}

interface PredictionStats {
  instrumentWinRate: string;
  totalInstrumentTrades: number;
  avgWin: number;
  avgLoss: number;
  riskRewardRatio: string;
}

interface AITradePredictionProps {
  tradeData: TradeData;
}

export const AITradePrediction = ({ tradeData }: AITradePredictionProps) => {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generatePrediction = async () => {
    if (!tradeData.instrument) {
      toast({
        title: "Instrument Required",
        description: "Please enter an instrument to get AI analysis",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("predict-trade", {
        body: { tradeData },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to generate prediction");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setPrediction(data.prediction);
      setStats(data.stats);
      toast({
        title: "Analysis Ready",
        description: "AI has analyzed your trade setup",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate prediction";
      setError(message);
      toast({
        title: "Analysis Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canAnalyze = Boolean(tradeData.instrument);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Trade Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Target className="h-3 w-3" />
                <span className="text-xs">Win Rate</span>
              </div>
              <p className="font-bold text-lg">{stats.instrumentWinRate}%</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <BarChart3 className="h-3 w-3" />
                <span className="text-xs">Total Trades</span>
              </div>
              <p className="font-bold text-lg">{stats.totalInstrumentTrades}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs">R:R Ratio</span>
              </div>
              <p className="font-bold text-lg">{stats.riskRewardRatio}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <span className="text-xs">Avg Win/Loss</span>
              </div>
              <p className="font-bold text-sm text-emerald-500">${stats.avgWin.toFixed(0)}</p>
              <p className="font-bold text-sm text-rose-500">-${stats.avgLoss.toFixed(0)}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!prediction && !error && !isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm mb-3">
              Get AI insights on your trade setup based on historical performance
            </p>
            <Button
              onClick={generatePrediction}
              disabled={!canAnalyze || isLoading}
              size="sm"
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Analyze Trade
            </Button>
            {!canAnalyze && (
              <p className="text-xs text-muted-foreground/70 mt-2">
                Enter an instrument to enable analysis
              </p>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Analyzing trade setup...</p>
          </div>
        )}

        {prediction && !isLoading && (
          <div className="space-y-3">
            <div 
              className="text-sm leading-relaxed prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: formatMarkdown(prediction) 
              }} 
            />
            <Button
              onClick={generatePrediction}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Re-analyze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const formatMarkdown = (text: string): string => {
  return text
    .replace(/^### (.*$)/gim, '<h4 class="text-base font-semibold mt-4 mb-1 text-foreground">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-foreground">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal text-muted-foreground">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-muted-foreground mb-2">')
    .replace(/\n/g, '<br/>');
};
