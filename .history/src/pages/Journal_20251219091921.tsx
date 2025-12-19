import { useState, useEffect, useMemo, memo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  TrendingUp,
  Clock,
  Wallet,
  Activity,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  MoreVertical,
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    /* Use theme tokens instead of hard-coded dark colors */
    background:
      radial-gradient(
        circle at top left,
        hsla(var(--primary) / 0.06),
        transparent 40%
      ),
      hsla(var(--card) / 0.96);
    backdrop-filter: blur(16px);
    border: 1px solid hsla(var(--border) / 0.7);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.12);
  }
  
  .journal-row {
    background-color: transparent;
    transition: background-color 0.2s ease;
  }

  .journal-row:hover {
    background-color: hsla(var(--foreground) / 0.03);
  }

  .sticky-col {
    position: sticky;
    left: 0;
    z-index: 20;
    background-color: hsl(var(--background));
    border-right: 1px solid hsla(var(--border) / 0.7);
    transition: background-color 0.2s ease;
  }
  
  .sticky-header {
    z-index: 30;
    background-color: hsl(var(--background)); 
  }

  .journal-row:hover .sticky-col {
    background-color: hsla(var(--background) / 0.97); 
  }

  .animate-enter {
    animation: enter 0.5s ease-out forwards;
    opacity: 0;
    transform: translateY(10px);
  }
  @keyframes enter {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    height: 10px;
    width: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: hsla(var(--muted) / 0.4);
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: hsla(var(--foreground) / 0.12);
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: hsla(var(--primary) / 0.5);
  }

  .journal-scroll-area {
    scroll-behavior: smooth;
  }
`;

const FloatingOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    {/* These small gradients can stay brand-colored */}
    <div className="absolute top-20 left-10 w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
    <div className="absolute bottom-20 right-10 w-[350px] h-[350px] md:w-[500px] md:h-[500px] bg-emerald-600/5 rounded-full blur-[100px]" />
  </div>
));
FloatingOrbs.displayName = "FloatingOrbs";

// -------------------------------------------------------------------------------------
// Types - match DB & TradeForm
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
  stop_loss: number | null;
  take_profit: number | null;
  position_size: number | null;
  risk_amount: number | null;
  reward_amount: number | null;
  profit_loss_currency: number | null;
  profit_loss_r: number | null;
  opened_at: string;
  closed_at: string | null;
  session: string | null;
  market_condition: string | null;
  setup_type: string | null;
  confluence: string | null;
  execution_rating: number | null;
  follow_plan: boolean | null;
  notes: string | null;
  custom_fields: Record<string, string> | null;
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

const StatBadge = ({
  label,
  value,
  icon: Icon,
  color = "default",
}: StatBadgeProps) => {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    default: "bg-muted/40 text-muted-foreground border-border/60",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border backdrop-blur-md min-w-0",
        colors[color]
      )}
    >
      <div className="p-1.5 sm:p-2 rounded-lg bg-background/40 flex-shrink-0">
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

// Mobile Trade Card with Edit functionality
const MobileTradeCard = memo(
  ({
    trade,
    onViewDetails,
    onEdit,
    onDelete,
  }: {
    trade: Trade;
    onViewDetails: (t: Trade) => void;
    onEdit: (t: Trade) => void;
    onDelete: (t: Trade) => void;
  }) => {
    const isWin =
      trade.profit_loss_currency != null && trade.profit_loss_currency > 0;
    const isLoss =
      trade.profit_loss_currency != null && trade.profit_loss_currency < 0;

    return (
      <div className="journal-glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={() => onViewDetails(trade)}
          >
            <div
              className={cn(
                "w-1 h-8 rounded-full",
                trade.direction === "LONG" ? "bg-emerald-500" : "bg-rose-500"
              )}
            />
            <div>
              <div className="font-bold text-foreground">
                {trade.instrument}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(trade.opened_at), "MMM dd, HH:mm")}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "font-mono font-bold",
                isWin
                  ? "text-emerald-400"
                  : isLoss
                  ? "text-rose-400"
                  : "text-muted-foreground"
              )}
            >
              {trade.profit_loss_currency !== null
                ? `${isWin ? "+" : ""}$${trade.profit_loss_currency.toFixed(2)}`
                : "OPEN"}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover border-border text-foreground"
              >
                <DropdownMenuItem
                  onClick={() => onViewDetails(trade)}
                  className="hover:bg-muted/60 cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onEdit(trade)}
                  className="hover:bg-muted/60 cursor-pointer"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Trade
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => onDelete(trade)}
                  className="text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Trade
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span
            className={cn(
              "font-semibold",
              trade.direction === "LONG"
                ? "text-emerald-400"
                : "text-rose-400"
            )}
          >
            {trade.direction}
          </span>
          <span>Entry: {trade.entry_price}</span>
          {trade.exit_price && <span>Exit: {trade.exit_price}</span>}
          {trade.setup_type && (
            <span className="truncate max-w-[80px]">{trade.setup_type}</span>
          )}
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

  // Edit state
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Delete confirmation
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Inject Styles once
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

  // Fetch trades from Supabase
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
          stop_loss,
          take_profit,
          position_size,
          risk_amount,
          reward_amount,
          profit_loss_currency,
          profit_loss_r,
          opened_at,
          closed_at,
          session,
          market_condition,
          setup_type,
          confluence,
          execution_rating,
          follow_plan,
          notes,
          custom_fields,
          trade_images(id, url, type, description)
        `)
        .eq("user_id", user.id)
        .order("opened_at", { ascending: false });

      if (error) throw error;

      const transformedTrades: Trade[] = (data || []).map((trade: any) => ({
        ...trade,
        trade_images: trade.trade_images || [],
        custom_fields: trade.custom_fields || null,
      }));

      setTrades(transformedTrades);
    } catch (error) {
      console.error("Error fetching trades:", error);
      toast({
        title: "Error",
        description: "Failed to fetch trades. Please refresh the page.",
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
    setEditingTrade(null);
    setIsEditModalOpen(false);
    fetchTrades();
    toast({
      title: editingTrade ? "Trade Updated" : "Trade Logged",
      description: editingTrade
        ? "Your trade has been successfully updated."
        : "Your trade has been successfully saved.",
      className: "bg-emerald-500 border-none text-primary-foreground",
    });
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsEditModalOpen(true);
    setSelectedTrade(null);
  };

  const handleDeleteTrade = async () => {
    if (!tradeToDelete) return;

    setIsDeleting(true);
    try {
      if (tradeToDelete.trade_images && tradeToDelete.trade_images.length > 0) {
        const { error: imagesError } = await supabase
          .from("trade_images")
          .delete()
          .eq("trade_id", tradeToDelete.id);

        if (imagesError) {
          console.error("Error deleting trade images:", imagesError);
        }
      }

      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("id", tradeToDelete.id);

      if (error) throw error;

      toast({
        title: "Trade Deleted",
        description: "Your trade has been successfully removed.",
        className: "bg-emerald-500 border-none text-primary-foreground",
      });

      fetchTrades();
    } catch (error) {
      console.error("Error deleting trade:", error);
      toast({
        title: "Error",
        description: "Failed to delete trade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setTradeToDelete(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingTrade(null);
    setIsEditModalOpen(false);
  };

  const handleCancelNewTrade = () => {
    setShowForm(false);
  };

  // Formatting helpers
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "-";
    if (price < 1) return price.toFixed(5);
    if (price < 100) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "MM/dd HH:mm");
  };

  // Derived Data (filters + stats)
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const isClosed = !!t.closed_at;
      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "OPEN"
          ? !isClosed
          : isClosed;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        t.instrument.toLowerCase().includes(q) ||
        (t.setup_type && t.setup_type.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [trades, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = trades.length;
    const netPnL = trades.reduce(
      (sum, t) => sum + (t.profit_loss_currency || 0),
      0
    );
    const wins = trades.filter(
      (t) => t.profit_loss_currency != null && t.profit_loss_currency > 0
    ).length;
    const closedTrades = trades.filter((t) => t.closed_at).length;
    const winRate = closedTrades > 0 ? (wins / closedTrades) * 100 : 0;
    const openPositions = trades.filter((t) => !t.closed_at).length;

    return { total, netPnL, winRate, openPositions };
  }, [trades]);

  // Scroll Logic for desktop table
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
    <div className="flex-1 w-full min-w-0 bg-background text-foreground relative font-sans selection:bg-primary/30">
      <FloatingOrbs />

      <div className="relative z-10 w-full flex flex-col px-3 sm:px-6 lg:px-8 py-4 sm:py-8 animate-enter">
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Trade Journal
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Track, analyze, and perfect your execution.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" /> Log Trade
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8 flex-shrink-0">
          <StatBadge
            label="Net P&L"
            value={`${stats.netPnL >= 0 ? "+" : ""}$${stats.netPnL.toFixed(
              2
            )}`}
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search symbol or setup..."
              className="w-full bg-muted/40 border border-border rounded-xl py-2.5 sm:py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-muted/40 border border-border rounded-xl p-1 self-start sm:self-auto">
            {(["ALL", "OPEN", "CLOSED"] as FilterStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                  statusFilter === status
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* New Trade Form */}
        {showForm && (
          <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-300 flex-shrink-0">
            <Card className="journal-glass">
              <CardHeader className="border-b border-border/60 pb-4 px-4 sm:px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-medium">
                  New Trade Entry
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelNewTrade}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/40"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                <TradeForm
                  onSuccess={handleFormSuccess}
                  onCancel={handleCancelNewTrade}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Table Container */}
        <Card className="journal-glass border-none overflow-hidden w-full min-w-0 flex flex-col flex-1">
          <CardContent className="p-0 w-full h-full flex flex-col relative">
            {loading ? (
              <div className="flex justify-center py-20 flex-1">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground flex-1">
                <div className="space-y-3">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground/60" />
                  <p className="text-lg font-medium">No trades found</p>
                  <p className="text-sm">
                    {searchQuery || statusFilter !== "ALL"
                      ? "Try adjusting your filters"
                      : "Start by logging your first trade"}
                  </p>
                  {!showForm && !searchQuery && statusFilter === "ALL" && (
                    <Button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Log Your First Trade
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Mobile List */}
                <div className="block lg:hidden p-3 space-y-3 overflow-y-auto flex-1">
                  {filteredTrades.map((trade) => (
                    <MobileTradeCard
                      key={trade.id}
                      trade={trade}
                      onViewDetails={setSelectedTrade}
                      onEdit={handleEditTrade}
                      onDelete={setTradeToDelete}
                    />
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block w-full h-full relative">
                  <div
                    ref={tableScrollRef}
                    className="journal-scroll-area overflow-x-auto custom-scrollbar w-full h-full pb-3"
                    onScroll={updateScrollButtons}
                  >
                    <Table className="min-w-[1500px]">
                      <TableHeader className="bg-muted/40 border-b border-border/60 sticky top-0 z-30 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-6 sticky-col sticky-header min-w-[120px]">
                            Instrument
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center w-[80px]">
                            Status
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center w-[80px]">
                            Result
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center w-[80px]">
                            Direction
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Opened
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                            Entry
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Closed
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                            Exit
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                            Size
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                            P&L
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-4">
                            Setup
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                            Screenshots
                          </TableHead>
                          <TableHead className="h-10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center w-[120px]">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTrades.map((trade) => {
                          const isWin =
                            trade.profit_loss_currency != null &&
                            trade.profit_loss_currency > 0;
                          const isLoss =
                            trade.profit_loss_currency != null &&
                            trade.profit_loss_currency < 0;
                          const hasScreenshots =
                            trade.trade_images &&
                            trade.trade_images.length > 0;

                          return (
                            <TableRow
                              key={trade.id}
                              className="journal-row border-b border-border/60 text-xs group"
                            >
                              <TableCell className="sticky-col pl-6 font-bold text-foreground whitespace-nowrap">
                                {trade.instrument}
                              </TableCell>

                              {/* Status derived solely from closed_at */}
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1.5 py-0 h-5 border-opacity-40",
                                    trade.closed_at
                                      ? "text-muted-foreground border-border"
                                      : "text-blue-400 border-blue-500 bg-blue-500/10"
                                  )}
                                >
                                  {trade.closed_at ? "CLOSED" : "OPEN"}
                                </Badge>
                              </TableCell>

                              {/* Result derived solely from profit_loss_currency sign */}
                              <TableCell className="text-center">
                                {trade.closed_at && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[9px] px-1.5 py-0 h-5 border-opacity-40",
                                      trade.profit_loss_currency == null
                                        ? "text-muted-foreground border-border"
                                        : isWin
                                        ? "text-emerald-400 border-emerald-500 bg-emerald-500/10"
                                        : isLoss
                                        ? "text-rose-400 border-rose-500 bg-rose-500/10"
                                        : "text-muted-foreground border-border"
                                    )}
                                  >
                                    {trade.profit_loss_currency == null
                                      ? "-"
                                      : isWin
                                      ? "WIN"
                                      : isLoss
                                      ? "LOSS"
                                      : "BE"}
                                  </Badge>
                                )}
                              </TableCell>

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

                              <TableCell className="text-muted-foreground font-mono whitespace-nowrap">
                                {formatDate(trade.opened_at)}
                              </TableCell>

                              <TableCell className="text-right font-mono text-foreground/90">
                                {formatPrice(trade.entry_price)}
                              </TableCell>

                              <TableCell className="text-muted-foreground font-mono whitespace-nowrap">
                                {formatDate(trade.closed_at)}
                              </TableCell>

                              <TableCell className="text-right font-mono text-foreground/90">
                                {formatPrice(trade.exit_price)}
                              </TableCell>

                              <TableCell className="text-right font-mono text-muted-foreground">
                                {trade.position_size || "-"}
                              </TableCell>

                              <TableCell className="text-right">
                                {trade.profit_loss_currency !== null ? (
                                  <span
                                    className={cn(
                                      "font-mono font-bold",
                                      isWin
                                        ? "text-emerald-400"
                                        : isLoss
                                        ? "text-rose-400"
                                        : "text-muted-foreground"
                                    )}
                                  >
                                    {isWin ? "+" : ""}
                                    ${trade.profit_loss_currency.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/60">
                                    -
                                  </span>
                                )}
                              </TableCell>

                              <TableCell
                                className="text-muted-foreground truncate max-w-[120px] pl-4"
                                title={trade.setup_type || ""}
                              >
                                {trade.setup_type || "-"}
                              </TableCell>

                              <TableCell className="text-center">
                                <div className="flex justify-center -space-x-2 hover:space-x-1 transition-all">
                                  {hasScreenshots ? (
                                    trade.trade_images.slice(0, 2).map((img, i) => (
                                      <div
                                        key={img.id}
                                        onClick={() => setSelectedImage(img.url)}
                                        className="w-6 h-6 rounded border border-border bg-muted overflow-hidden cursor-pointer hover:z-10 hover:scale-150 hover:border-primary transition-all"
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
                                    <span className="text-muted-foreground/60 text-[10px]">
                                      -
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-muted/40 hover:text-primary text-muted-foreground transition-colors"
                                    onClick={() => setSelectedTrade(trade)}
                                    title="View Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-muted/40 hover:text-blue-400 text-muted-foreground transition-colors"
                                    onClick={() => handleEditTrade(trade)}
                                    title="Edit Trade"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground transition-colors"
                                    onClick={() => setTradeToDelete(trade)}
                                    title="Delete Trade"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
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
                      className="absolute left-24 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-primary/20 hover:border-primary transition-all z-40"
                    >
                      <ChevronLeft className="w-4 h-4 text-foreground" />
                    </button>
                  )}
                  {canScrollRight && (
                    <button
                      type="button"
                      onClick={() => scrollHorizontally("right")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-primary/20 hover:border-primary transition-all z-40"
                    >
                      <ChevronRight className="w-4 h-4 text-foreground" />
                    </button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Viewer Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="w-[95vw] max-w-6xl bg-popover border-border p-0 overflow-hidden">
          <div className="relative w-full h-[80vh] flex items-center justify-center bg-background">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Trade Screenshot"
                className="max-w-full max-h-full object-contain"
              />
            )}
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-background/70 text-foreground p-2 rounded-full hover:bg-muted/80 transition-colors"
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
        <DialogContent className="w-[95vw] max-w-md bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
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
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted/40"
                onClick={() => {
                  if (selectedTrade) {
                    handleEditTrade(selectedTrade);
                  }
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedTrade && (
            <div className="space-y-6 py-4">
              {/* Result block */}
              <div className="text-center p-4 bg-muted/40 rounded-xl border border-border/60">
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                  Result
                </div>
                <div
                  className={cn(
                    "text-3xl font-bold font-mono",
                    (selectedTrade.profit_loss_currency || 0) > 0
                      ? "text-emerald-400"
                      : (selectedTrade.profit_loss_currency || 0) < 0
                      ? "text-rose-400"
                      : "text-muted-foreground"
                  )}
                >
                  {selectedTrade.profit_loss_currency !== null
                    ? `${
                        (selectedTrade.profit_loss_currency || 0) > 0 ? "+" : ""
                      }$${selectedTrade.profit_loss_currency.toFixed(2)}`
                    : "OPEN"}
                </div>
                {selectedTrade.profit_loss_r !== null && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedTrade.profit_loss_r > 0 ? "+" : ""}
                    {selectedTrade.profit_loss_r.toFixed(2)}R
                  </div>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">Opened</div>
                  <div className="font-mono">
                    {format(new Date(selectedTrade.opened_at), "MMM dd, HH:mm")}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">Closed</div>
                  <div className="font-mono">
                    {selectedTrade.closed_at
                      ? format(new Date(selectedTrade.closed_at), "MMM dd, HH:mm")
                      : "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">
                    Entry Price
                  </div>
                  <div className="font-mono">
                    {formatPrice(selectedTrade.entry_price)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">
                    Exit Price
                  </div>
                  <div className="font-mono">
                    {formatPrice(selectedTrade.exit_price)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">Size</div>
                  <div className="font-mono">
                    {selectedTrade.position_size || "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">Setup</div>
                  <div>{selectedTrade.setup_type || "-"}</div>
                </div>
                {selectedTrade.stop_loss !== null && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Stop Loss
                    </div>
                    <div className="font-mono text-rose-400">
                      {formatPrice(selectedTrade.stop_loss)}
                    </div>
                  </div>
                )}
                {selectedTrade.take_profit !== null && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Take Profit
                    </div>
                    <div className="font-mono text-emerald-400">
                      {formatPrice(selectedTrade.take_profit)}
                    </div>
                  </div>
                )}
                {selectedTrade.risk_amount !== null && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Risk Amount
                    </div>
                    <div className="font-mono">
                      ${selectedTrade.risk_amount.toFixed(2)}
                    </div>
                  </div>
                )}
                {selectedTrade.session && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Session
                    </div>
                    <div>{selectedTrade.session}</div>
                  </div>
                )}
                {selectedTrade.market_condition && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Market Condition
                    </div>
                    <div>{selectedTrade.market_condition}</div>
                  </div>
                )}
                {selectedTrade.confluence && (
                  <div className="space-y-1 col-span-2">
                    <div className="text-muted-foreground text-xs">
                      Confluence
                    </div>
                    <div>{selectedTrade.confluence}</div>
                  </div>
                )}
                {selectedTrade.execution_rating !== null && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Execution Rating
                    </div>
                    <div>{selectedTrade.execution_rating}/5</div>
                  </div>
                )}
                {selectedTrade.follow_plan !== null && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">
                      Followed Plan
                    </div>
                    <div
                      className={
                        selectedTrade.follow_plan
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }
                    >
                      {selectedTrade.follow_plan ? "Yes" : "No"}
                    </div>
                  </div>
                )}
              </div>

              {selectedTrade.notes && (
                <div className="space-y-2">
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">
                    Notes
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg text-sm text-foreground whitespace-pre-wrap">
                    {selectedTrade.notes}
                  </div>
                </div>
              )}

              {/* Custom Fields */}
              {selectedTrade.custom_fields &&
                Object.keys(selectedTrade.custom_fields).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-muted-foreground text-xs uppercase tracking-wider">
                      Custom Fields
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedTrade.custom_fields).map(
                        ([key, value]) => (
                          <div key={key} className="space-y-1">
                            <div className="text-muted-foreground text-xs">
                              {key}
                            </div>
                            <div className="text-sm">{value || "-"}</div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {selectedTrade.trade_images &&
                selectedTrade.trade_images.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-muted-foreground text-xs uppercase tracking-wider">
                      Screenshots ({selectedTrade.trade_images.length})
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedTrade.trade_images.map((img) => (
                        <div
                          key={img.id}
                          onClick={() => setSelectedImage(img.url)}
                          className="aspect-video rounded-lg border border-border bg-muted overflow-hidden cursor-pointer hover:border-primary transition-all group relative"
                        >
                          <img
                            src={img.url}
                            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                            alt="Trade screenshot"
                          />
                          <div className="absolute bottom-1 left-1">
                            <span className="text-[8px] px-1 py-0.5 bg-background/70 rounded text-muted-foreground uppercase">
                              {img.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Action Buttons in Details Modal */}
              <div className="flex items-center gap-2 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-muted/40 border-border text-foreground hover:bg-muted/70"
                  onClick={() => {
                    handleEditTrade(selectedTrade);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Trade
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                  onClick={() => {
                    setSelectedTrade(null);
                    setTradeToDelete(selectedTrade);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Trade Modal */}
      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelEdit();
        }}
      >
        <DialogContent className="w-[95vw] max-w-2xl bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Pencil className="w-5 h-5 text-blue-400" />
              <span>Edit Trade</span>
              {editingTrade && (
                <Badge
                  className={cn(
                    "text-xs",
                    editingTrade.direction === "LONG"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-rose-500/10 text-rose-400"
                  )}
                >
                  {editingTrade.instrument}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update your trade details below. All fields will be pre-filled with
              your existing data.
            </DialogDescription>
          </DialogHeader>

          {editingTrade && (
            <div className="py-4">
              <TradeForm
                key={editingTrade.id}
                initialData={editingTrade}
                onSuccess={handleFormSuccess}
                onCancel={handleCancelEdit}
                isEditing
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!tradeToDelete}
        onOpenChange={(open) => !open && setTradeToDelete(null)}
      >
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" />
              Delete Trade
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this trade? This action cannot be
              undone.
              {tradeToDelete && (
                <div className="mt-3 p-3 bg-muted/40 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {tradeToDelete.instrument}
                      </span>
                      <Badge
                        className={cn(
                          "text-[10px]",
                          tradeToDelete.direction === "LONG"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        )}
                      >
                        {tradeToDelete.direction}
                      </Badge>
                    </div>
                    <span
                      className={cn(
                        "font-mono font-bold",
                        (tradeToDelete.profit_loss_currency || 0) > 0
                          ? "text-emerald-400"
                          : (tradeToDelete.profit_loss_currency || 0) < 0
                          ? "text-rose-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {tradeToDelete.profit_loss_currency !== null
                        ? `${
                            (tradeToDelete.profit_loss_currency || 0) > 0
                              ? "+"
                              : ""
                          }$${tradeToDelete.profit_loss_currency.toFixed(2)}`
                        : "OPEN"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Opened:{" "}
                    {format(
                      new Date(tradeToDelete.opened_at),
                      "MMM dd, yyyy HH:mm"
                    )}
                  </div>
                  {tradeToDelete.trade_images &&
                    tradeToDelete.trade_images.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {tradeToDelete.trade_images.length} screenshot(s) will
                        also be deleted
                      </div>
                    )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-muted/40 border-border text-foreground hover:bg-muted/70 hover:text-foreground"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrade}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-primary-foreground"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  Deleting...
                </div>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Trade
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Journal;