import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Image as ImageIcon, 
  ArrowRight, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Search,
  Filter,
  MoreHorizontal
} from "lucide-react";
import { TradeForm } from "@/components/TradeForm";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// --- Types ---
interface TradeImage {
  id: string;
  url: string;
  type: "BEFORE" | "AFTER" | "OTHER";
  description: string | null;
}

interface Trade {
  id: string;
  instrument: string;
  direction: "LONG" | "SHORT";
  entry_price: number;
  exit_price: number | null;
  profit_loss_currency: number | null;
  opened_at: string;
  closed_at: string | null;
  position_size: number | null;
  setup_type: string | null;
  trade_images: TradeImage[];
}

// --- Styles for Animations ---
// Note: Ensure these are in your global CSS or defined in a style tag like the Analytics page
const JOURNAL_STYLES = `
  .journal-glass {
    background: rgba(13, 14, 18, 0.6);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  }
  .journal-row-hover:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

// --- Background Components ---
const FloatingOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] animate-pulse" />
    <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[100px]" />
  </div>
));
FloatingOrbs.displayName = "FloatingOrbs";

const Journal = () => {
  const [showForm, setShowForm] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

  // Inject styles
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = JOURNAL_STYLES;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  const fetchTrades = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trades")
        .select(`
          id, 
          instrument, 
          direction, 
          entry_price, 
          exit_price, 
          profit_loss_currency, 
          opened_at, 
          closed_at,
          position_size,
          setup_type,
          trade_images(id, url, type, description)
        `)
        .eq("user_id", user.id)
        .order("opened_at", { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error("Error fetching trades:", error);
      toast({
        title: "Error",
        description: "Failed to load trades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchTrades();
  };

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white relative overflow-x-hidden font-sans selection:bg-emerald-500/30">
      <FloatingOrbs />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Trade Journal</h1>
            <p className="text-gray-500 text-sm">Review, analyze, and refine your execution.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="journal-glass border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Filter className="w-4 h-4 mr-2" /> Filter
            </Button>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Log New Trade
            </Button>
          </div>
        </div>

        {/* Add Trade Form Overlay */}
        {showForm && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <Card className="journal-glass border-white/10">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-lg font-medium">New Trade Entry</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <TradeForm onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trades List */}
        <Card className="journal-glass border-none overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-20 space-y-3">
                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-500 text-sm">Loading your journal...</p>
              </div>
            ) : trades.length === 0 ? (
              <div className="text-center py-20 bg-white/2">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">No trades logged yet</h3>
                <p className="text-gray-500 text-sm mb-6">Start your journey by logging your first trade.</p>
                <Button onClick={() => setShowForm(true)} variant="outline" className="border-white/10">
                  Create Entry
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/[0.02] border-b border-white/5">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="h-12 text-xs font-bold text-gray-500 uppercase tracking-wider pl-6">Instrument</TableHead>
                      <TableHead className="h-12 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</TableHead>
                      <TableHead className="h-12 text-xs font-bold text-gray-500 uppercase tracking-wider">Execution</TableHead>
                      <TableHead className="h-12 text-xs font-bold text-gray-500 uppercase tracking-wider">Timing</TableHead>
                      <TableHead className="h-12 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">P&L</TableHead>
                      <TableHead className="h-12 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Evidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => {
                      const beforeImage = trade.trade_images?.find(img => img.type === "BEFORE");
                      const afterImage = trade.trade_images?.find(img => img.type === "AFTER");
                      const isWin = trade.profit_loss_currency !== null && trade.profit_loss_currency > 0;
                      const isLoss = trade.profit_loss_currency !== null && trade.profit_loss_currency < 0;
                      
                      return (
                        <TableRow 
                          key={trade.id} 
                          className="journal-row-hover border-b border-white/5 transition-colors group"
                        >
                          {/* Instrument & Direction */}
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-1 h-10 rounded-full",
                                trade.direction === "LONG" ? "bg-emerald-500" : "bg-rose-500"
                              )} />
                              <div>
                                <div className="font-bold text-white text-base">{trade.instrument}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge 
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] h-5 px-1.5 border-opacity-30",
                                      trade.direction === "LONG" 
                                        ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" 
                                        : "border-rose-500 text-rose-400 bg-rose-500/5"
                                    )}
                                  >
                                    {trade.direction}
                                  </Badge>
                                  <span className="text-xs text-gray-500">{trade.setup_type || "No Setup"}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge 
                              className={cn(
                                "font-medium text-[10px]",
                                trade.closed_at 
                                  ? "bg-white/10 text-gray-300 hover:bg-white/20" 
                                  : "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/20 border"
                              )}
                            >
                              {trade.closed_at ? "CLOSED" : "ACTIVE"}
                            </Badge>
                          </TableCell>

                          {/* Execution (Entry -> Exit) */}
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center text-sm">
                                <span className="w-12 text-gray-500 text-xs">IN</span>
                                <span className="font-mono text-gray-300">{trade.entry_price.toFixed(trade.entry_price < 10 ? 4 : 2)}</span>
                              </div>
                              {trade.exit_price && (
                                <div className="flex items-center text-sm">
                                  <span className="w-12 text-gray-500 text-xs">OUT</span>
                                  <span className="font-mono text-gray-300">{trade.exit_price.toFixed(trade.exit_price < 10 ? 4 : 2)}</span>
                                </div>
                              )}
                              {trade.position_size && (
                                <span className="text-xs text-gray-600 mt-0.5">Size: {trade.position_size}</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Timing */}
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(trade.opened_at), "MMM dd")}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {format(new Date(trade.opened_at), "HH:mm")}
                              </div>
                            </div>
                          </TableCell>

                          {/* P&L */}
                          <TableCell className="text-right">
                             {trade.profit_loss_currency !== null ? (
                              <div className="flex flex-col items-end">
                                <span className={cn(
                                  "text-base font-bold font-mono",
                                  isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-gray-400"
                                )}>
                                  {trade.profit_loss_currency > 0 ? "+" : ""}
                                  ${trade.profit_loss_currency.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">
                                  {isWin ? "Win" : isLoss ? "Loss" : "Break Even"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-600 text-sm">-</span>
                            )}
                          </TableCell>

                          {/* Evidence / Images */}
                          <TableCell>
                            <div className="flex justify-center gap-2">
                              {beforeImage && (
                                <div 
                                  className="group/img relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer"
                                  onClick={() => setSelectedImage(beforeImage.url)}
                                >
                                  <img src={beforeImage.url} alt="Before" className="w-full h-full object-cover opacity-70 group-hover/img:opacity-100 transition-opacity" />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                    <span className="text-[8px] font-bold text-white">PRE</span>
                                  </div>
                                </div>
                              )}
                              {afterImage && (
                                <div 
                                  className="group/img relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer"
                                  onClick={() => setSelectedImage(afterImage.url)}
                                >
                                  <img src={afterImage.url} alt="After" className="w-full h-full object-cover opacity-70 group-hover/img:opacity-100 transition-opacity" />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                    <span className="text-[8px] font-bold text-white">POST</span>
                                  </div>
                                </div>
                              )}
                              {!beforeImage && !afterImage && (
                                <div className="w-10 h-10 rounded-lg border border-white/5 flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-gray-700" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-5xl bg-black/90 border-white/10 p-1">
          <DialogHeader className="absolute top-4 left-4 z-50">
            <DialogTitle className="text-white drop-shadow-md">Trade Screenshot</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full h-[80vh] flex items-center justify-center bg-[#0a0b0f]">
              <img 
                src={selectedImage} 
                alt="Trade details" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Journal;