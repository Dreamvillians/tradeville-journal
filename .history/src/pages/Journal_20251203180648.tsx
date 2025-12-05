import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  Filter,
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

type StatusFilter = "ALL" | "OPEN" | "CLOSED";
type DirectionFilter = "ALL" | "LONG" | "SHORT";

const Journal = () => {
  const [showForm, setShowForm] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [directionFilter, setDirectionFilter] =
    useState<DirectionFilter>("ALL");
  const [search, setSearch] = useState("");

  const { toast } = useToast();

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchTrades = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trades")
        .select(
          `
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
        `
        )
        .eq("user_id", user.id)
        .order("opened_at", { ascending: false });

      if (error) throw error;
      setTrades((data || []) as Trade[]);
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

  // ---------------------------------------------------------------------------
  // Derived metrics & filters
  // ---------------------------------------------------------------------------

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (statusFilter === "OPEN" && trade.closed_at) return false;
      if (statusFilter === "CLOSED" && !trade.closed_at) return false;

      if (
        directionFilter !== "ALL" &&
        trade.direction !== directionFilter
      ) {
        return false;
      }

      if (search.trim()) {
        const term = search.toLowerCase();
        if (
          !trade.instrument.toLowerCase().includes(term) &&
          !(trade.setup_type || "").toLowerCase().includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [trades, statusFilter, directionFilter, search]);

  const metrics = useMemo(() => {
    const total = trades.length;
    const closed = trades.filter((t) => t.closed_at).length;
    const open = total - closed;

    const pnlValues = trades
      .map((t) => t.profit_loss_currency)
      .filter((v): v is number => typeof v === "number");

    const netPnL = pnlValues.reduce((sum, v) => sum + v, 0);
    const wins = pnlValues.filter((p) => p > 0).length;
    const losses = pnlValues.filter((p) => p < 0).length;
    const winRate = closed > 0 ? (wins / closed) * 100 : 0;

    return { total, open, closed, netPnL, wins, losses, winRate };
  }, [trades]);

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-1">
            Trade Journal
          </h1>
          <p className="text-muted-foreground text-sm">
            Capture every trade, review performance, and refine your edge.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex"
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button className="gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            New Trade
          </Button>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30">
          <CardContent className="py-3 px-4">
            <p className="text-[11px] uppercase tracking-wide text-emerald-300/80">
              Net P&amp;L
            </p>
            <p
              className={`mt-1 text-xl font-semibold ${
                metrics.netPnL >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {metrics.netPnL >= 0 ? "+" : ""}
              ${metrics.netPnL.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-500/10 to-sky-500/5 border-sky-500/30">
          <CardContent className="py-3 px-4">
            <p className="text-[11px] uppercase tracking-wide text-sky-300/80">
              Win Rate
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-sky-300" />
              <p className="text-xl font-semibold text-white">
                {metrics.winRate.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-500/10 to-zinc-800/40 border-border">
          <CardContent className="py-3 px-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-300/80">
              Open Trades
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              {metrics.open}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-500/10 to-zinc-800/40 border-border">
          <CardContent className="py-3 px-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-300/80">
              Closed Trades
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              {metrics.closed}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card/60 backdrop-blur">
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.14em]">
              Status
            </span>
            <div className="flex rounded-full bg-muted/40 p-1 gap-1">
              {(["ALL", "OPEN", "CLOSED"] as StatusFilter[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      statusFilter === s
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {s === "ALL" ? "All" : s === "OPEN" ? "Open" : "Closed"}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.14em]">
              Direction
            </span>
            <div className="flex rounded-full bg-muted/40 p-1 gap-1">
              {(["ALL", "LONG", "SHORT"] as DirectionFilter[]).map(
                (d) => (
                  <button
                    key={d}
                    onClick={() => setDirectionFilter(d)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      directionFilter === d
                        ? d === "LONG"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : d === "SHORT"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-emerald-500/20 text-emerald-300"
                        : "text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {d === "ALL" ? "All" : d}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="w-full md:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by symbol or setup..."
              className="w-full rounded-lg border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <TradeForm
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Trades table */}
      <Card className="border-border bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg font-serif">
            Trades ({filteredTrades.length}
            {search ? " filtered" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Loading trades…
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No trades logged yet</p>
              <p className="text-sm">
                Click <span className="font-medium">“New Trade”</span> to
                add your first entry.
              </p>
            </div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No trades match your current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Instrument</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Setup</TableHead>
                    <TableHead className="text-center">
                      Screenshots
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.map((trade) => {
                    const beforeImage = trade.trade_images?.find(
                      (img) => img.type === "BEFORE"
                    );
                    const afterImage = trade.trade_images?.find(
                      (img) => img.type === "AFTER"
                    );

                    const pnl = trade.profit_loss_currency;
                    const isWin = pnl !== null && pnl > 0;
                    const isLoss = pnl !== null && pnl < 0;

                    return (
                      <TableRow key={trade.id}>
                        <TableCell>
                          <Badge
                            variant={
                              trade.closed_at ? "secondary" : "default"
                            }
                          >
                            {trade.closed_at ? "Closed" : "Open"}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              trade.direction === "LONG"
                                ? "border-emerald-500/50 text-emerald-400"
                                : "border-rose-500/50 text-rose-400"
                            }
                          >
                            {trade.direction}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-medium">
                          {trade.instrument}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-xs">
                          {format(
                            new Date(trade.opened_at),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </TableCell>

                        <TableCell className="font-mono text-xs">
                          {trade.entry_price.toFixed(5)}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-xs">
                          {trade.closed_at
                            ? format(
                                new Date(trade.closed_at),
                                "MMM dd, yyyy HH:mm"
                              )
                            : "-"}
                        </TableCell>

                        <TableCell className="font-mono text-xs">
                          {trade.exit_price
                            ? trade.exit_price.toFixed(5)
                            : "-"}
                        </TableCell>

                        <TableCell className="text-xs">
                          {trade.position_size ?? "-"}
                        </TableCell>

                        <TableCell className="text-xs">
                          {pnl !== null ? (
                            <span
                              className={`font-semibold ${
                                isWin
                                  ? "text-emerald-400"
                                  : isLoss
                                  ? "text-rose-400"
                                  : "text-gray-100"
                              }`}
                            >
                              {pnl >= 0 ? "+" : "-"}$
                              {Math.abs(pnl).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs">
                          {trade.setup_type || "-"}
                        </TableCell>

                        <TableCell className="text-center">
                          {beforeImage || afterImage ? (
                            <div className="inline-flex items-center gap-1">
                              {beforeImage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedImage(beforeImage.url)
                                  }
                                  className="relative group"
                                >
                                  <img
                                    src={beforeImage.url}
                                    alt="Before"
                                    className="w-8 h-8 object-cover rounded border border-border hover:border-emerald-500/70 transition-colors"
                                  />
                                </button>
                              )}
                              {afterImage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedImage(afterImage.url)
                                  }
                                  className="relative group"
                                >
                                  <img
                                    src={afterImage.url}
                                    alt="After"
                                    className="w-8 h-8 object-cover rounded border border-border hover:border-emerald-500/70 transition-colors"
                                  />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                              <ImageIcon className="h-3.5 w-3.5" />
                              None
                            </span>
                          )}
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

      {/* Screenshot dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Trade Screenshot</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Trade screenshot"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Journal;