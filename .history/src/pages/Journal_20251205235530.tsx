import { useState, useEffect, useMemo, memo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Image as ImageIcon,
  Search,
  Filter,
  TrendingUp,
  Clock,
  Wallet,
  Activity,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
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
  
  .journal-row {
    background-color: transparent;
    transition: background-color 0.2s ease;
  }

  /* Hover effect for the whole row */
  .journal-row:hover {
    background-color: rgba(255, 255, 255, 0.03);
  }

  /* STICKY COLUMN LOGIC */
  .sticky-col {
    position: sticky;
    left: 0;
    z-index: 20;
    background-color: #0a0b0f; /* Match page bg to hide content scrolling under */
    border-right: 1px solid rgba(255,255,255,0.05);
    transition: background-color 0.2s ease;
  }
  
  .sticky-header {
    z-index: 30; /* Header must be above row sticky cols */
    background-color: #0a0b0f; 
  }

  /* When hovering the row, change the sticky column bg to match */
  .journal-row:hover .sticky-col {
    background-color: #13141c; /* Approximation of the row hover color */
  }

  .animate-enter { animation: enter 0.5s ease-out forwards; opacity: 0; transform: translateY(10px); }
  @keyframes enter { to { opacity: 1; transform: translateY(0); } }
  
  /* Custom Scrollbar */
  .custom-scrollbar::-webkit-scrollbar {
    height: 10px;
    width: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(52, 211, 153, 0.5);
  }

  /* Smooth horizontal scrolling */
  .journal-scroll-area {
    scroll-behavior: smooth;
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

interface StatBadgeProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: "emerald" | "rose" | "blue" | "default";
}

const StatBadge = ({ label, value, icon: Icon, color = "default" }: StatBadgeProps) => {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    default: "bg-white/5 text-gray-400 border-white/10",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border backdrop-blur-md min-w-0",
        colors[color]
      )}
    >
      <div className="p-1.5 sm:p-2 rounded-lg bg-white/5 flex-shrink-0">
        <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold opacity-70 truncate">
          {label}
        </div>
        <div className="text-sm sm:text-lg font-bold leading-none mt-0.5 truncate">
          {value}
        </div>
      </div>
    </div>
  );
};

// Mobile Trade Card
const MobileTradeCard = memo(
  ({ trade, onViewDetails }: { trade: Trade; onViewDetails: (t: Trade) => void }) => {
    const isWin = (trade.profit_loss_currency || 0) > 0;

    return (
      <div
        onClick={() => onViewDetails(trade)}
        className="journal-glass rounded-xl p-4 space-y-3 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-1 h-8 rounded-full",
                trade.direction === "LONG" ? "bg-emerald-500" : "bg-rose-500"
              )}
            />
            <div>
              <div className="font-bold text-white">{trade.instrument}</div>
              <div className="text-xs text-gray-500">
                {format(new Date(trade.opened_at), "MMM dd")}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "font-mono font-bold",
              isWin
                ? "text-emerald-400"
                : (trade.profit_loss_currency || 0) < 0
                ? "text-rose-400"
                : "text-gray-400"
            )}
          >
            {trade.profit_loss_currency
              ? `$${trade.profit_loss_currency}`
              : "OPEN"}
          </div>
        </div>
      </div>
    );
  }
);
MobileTradeCard.displayName = "MobileTradeCard";

// -------------------------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------------------------

const Journal = () => {
  const [showForm, setShowForm] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Horizontal scroll helpers
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { toast } = useToast();

  // Inject Styles
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "journal-styles";
    style.innerHTML = JOURNAL_STYLES;
    document.head.appendChild(style);
    return () => {
      const existing = document.getElementById("journal-styles");
      if (existing) existing.remove();
    };
  }, []);

  const fetchTrades = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      className: "bg-emerald-500 border-none text-white",
    });
  };

  // Format helpers
  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(5);
    if (price < 100) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "MM/dd HH:mm");
  };

  // Derived Data
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "OPEN"
          ? !t.closed_at
          : !!t.closed_at;

      const matchesSearch =
        t.instrument.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.setup_type &&
          t.setup_type.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [trades, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = trades.length;
    const netPnL = trades.reduce(
      (sum, t) => sum + (t.profit_loss_currency || 0),
      0
    );
    const wins = trades.filter((t) => (t.profit_loss_currency || 0) > 0).length;
    const closedTrades = trades.filter((t) => t.closed_at).length;
    const winRate = closedTrades > 0 ? (wins / closedTrades) * 100 : 0;
    const openPositions = trades.filter((t) => !t.closed_at).length;

    return { total, netPnL, winRate, openPositions };
  }, [trades]);

  // Scroll Logic
  const updateScrollButtons = () => {
    const el = tableScrollRef.current;
    if (!el) return;
    const { scrollLeft, clientWidth, scrollWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  const scrollHorizontally = (direction: "left" | "right") => {
    const el = tableScrollRef.current;
    if (!el) return;
    const delta = el.clientWidth * 0.5;
    el.scrollBy({
      left: direction === "left" ? -delta : delta,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    updateScrollButtons();
  }, [filteredTrades.length]);

  return (
    // w-full + overflow-hidden on the outer wrapper ensures this component 
    // stays inside the main content area and doesn't bleed into the sidebar.
    <div className="w-full h-full max-w-full overflow-hidden bg-[#0a0b0f] text-white relative font-sans selection:bg-emerald-500/30">
      <FloatingOrbs />

      <div className="relative z-10 w-full h-full flex flex-col px-3 sm:px-6 lg:px-8 py-4 sm:py-8 animate-enter">
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Trade Journal
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Track, analyze, and perfect your execution.
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" /> Log Trade
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8 flex-shrink-0">
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search symbol or setup..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 sm:py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 self-start sm:self-auto">
            {(["ALL", "OPEN", "CLOSED"] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
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

        {/* Trade Form */}
        {showForm && (
          <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-300 flex-shrink-0">
            <Card className="journal-glass border-white/10">
              <CardHeader className="border-b border-white/5 pb-4 px-4 sm:px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-medium">
                  New Entry
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                <TradeForm
                  onSuccess={handleFormSuccess}
                  onCancel={() => setShowForm(false)}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Table Container - using min-w-0 to prevent flex blowout */}
        <Card className="journal-glass border-none overflow-hidden w-full min-w-0 flex-1 flex flex-col">
          <CardContent className="p-0 w-full h-full flex flex-col">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                No trades found
              </div>
            ) : (
              <>
                {/* Mobile List */}
                <div className="block lg:hidden p-3 space-y-3 overflow-y-auto">
                  {filteredTrades.map((trade) => (
                    <MobileTradeCard
                      key={trade.id}
                      trade={trade}
                      onViewDetails={setSelectedTrade}
                    />
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block relative w-full h-full">
                  <div
                    ref={tableScrollRef}
                    className="journal-scroll-area overflow-x-auto custom-scrollbar w-full pb-2"
                    onScroll={updateScrollButtons}
                  >
                    <Table className="min-w-[1200px]">
                      <TableHeader className="bg-white/[0.02] border-b border-white/5 sticky top-0 z-30 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent border-none">
                          
                          {/* STICKY INSTRUMENT COLUMN HEADER */}
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-6 sticky-col sticky-header">
                            Instrument
                          </TableHead>
                          
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center w-[80px]">
                            Status
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center w-[80px]">
                            Result
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center w-[80px]">
                            Direction
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Opened
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">
                            Entry
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Closed
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">
                            Exit
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">
                            Size
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">
                            P&L
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Setup
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">
                            Screenshots
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">
                            View
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTrades.map((trade) => {
                          const isWin =
                            (trade.profit_loss_currency || 0) > 0;
                          const isLoss =
                            (trade.profit_loss_currency || 0) < 0;
                          const hasScreenshots =
                            trade.trade_images &&
                            trade.trade_images.length > 0;

                          return (
                            <TableRow
                              key={trade.id}
                              className="journal-row border-b border-white/5 text-xs group"
                            >
                              {/* 1. STICKY INSTRUMENT COLUMN */}
                              <TableCell className="sticky-col pl-6 font-bold text-white whitespace-nowrap">
                                {trade.instrument}
                              </TableCell>

                              {/* 2. Status */}
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1.5 py-0 h-5 border-opacity-30",
                                    trade.closed_at
                                      ? "text-gray-400 border-gray-500"
                                      : "text-blue-400 border-blue-500 bg-blue-500/10"
                                  )}
                                >
                                  {trade.closed_at ? "CLOSED" : "OPEN"}
                                </Badge>
                              </TableCell>

                              {/* 3. Result */}
                              <TableCell className="text-center">
                                {trade.closed_at && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[9px] px-1.5 py-0 h-5 border-opacity-30",
                                      isWin
                                        ? "text-emerald-400 border-emerald-500 bg-emerald-500/10"
                                        : isLoss
                                        ? "text-rose-400 border-rose-500 bg-rose-500/10"
                                        : "text-gray-400 border-gray-500"
                                    )}
                                  >
                                    {isWin ? "WIN" : isLoss ? "LOSS" : "BE"}
                                  </Badge>
                                )}
                              </TableCell>

                              {/* 4. Direction */}
                              <TableCell className="text-center">
                                <span
                                  className={cn(
                                    "font-bold text-[10px]",
                                    trade.direction === "LONG"
                                      ? "text-emerald-500"
                                      : "text-rose-500"
                                  )}
                                >
                                  {trade.direction}
                                </span>
                              </TableCell>

                              {/* 5. Opened */}
                              <TableCell className="text-gray-400 font-mono whitespace-nowrap">
                                {formatDate(trade.opened_at)}
                              </TableCell>

                              {/* 6. Entry */}
                              <TableCell className="text-right font-mono text-gray-300">
                                {formatPrice(trade.entry_price)}
                              </TableCell>

                              {/* 7. Closed */}
                              <TableCell className="text-gray-400 font-mono whitespace-nowrap">
                                {formatDate(trade.closed_at)}
                              </TableCell>

                              {/* 8. Exit */}
                              <TableCell className="text-right font-mono text-gray-300">
                                {trade.exit_price
                                  ? formatPrice(trade.exit_price)
                                  : "-"}
                              </TableCell>

                              {/* 9. Size */}
                              <TableCell className="text-right font-mono text-gray-400">
                                {trade.position_size || "-"}
                              </TableCell>

                              {/* 10. P&L (Amount) */}
                              <TableCell className="text-right">
                                {trade.profit_loss_currency !== null ? (
                                  <span
                                    className={cn(
                                      "font-mono font-bold",
                                      isWin
                                        ? "text-emerald-400"
                                        : isLoss
                                        ? "text-rose-400"
                                        : "text-gray-400"
                                    )}
                                  >
                                    {isWin ? "+" : ""}
                                    {trade.profit_loss_currency.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-gray-600">-</span>
                                )}
                              </TableCell>

                              {/* 11. Setup */}
                              <TableCell
                                className="text-gray-400 truncate max-w-[100px]"
                                title={trade.setup_type || ""}
                              >
                                {trade.setup_type || "-"}
                              </TableCell>

                              {/* 12. Screenshots */}
                              <TableCell className="text-center">
                                <div className="flex justify-center -space-x-2 hover:space-x-1 transition-all">
                                  {hasScreenshots ? (
                                    trade.trade_images
                                      .slice(0, 2)
                                      .map((img, i) => (
                                        <div
                                          key={img.id}
                                          onClick={() =>
                                            setSelectedImage(img.url)
                                          }
                                          className="w-6 h-6 rounded border border-white/10 bg-black overflow-hidden cursor-pointer hover:z-10 hover:scale-150 hover:border-emerald-500 transition-all"
                                          style={{ zIndex: 2 - i }}
                                        >
                                          <img
                                            src={img.url}
                                            className="w-full h-full object-cover opacity-80"
                                            alt="thumb"
                                          />
                                        </div>
                                      ))
                                  ) : (
                                    <span className="text-gray-700 text-[10px]">
                                      -
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* 13. VIEW COLUMN */}
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-white/10 hover:text-emerald-400 text-gray-500 transition-colors"
                                  onClick={() => setSelectedTrade(trade)}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Scroll Buttons */}
                  {canScrollLeft && (
                    <button
                      type="button"
                      onClick={() => scrollHorizontally("left")}
                      className="absolute left-20 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/80 border border-white/15 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500 transition-all z-40"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-200" />
                    </button>
                  )}
                  {canScrollRight && (
                    <button
                      type="button"
                      onClick={() => scrollHorizontally("right")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/80 border border-white/15 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500 transition-all z-40"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-200" />
                    </button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Viewer Modal */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="w-[95vw] max-w-6xl bg-black/95 border-white/10 p-0 overflow-hidden">
          <div className="relative w-full h-[80vh] flex items-center justify-center">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Trade"
                className="max-w-full max-h-full object-contain"
              />
            )}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trade Details Modal */}
      <Dialog
        open={!!selectedTrade}
        onOpenChange={(open) => !open && setSelectedTrade(null)}
      >
        <DialogContent className="w-[95vw] max-w-md bg-[#0F1018] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-xl font-bold">
                {selectedTrade?.instrument}
              </span>
              <Badge
                className={cn(
                  "text-xs",
                  selectedTrade?.direction === "LONG"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-rose-500/10 text-rose-400"
                )}
              >
                {selectedTrade?.direction}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedTrade && (
            <div className="space-y-6 py-4">
              <div className="text-center p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                  Result
                </div>
                <div
                  className={cn(
                    "text-3xl font-bold font-mono",
                    (selectedTrade.profit_loss_currency || 0) > 0
                      ? "text-emerald-400"
                      : (selectedTrade.profit_loss_currency || 0) < 0
                      ? "text-rose-400"
                      : "text-gray-400"
                  )}
                >
                  {selectedTrade.profit_loss_currency
                    ? `$${selectedTrade.profit_loss_currency.toFixed(2)}`
                    : "OPEN"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-gray-500 text-xs">Opened</div>
                  <div className="font-mono">
                    {format(
                      new Date(selectedTrade.opened_at),
                      "MMM dd, HH:mm"
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500 text-xs">Closed</div>
                  <div className="font-mono">
                    {selectedTrade.closed_at
                      ? format(
                          new Date(selectedTrade.closed_at),
                          "MMM dd, HH:mm"
                        )
                      : "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500 text-xs">Entry Price</div>
                  <div className="font-mono">
                    {selectedTrade.entry_price}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500 text-xs">Exit Price</div>
                  <div className="font-mono">
                    {selectedTrade.exit_price || "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500 text-xs">Size</div>
                  <div className="font-mono">
                    {selectedTrade.position_size}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500 text-xs">Setup</div>
                  <div>{selectedTrade.setup_type || "-"}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Journal;