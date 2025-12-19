import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AITradeAnalysisProps {
  period?: string;
}

export const AITradeAnalysis = ({ period = "all" }: AITradeAnalysisProps) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-trades", {
        body: { period },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to generate analysis");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
      toast({
        title: "Analysis Complete",
        description: "AI has analyzed your trading performance",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate analysis";
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

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-serif flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Performance Analysis
        </CardTitle>
        <Button
          onClick={generateAnalysis}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {analysis ? "Refresh Analysis" : "Generate Analysis"}
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!analysis && !error && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">Get AI-powered insights on your trading performance</p>
            <p className="text-sm">
              Click "Generate Analysis" to receive personalized recommendations
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-4 text-muted-foreground">Analyzing your trades...</p>
            <p className="text-sm text-muted-foreground/70">This may take a few moments</p>
          </div>
        )}

        {analysis && !isLoading && (
          <div className="prose prose-invert max-w-none">
            <div 
              className="text-sm leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ 
                __html: formatMarkdown(analysis) 
              }} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Simple markdown formatter
const formatMarkdown = (text: string): string => {
  return text
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-2 text-foreground">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal text-muted-foreground">$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="text-muted-foreground mb-3">')
    // Line breaks
    .replace(/\n/g, '<br/>')
    // Wrap in paragraph
    .replace(/^(.*)$/, '<p class="text-muted-foreground mb-3">$1</p>');
};
