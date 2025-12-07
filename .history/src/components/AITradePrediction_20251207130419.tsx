import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Camera, 
  X, 
  ImageIcon, 
  Brain,
  ScanEye
} from "lucide-react";
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
  timeframe?: string;
  // Fields from MT4/5 auto-import
  before_screenshot_url?: string; 
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
  
  // Image State
  const [chartScreenshot, setChartScreenshot] = useState<string | null>(null); // Base64
  const [chartPreview, setChartPreview] = useState<string | null>(null); // Display URL
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Initialize: If MT4 data passed a URL, display it
  useEffect(() => {
    if (tradeData.before_screenshot_url) {
      setChartPreview(tradeData.before_screenshot_url);
    }
  }, [tradeData.before_screenshot_url]);

  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: "Please upload an image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Too Large", description: "Max file size is 5MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Strip prefix for API if needed, usually cleaner to keep it for preview
      const base64Clean = base64.split(',')[1]; 
      setChartScreenshot(base64Clean); 
      setChartPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setChartScreenshot(null);
    setChartPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generatePrediction = async () => {
    if (!tradeData.instrument) {
      toast({ title: "Missing Info", description: "Please enter a symbol/instrument first.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Prepare payload - prioritize uploaded base64, fallback to URL if from MT4
      const payload = {
        tradeData,
        screenshotBase64: chartScreenshot,
        screenshotUrl: !chartScreenshot ? chartPreview : undefined // Send URL if no manual upload
      };

      const { data, error: fnError } = await supabase.functions.invoke("predict-trade", {
        body: payload,
      });

      if (fnError) throw new Error(fnError.message || "Failed to contact AI.");
      if (data?.error) throw new Error(data.error);

      setPrediction(data.prediction);
      setStats(data.stats);
      
      toast({
        title: "Analysis Complete",
        description: data.hasChartAnalysis 
          ? "Vision AI analyzed your chart structure." 
          : "Analysis based on price data only.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Prediction failed";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const canAnalyze = Boolean(tradeData.instrument);

  return (
    <Card className="border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
      <CardHeader className="pb-3 border-b border-indigo-500/10 bg-indigo-500/10">
        <CardTitle className="text-lg font-serif flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300">
              AI Strategy Assistant
            </span>
          </div>
          {prediction && (
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-500/10 gap-1">
              <Brain className="w-3 h-3" /> GPT-4o Vision
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-5 pt-5">
        
        {/* 1. Historical Stats Section (Context) */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm animate-in fade-in slide-in-from-top-2">
            <StatBox icon={Target} label="Win Rate" value={`${stats.instrumentWinRate}%`} />
            <StatBox icon={BarChart3} label="Trades" value={stats.totalInstrumentTrades} />
            <StatBox icon={TrendingUp} label="Avg R:R" value={stats.riskRewardRatio} />
            <div className="bg-background/40 border border-white/5 rounded-lg p-2 text-center">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Exp. Value</span>
              <div className="flex items-center justify-center gap-2 mt-1">
                 <span className="font-bold text-emerald-400 text-xs">+${stats.avgWin.toFixed(0)}</span>
                 <span className="text-gray-600">/</span>
                 <span className="font-bold text-rose-400 text-xs">-${stats.avgLoss.toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 animate-in shake">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* 2. Chart Input Section */}
        {!prediction && !isLoading && (
          <div className="space-y-4">
            <div className={`
              border-2 border-dashed rounded-xl p-4 transition-all duration-200
              ${chartPreview ? 'border-indigo-500/30 bg-background/40' : 'border-white/10 hover:border-indigo-500/40 hover:bg-white/5'}
            `}>
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
                    alt="Setup Chart" 
                    className="w-full h-40 object-cover rounded-lg shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <Button variant="destructive" size="sm" onClick={removeScreenshot} className="gap-2">
                      <X className="h-4 w-4" /> Remove
                    </Button>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-indigo-300 text-[10px] uppercase font-bold px-2 py-1 rounded flex items-center gap-1 border border-indigo-500/30">
                    <ScanEye className="h-3 w-3" />
                    Vision Enabled
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground hover:text-indigo-400 transition-colors"
                >
                  <div className="p-4 rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/20">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Upload Chart Screenshot</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                      AI will identify patterns, S/R levels, and confirm your bias.
                    </p>
                  </div>
                </button>
              )}
            </div>

            <Button
              onClick={generatePrediction}
              disabled={!canAnalyze}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {chartPreview ? "Analyze Chart & Predict" : "Predict based on Data"}
            </Button>
          </div>
        )}

        {/* 3. Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="h-4 w-4 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-white">Analyzing Market Structure...</p>
              <p className="text-xs text-muted-foreground">Checking historical winning patterns</p>
            </div>
          </div>
        )}

        {/* 4. Results Section */}
        {prediction && !isLoading && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
              <div 
                className="text-sm leading-relaxed text-gray-300 prose prose-invert prose-strong:text-indigo-300 prose-headings:text-white max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: formatMarkdown(prediction) 
                }} 
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={generatePrediction}
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent border-indigo-500/20 hover:bg-indigo-500/10"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Regenerate
              </Button>
              {!chartPreview && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent border-dashed border-white/20 hover:border-white/40"
                >
                  <Camera className="h-3 w-3 mr-2" />
                  Add Chart Context
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Helper Components ---

const StatBox = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) => (
  <div className="bg-background/40 border border-white/5 rounded-lg p-2 text-center flex flex-col items-center justify-center">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
      <Icon className="h-3 w-3" />
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
    <p className="font-bold text-sm text-foreground">{value}</p>
  </div>
);

// Formatter to make the AI text look nice (Markdown to HTML)
const formatMarkdown = (text: string): string => {
  return text
    .replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold mt-4 mb-2 text-indigo-300 uppercase tracking-wide border-b border-indigo-500/20 pb-1">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="text-base font-bold mt-4 mb-2 text-white">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/^\- (.*$)/gim, '<div class="flex items-start gap-2 mb-1"><span class="text-indigo-500 mt-1.5">•</span><span>$1</span></div>')
    .replace(/\n/g, '<br/>');
};