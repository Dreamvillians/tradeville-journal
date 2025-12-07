// src/components/predictions/AITradePrediction.tsx

import { useState, useRef, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Camera,
  X,
  ImageIcon,
  Brain,
  Shield,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface TradeData {
  instrument?: string;
  direction?: "long" | "short" | string;
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
  timeframe?: string;
  notes?: string;
}

interface PredictionStats {
  instrumentWinRate: string;
  totalInstrumentTrades: number;
  avgWin: number;
  avgLoss: number;
  riskRewardRatio: string;
  bestSession?: string;
  avgHoldTime?: string;
  consecutiveWins?: number;
  consecutiveLosses?: number;
}

interface TradeLevels {
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  takeProfit3?: number;
  riskReward: number;
}

interface ChartAnalysis {
  patterns: string[];
  trend: "bullish" | "bearish" | "ranging";
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  confidence: number;
}

interface PredictionResult {
  prediction: string;
  stats: PredictionStats;
  recommendation: "buy" | "sell" | "hold";
  confidence: number;
  levels?: TradeLevels;
  chartAnalysis?: ChartAnalysis;
  hasChartAnalysis: boolean;
  riskAssessment: "low" | "medium" | "high";
  warnings?: string[];
}

interface AITradePredictionProps {
  tradeData: TradeData;
  onLevelsGenerated?: (levels: TradeLevels) => void;
  className?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPrice = (price: number, instrument?: string): string => {
  const isJpy = instrument?.toUpperCase().includes("JPY");
  return price.toFixed(isJpy ? 3 : 5);
};

const formatMarkdown = (text: string): string => {
  return text
    // Headers
    .replace(/^#### (.*$)/gim, '<h5 class="text-sm font-semibold mt-3 mb-1 text-foreground">$1</h5>')
    .replace(/^### (.*$)/gim, '<h4 class="text-base font-semibold mt-4 mb-1 text-foreground">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-foreground">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2 text-foreground">$1</h2>')
    // Formatting
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal text-muted-foreground">$1</li>')
    // Colored indicators
    .replace(/🟢/g, '<span class="text-emerald-500">●</span>')
    .replace(/🔴/g, '<span class="text-red-500">●</span>')
    .replace(/🟡/g, '<span class="text-amber-500">●</span>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="text-muted-foreground mb-2">')
    .replace(/\n/g, '<br/>');
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Stats Display Component
const StatsGrid = memo(function StatsGrid({ stats }: { stats: PredictionStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-background/50 rounded-xl p-3 border border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <Target className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Win Rate</span>
        </div>
        <p className={cn(
          "font-bold text-xl tabular-nums",
          parseFloat(stats.instrumentWinRate) >= 50 ? "text-emerald-500" : "text-red-500"
        )}>
          {stats.instrumentWinRate}%
        </p>
      </div>

      <div className="bg-background/50 rounded-xl p-3 border border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Total Trades</span>
        </div>
        <p className="font-bold text-xl tabular-nums text-foreground">
          {stats.totalInstrumentTrades}
        </p>
      </div>

      <div className="bg-background/50 rounded-xl p-3 border border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Risk/Reward</span>
        </div>
        <p className={cn(
          "font-bold text-xl tabular-nums",
          parseFloat(stats.riskRewardRatio.replace(":", "")) >= 1.5 ? "text-emerald-500" : "text-foreground"
        )}>
          {stats.riskRewardRatio}
        </p>
      </div>

      <div className="bg-background/50 rounded-xl p-3 border border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <DollarSign className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Avg P&L</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-emerald-500 tabular-nums">
            +{formatCurrency(stats.avgWin)}
          </span>
          <span className="font-semibold text-sm text-red-500 tabular-nums">
            -{formatCurrency(stats.avgLoss)}
          </span>
        </div>
      </div>
    </div>
  );
});

// Trade Levels Card
const TradeLevelsCard = memo(function TradeLevelsCard({
  levels,
  instrument,
  direction,
  onCopy,
}: {
  levels: TradeLevels;
  instrument?: string;
  direction: "buy" | "sell" | "hold";
  onCopy: (text: string) => void;
}) {
  const isBuy = direction === "buy";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Entry */}
      <div className="relative group bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
        <button
          onClick={() => onCopy(formatPrice(levels.entry, instrument))}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
        <div className="flex items-center gap-1.5 text-blue-400 mb-1">
          <Target className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Entry</span>
        </div>
        <p className="font-bold text-lg tabular-nums text-foreground">
          {formatPrice(levels.entry, instrument)}
        </p>
      </div>

      {/* Stop Loss */}
      <div className="relative group bg-red-500/10 rounded-xl p-3 border border-red-500/20">
        <button
          onClick={() => onCopy(formatPrice(levels.stopLoss, instrument))}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
        <div className="flex items-center gap-1.5 text-red-400 mb-1">
          <Shield className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Stop Loss</span>
        </div>
        <p className="font-bold text-lg tabular-nums text-red-400">
          {formatPrice(levels.stopLoss, instrument)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isBuy ? "-" : "+"}{Math.abs(levels.entry - levels.stopLoss).toFixed(5)}
        </p>
      </div>

      {/* Take Profit 1 */}
      <div className="relative group bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
        <button
          onClick={() => onCopy(formatPrice(levels.takeProfit1, instrument))}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
        <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
          <DollarSign className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Take Profit 1</span>
        </div>
        <p className="font-bold text-lg tabular-nums text-emerald-400">
          {formatPrice(levels.takeProfit1, instrument)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isBuy ? "+" : "-"}{Math.abs(levels.takeProfit1 - levels.entry).toFixed(5)}
        </p>
      </div>

      {/* Risk/Reward */}
      <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
        <div className="flex items-center gap-1.5 text-purple-400 mb-1">
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Risk/Reward</span>
        </div>
        <p className="font-bold text-lg tabular-nums text-purple-400">
          1:{levels.riskReward.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {levels.riskReward >= 2 ? "Excellent" : levels.riskReward >= 1.5 ? "Good" : "Fair"}
        </p>
      </div>
    </div>
  );
});

// Chart Analysis Card
const ChartAnalysisCard = memo(function ChartAnalysisCard({
  analysis,
  instrument,
}: {
  analysis: ChartAnalysis;
  instrument?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <Eye className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-foreground">Chart Vision Analysis</h4>
            <p className="text-xs text-muted-foreground">
              {analysis.patterns.length} patterns detected • {analysis.trend} trend
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={cn(
              "text-xs",
              analysis.trend === "bullish" && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
              analysis.trend === "bearish" && "bg-red-500/20 text-red-400 border-red-500/30",
              analysis.trend === "ranging" && "bg-amber-500/20 text-amber-400 border-amber-500/30"
            )}
          >
            {analysis.trend.charAt(0).toUpperCase() + analysis.trend.slice(1)}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* Confidence */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Analysis Confidence</span>
              <span className="font-medium">{analysis.confidence}%</span>
            </div>
            <Progress value={analysis.confidence} className="h-1.5" />
          </div>

          {/* Patterns */}
          {analysis.patterns.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Detected Patterns</p>
              <div className="flex flex-wrap gap-2">
                {analysis.patterns.map((pattern, i) => (
                  <Badge key={i} variant="secondary" className="text-xs capitalize">
                    {pattern.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Key Levels */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-emerald-400 mb-2 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Resistance Levels
              </p>
              <div className="space-y-1">
                {analysis.keyLevels.resistance.slice(0, 3).map((level, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">R{i + 1}</span>
                    <span className="font-mono text-foreground">{formatPrice(level, instrument)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-red-400 mb-2 flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3" />
                Support Levels
              </p>
              <div className="space-y-1">
                {analysis.keyLevels.support.slice(0, 3).map((level, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">S{i + 1}</span>
                    <span className="font-mono text-foreground">{formatPrice(level, instrument)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Recommendation Badge
const RecommendationBadge = memo(function RecommendationBadge({
  recommendation,
  confidence,
}: {
  recommendation: "buy" | "sell" | "hold";
  confidence: number;
}) {
  const config = {
    buy: {
      icon: TrendingUp,
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      label: "BUY",
    },
    sell: {
      icon: TrendingDown,
      bg: "bg-red-500/20",
      border: "border-red-500/30",
      text: "text-red-400",
      label: "SELL",
    },
    hold: {
      icon: Clock,
      bg: "bg-amber-500/20",
      border: "border-amber-500/30",
      text: "text-amber-400",
      label: "HOLD",
    },
  };

  const c = config[recommendation];
  const Icon = c.icon;

  return (
    <div className={cn("flex items-center gap-3 p-4 rounded-xl border", c.bg, c.border)}>
      <div className={cn("p-3 rounded-xl", c.bg)}>
        <Icon className={cn("h-6 w-6", c.text)} />
      </div>
      <div>
        <p className={cn("text-2xl font-bold", c.text)}>{c.label}</p>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={confidence} className="w-20 h-1.5" />
          <span className="text-xs text-muted-foreground">{confidence}% confidence</span>
        </div>
      </div>
    </div>
  );
});

// Risk Assessment Badge
const RiskBadge = memo(function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const config = {
    low: {
      icon: CheckCircle,
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      label: "Low Risk",
    },
    medium: {
      icon: AlertTriangle,
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      label: "Medium Risk",
    },
    high: {
      icon: AlertCircle,
      bg: "bg-red-500/10",
      text: "text-red-400",
      label: "High Risk",
    },
  };

  const c = config[level];
  const Icon = c.icon;

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium", c.bg, c.text)}>
      <Icon className="h-3.5 w-3.5" />
      {c.label}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AITradePrediction = memo(function AITradePrediction({
  tradeData,
  onLevelsGenerated,
  className,
}: AITradePredictionProps) {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartScreenshot, setChartScreenshot] = useState<string | null>(null);
  const [chartPreview, setChartPreview] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "levels" | "chart">("analysis");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle screenshot upload
  const handleScreenshotUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setChartScreenshot(base64);
      setChartPreview(base64);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  // Remove screenshot
  const removeScreenshot = useCallback(() => {
    setChartScreenshot(null);
    setChartPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
    toast({
      title: "Copied",
      description: `${text} copied to clipboard`,
    });
  }, [toast]);

  // Generate prediction
  const generatePrediction = useCallback(async () => {
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
        body: {
          tradeData,
          screenshotBase64: chartScreenshot,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to generate prediction");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const predictionResult: PredictionResult = {
        prediction: data.prediction,
        stats: data.stats,
        recommendation: data.recommendation || "hold",
        confidence: data.confidence || 50,
        levels: data.levels,
        chartAnalysis: data.chartAnalysis,
        hasChartAnalysis: data.hasChartAnalysis || false,
        riskAssessment: data.riskAssessment || "medium",
        warnings: data.warnings,
      };

      setResult(predictionResult);

      // Notify parent of generated levels
      if (predictionResult.levels && onLevelsGenerated) {
        onLevelsGenerated(predictionResult.levels);
      }

      toast({
        title: "Analysis Complete",
        description: predictionResult.hasChartAnalysis
          ? "AI has analyzed your chart and trade setup"
          : "AI has analyzed your trade setup",
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
  }, [tradeData, chartScreenshot, onLevelsGenerated, toast]);

  const canAnalyze = Boolean(tradeData.instrument);

  return (
    <Card className={cn("border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden", className)}>
      {/* Accent line */}
      {result && (
        <div
          className={cn(
            "h-1",
            result.recommendation === "buy" && "bg-gradient-to-r from-emerald-500 to-green-400",
            result.recommendation === "sell" && "bg-gradient-to-r from-red-500 to-orange-400",
            result.recommendation === "hold" && "bg-gradient-to-r from-amber-500 to-yellow-400"
          )}
        />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            AI Trade Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {result?.hasChartAnalysis && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Eye className="h-3 w-3" />
                Vision
              </Badge>
            )}
            {result && <RiskBadge level={result.riskAssessment} />}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        {result?.stats && <StatsGrid stats={result.stats} />}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Analysis Failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {/* Warnings */}
        {result?.warnings && result.warnings.length > 0 && (
          <div className="space-y-2">
            {result.warnings.map((warning, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-amber-200">{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Initial State - No Prediction Yet */}
        {!result && !error && !isLoading && (
          <div className="space-y-4">
            {/* Chart Upload */}
            <div className="border-2 border-dashed border-border/50 rounded-xl bg-background/30 transition-colors hover:border-primary/30">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleScreenshotUpload}
                accept="image/*"
                className="hidden"
              />

              {chartPreview ? (
                <div className="relative group">
                  <img
                    src={chartPreview}
                    alt="Chart screenshot"
                    className="w-full h-40 object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={removeScreenshot}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-primary/90 text-primary-foreground text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    Chart ready for vision analysis
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="p-4 rounded-2xl bg-primary/10">
                    <ImageIcon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Upload Chart Screenshot</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI will analyze patterns, support/resistance, and trend
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Analyze Button */}
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {chartScreenshot
                  ? "Chart ready • Click to analyze with AI vision"
                  : "Get AI insights based on your historical performance"}
              </p>
              <Button
                onClick={generatePrediction}
                disabled={!canAnalyze || isLoading}
                size="lg"
                className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              >
                <Sparkles className="h-4 w-4" />
                {chartScreenshot ? "Analyze Chart & Trade" : "Analyze Trade Setup"}
              </Button>
              {!canAnalyze && (
                <p className="text-xs text-muted-foreground">
                  Enter an instrument to enable analysis
                </p>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {chartScreenshot ? "Analyzing chart patterns..." : "Processing trade data..."}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">This may take a few seconds</p>
          </div>
        )}

        {/* Results */}
        {result && !isLoading && (
          <div className="space-y-4">
            {/* Recommendation */}
            <RecommendationBadge
              recommendation={result.recommendation}
              confidence={result.confidence}
            />

            {/* Tabs for different views */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid grid-cols-3 bg-background/50">
                <TabsTrigger value="analysis" className="gap-1.5 text-xs">
                  <Brain className="h-3.5 w-3.5" />
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="levels" className="gap-1.5 text-xs" disabled={!result.levels}>
                  <Target className="h-3.5 w-3.5" />
                  Levels
                </TabsTrigger>
                <TabsTrigger value="chart" className="gap-1.5 text-xs" disabled={!result.chartAnalysis}>
                  <Eye className="h-3.5 w-3.5" />
                  Chart
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="mt-4">
                <div
                  className="text-sm leading-relaxed prose prose-invert max-w-none p-4 bg-background/30 rounded-xl border border-border/50"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(result.prediction),
                  }}
                />
              </TabsContent>

              <TabsContent value="levels" className="mt-4">
                {result.levels && (
                  <TradeLevelsCard
                    levels={result.levels}
                    instrument={tradeData.instrument}
                    direction={result.recommendation}
                    onCopy={handleCopy}
                  />
                )}
              </TabsContent>

              <TabsContent value="chart" className="mt-4">
                {result.chartAnalysis && (
                  <ChartAnalysisCard
                    analysis={result.chartAnalysis}
                    instrument={tradeData.instrument}
                  />
                )}
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={generatePrediction}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Re-analyze
              </Button>
              {!chartScreenshot && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Add Chart
                </Button>
              )}
              {result.levels && (
                <Button
                  onClick={() => {
                    const levels = result.levels!;
                    const text = `Entry: ${formatPrice(levels.entry, tradeData.instrument)}
SL: ${formatPrice(levels.stopLoss, tradeData.instrument)}
TP: ${formatPrice(levels.takeProfit1, tradeData.instrument)}
R:R: 1:${levels.riskReward.toFixed(2)}`;
                    handleCopy(text);
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {copiedText ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy Levels
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default AITradePrediction;