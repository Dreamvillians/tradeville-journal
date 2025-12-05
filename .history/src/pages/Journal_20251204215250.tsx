import { useState, useEffect, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Image as ImageIcon, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Calendar,
  ArrowRight,
  MoreHorizontal,
  Wallet,
  Activity,
  ChevronRight
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

// -------------------------------------------------------------------------------------
// Styles & Visuals
// -------------------------------------------------------------------------------------

const JOURNAL_STYLES = `
  .journal-glass {
    background: radial-gradient(circle at top left, rgba(52, 211, 153, 0.05), transparent 40%),
                rgba(15, 16, 24, 0.85);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  }
  
  .journal-row:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .animate-enter { animation: enter 0.5s ease-out forwards; opacity: 0; transform: translateY(10px); }
  @keyframes enter { to { opacity: 1; transform: translateY(0); } }
  
  /* Hide scrollbar but keep functionality */
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

const FloatingOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-20 left-10 w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
    <div className="absolute bottom-20 right-10 w-[350px] h-[350px] md:w-[500px] md:h-[500px] bg-emerald-600/5 rounded-full blur-[100px]" />
  </div>
));
FloatingOrbs.displayName = "FloatingOrbs";

// -------------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------------

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

type FilterStatus = "ALL" | "OPEN" | "CLOSED";

// -------------------------------------------------------------------------------------
// Utility Components
// -------------------------------------------------------------------------------------

const StatBadge = ({ label, value, icon: Icon, color = "default" }: any) => {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    default: "bg-white/5 text-gray-400 border-white/10"
  };
  
  return (
    <div className={cn(
      "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border backdrop-blur-md min-w-0",
      colors[color as keyof typeof colors]
    )}>
      <div className="p-1.5 sm:p-2 rounded-lg bg-white/5 flex-shrink-0">
        <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold opacity-70 truncate">{label}</div>
        <div className="text-sm sm:text-lg font-bold leading-none mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
};

// Mobile Trade Card Component
const MobileTradeCard = ({ trade, onImageClick }: { trade: Trade; onImageClick: (url: string) => void }) => {
  const beforeImage = trade.trade_images?.find(img => img.type === "BEFORE");
  const afterImage = trade.trade_images?.find(img => img.type === "AFTER");
  const isWin = (trade.profit_loss_currency || 0) > 0;
  const isLoss = (trade.profit_loss_currency || 0) < 0;

  return (
    <div className="journal-glass rounded-xl p-4 space-y-3">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={cn(
            "w-1 h-10 rounded-full flex-shrink-0",
            trade.direction === "LONG" ? "bg-emerald-500" : "bg-rose-500"
          )} />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-base flex items-center gap-2 flex-wrap">
              <span className="truncate">{trade.instrument}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-bold border border-opacity-20 flex-shrink-0",
                trade.direction === "LONG" 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500" 
                  : "bg-rose-500/10 text-rose-400 border-rose-500"
              )}>
                {trade.direction}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5 truncate">{trade.setup_type || "No Setup"}</div>
          </div>
        </div>
        <Badge className={cn(
          "font-medium text-[10px] border flex-shrink-0",
          trade.closed_at 
            ? "bg-white/5 text-gray-400 border-white/10" 
            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
        )}>
          {trade.closed_at ? "CLOSED" : "ACTIVE"}
        </Badge>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-mono">IN</span>
            <span className="font-mono text-gray-200">{trade.entry_price.toFixed(trade.entry_price < 1 ? 5 : 2)}</span>
          </div>
          {trade.exit_price && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 font-mono">OUT</span>
              <span className="font-mono text-gray-200">{trade.exit_price.toFixed(trade.exit_price < 1 ? 5 : 2)}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400 font-medium">
            {format(new Date(trade.opened_at), "MMM dd, yyyy")}
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">
            {format(new Date(trade.opened_at), "HH:mm")}
          </div>
        </div>
      </div>

      {/* Footer Row */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div className="flex gap-2">
          {beforeImage && (
            <div 
              onClick={() => onImageClick(beforeImage.url)}
              className="w-8 h-8 rounded bg-black/40 border border-white/10 flex items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-colors overflow-hidden"
            >
              <img src={beforeImage.url} className="w-full h-full object-cover opacity-60" alt="Before" />
            </div>
          )}
          {afterImage && (
            <div 
              onClick={() => onImageClick(afterImage.url)}
              className="w-8 h-8 rounded bg-black/40 border border-white/10 flex items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors overflow-hidden"
            >
              <img src={afterImage.url} className="w-full h-full object-cover opacity-60" alt="After" />
            </div>
          )}
          {!beforeImage && !afterImage && (
            <div className="w-8 h-8 rounded bg-white/2 border border-white/5 flex items-center justify-center">
              <ImageIcon className="w-3 h-3 text-gray-700" />
            </div>
          )}
        </div>
        {trade.profit_loss_currency !== null ? (
          <div className={cn(
            "text-lg font-bold font-mono",
            isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-gray-400"
          )}>
            {trade.profit_loss_currency > 0 ? "+" : ""}${trade.profit_loss_currency.toFixed(2)}
          </div>
        ) : (
          <span className="text-gray-600 text-sm">-</span>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------------------------

const Journal = () => {
  const [showForm, setShowForm] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { toast } = useToast();

  // Inject Styles
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
    toast({
      title: "Trade Logged",
      description: "Your trade has been successfully saved.",
      className: "bg-emerald-500 border-none text-white"
    });
  };

  // --- Derived Data ---
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      const matchesStatus = 
        statusFilter === "ALL" ? true :
        statusFilter === "OPEN" ? !t.closed_at :
        !!t.closed_at;
      
      const matchesSearch = 
        t.instrument.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.setup_type && t.setup_type.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [trades, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = trades.length;
    const netPnL = trades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
    const wins = trades.filter(t => (t.profit_loss_currency || 0) > 0).length;
    const closedTrades = trades.filter(t => t.closed_at).length;
    const winRate = closedTrades > 0 ? (wins / closedTrades) * 100 : 0;
    const openPositions = trades.filter(t => !t.closed_at).length;

    return { total, netPnL, winRate, openPositions };
  }, [trades]);

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white relative overflow-x-hidden font-sans selection:bg-emerald-500/30">
      <FloatingOrbs />

      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 animate-enter">
        
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Trade Journal</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Track, analyze, and perfect your execution.</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" /> Log Trade
          </Button>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <StatBadge 
            label="Net P&L" 
            value={`$${stats.netPnL.toFixed(2)}`} 
            icon={Wallet} 
            color={stats.netPnL >= 0 ? "emerald" : "rose"} 
          />
          <StatBadge 
            label="Win Rate" 
            value={`${stats.winRate.toFixed(1)}%`} 
            icon={Activity} 
            color="blue" 
          />
          <StatBadge 
            label="Open" 
            value={stats.openPositions} 
            icon={Clock} 
            color="default" 
          />
          <StatBadge 
            label="Total" 
            value={stats.total} 
            icon={TrendingUp} 
            color="default" 
          />
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search symbol or setup..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 sm:py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 self-start sm:self-auto">
            {["ALL", "OPEN", "CLOSED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as FilterStatus)}
                className={cn(
                  "px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                  statusFilter === status 
                    ? "bg-white/10 text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Trade Form Overlay */}
        {showForm && (
          <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <Card className="journal-glass border-white/10">
              <CardHeader className="border-b border-white/5 pb-4 px-4 sm:px-6">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base sm:text-lg font-medium">New Entry</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">Cancel</Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                <TradeForm onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Display */}
        <Card className="journal-glass border-none overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-20 space-y-4 text-gray-500">
                <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
                <p className="text-sm">Syncing journal...</p>
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="text-center py-16 sm:py-20 px-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                </div>
                <p className="text-gray-400 font-medium">No trades found</p>
                <p className="text-gray-600 text-sm mt-1">Try adjusting your filters or log a new trade.</p>
              </div>
            ) : (
              <>
                {/* Mobile View - Card Layout */}
                <div className="block lg:hidden p-3 sm:p-4 space-y-3">
                  {filteredTrades.map((trade) => (
                    <MobileTradeCard 
                      key={trade.id} 
                      trade={trade} 
                      onImageClick={setSelectedImage}
                    />
                  ))}
                </div>

                {/* Desktop View - Table Layout */}
                <div className="hidden lg:block overflow-x-auto hide-scrollbar">
                  <Table>
                    <TableHeader className="bg-white/[0.02] border-b border-white/5">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="pl-6 h-12 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Instrument</TableHead>
                        <TableHead className="h-12 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</TableHead>
                        <TableHead className="h-12 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Execution</TableHead>
                        <TableHead className="h-12 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</TableHead>
                        <TableHead className="h-12 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">P&L</TableHead>
                        <TableHead className="h-12 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center pr-6">Media</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTrades.map((trade) => {
                        const beforeImage = trade.trade_images?.find(img => img.type === "BEFORE");
                        const afterImage = trade.trade_images?.find(img => img.type === "AFTER");
                        const isWin = (trade.profit_loss_currency || 0) > 0;
                        const isLoss = (trade.profit_loss_currency || 0) < 0;
                        
                        return (
                          <TableRow key={trade.id} className="journal-row border-b border-white/5 transition-colors group">
                            
                            {/* 1. Instrument & Direction */}
                            <TableCell className="pl-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-1 h-10 rounded-full",
                                  trade.direction === "LONG" ? "bg-emerald-500" : "bg-rose-500"
                                )} />
                                <div>
                                  <div className="font-bold text-white text-base flex items-center gap-2">
                                    {trade.instrument}
                                    <span className={cn(
                                      "text-[10px] px-1.5 py-0.5 rounded font-bold border border-opacity-20",
                                      trade.direction === "LONG" 
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500" 
                                        : "bg-rose-500/10 text-rose-400 border-rose-500"
                                    )}>
                                      {trade.direction}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">{trade.setup_type || "No Setup"}</div>
                                </div>
                              </div>
                            </TableCell>

                            {/* 2. Status */}
                            <TableCell>
                              <Badge className={cn(
                                "font-medium text-[10px] border",
                                trade.closed_at 
                                  ? "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10" 
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                              )}>
                                {trade.closed_at ? "CLOSED" : "ACTIVE"}
                              </Badge>
                            </TableCell>

                            {/* 3. Execution */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-[10px] text-gray-500 font-mono w-6">IN</span>
                                  <span className="font-mono text-gray-200">{trade.entry_price.toFixed(trade.entry_price < 1 ? 5 : 2)}</span>
                                </div>
                                {trade.exit_price && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-[10px] text-gray-500 font-mono w-6">OUT</span>
                                    <span className="font-mono text-gray-200">{trade.exit_price.toFixed(trade.exit_price < 1 ? 5 : 2)}</span>
                                  </div>
                                )}
                                {trade.position_size && (
                                  <div className="text-[10px] text-gray-600 pl-8">Size: {trade.position_size}</div>
                                )}
                              </div>
                            </TableCell>

                            {/* 4. Date */}
                            <TableCell>
                              <div className="text-xs text-gray-400 font-medium">
                                {format(new Date(trade.opened_at), "MMM dd")}
                              </div>
                              <div className="text-[10px] text-gray-600 mt-0.5">
                                {format(new Date(trade.opened_at), "HH:mm")}
                              </div>
                            </TableCell>

                            {/* 5. P&L */}
                            <TableCell className="text-right">
                              {trade.profit_loss_currency !== null ? (
                                <div>
                                  <div className={cn(
                                    "text-base font-bold font-mono",
                                    isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-gray-400"
                                  )}>
                                    {trade.profit_loss_currency > 0 ? "+" : ""}
                                    ${trade.profit_loss_currency.toFixed(2)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </TableCell>

                            {/* 6. Images */}
                            <TableCell className="pr-6">
                              <div className="flex justify-center gap-2">
                                {beforeImage && (
                                  <div 
                                    onClick={() => setSelectedImage(beforeImage.url)}
                                    className="w-8 h-8 rounded bg-black/40 border border-white/10 flex items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-colors group/img relative overflow-hidden"
                                  >
                                    <img src={beforeImage.url} className="w-full h-full object-cover opacity-60 group-hover/img:opacity-100" alt="Before" />
                                  </div>
                                )}
                                {afterImage && (
                                  <div 
                                    onClick={() => setSelectedImage(afterImage.url)}
                                    className="w-8 h-8 rounded bg-black/40 border border-white/10 flex items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors group/img relative overflow-hidden"
                                  >
                                    <img src={afterImage.url} className="w-full h-full object-cover opacity-60 group-hover/img:opacity-100" alt="After" />
                                  </div>
                                )}
                                {!beforeImage && !afterImage && (
                                  <div className="w-8 h-8 rounded bg-white/2 border border-white/5 flex items-center justify-center">
                                    <ImageIcon className="w-3 h-3 text-gray-700" />
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
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Viewer Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="w-[95vw] max-w-5xl bg-black/95 border-white/10 p-2 sm:p-0 overflow-hidden">
          <DialogHeader className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10">
            <DialogTitle className="text-white drop-shadow-md bg-black/50 px-2 py-1 rounded text-sm sm:text-base">Screenshot</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="w-full h-[60vh] sm:h-[80vh] flex items-center justify-center pt-8">
              <img 
                src={selectedImage} 
                alt="Trade Evidence" 
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