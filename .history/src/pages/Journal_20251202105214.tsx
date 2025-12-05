import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Image as ImageIcon } from "lucide-react";
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

const Journal = () => {
  const [showForm, setShowForm] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold mb-2">Trade Journal</h1>
          <p className="text-muted-foreground">Log and track all your trades</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          New Trade
        </Button>
      </div>

      {showForm && (
        <TradeForm onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-serif">All Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Loading trades...</p>
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No trades logged yet</p>
              <p className="text-sm">Click "New Trade" to add your first entry</p>
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
                    <TableHead>Screenshots</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => {
                    const beforeImage = trade.trade_images?.find(img => img.type === "BEFORE");
                    const afterImage = trade.trade_images?.find(img => img.type === "AFTER");
                    const isWin = trade.profit_loss_currency !== null && trade.profit_loss_currency > 0;
                    const isLoss = trade.profit_loss_currency !== null && trade.profit_loss_currency < 0;
                    
                    return (
                      <TableRow key={trade.id}>
                        <TableCell>
                          <Badge variant={trade.closed_at ? "secondary" : "default"}>
                            {trade.closed_at ? "Closed" : "Open"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={trade.direction === "LONG" 
                              ? "border-emerald-500/50 text-emerald-500" 
                              : "border-rose-500/50 text-rose-500"
                            }
                          >
                            {trade.direction}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{trade.instrument}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(trade.opened_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {trade.entry_price.toFixed(5)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {trade.closed_at ? format(new Date(trade.closed_at), "MMM dd, yyyy HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {trade.exit_price ? trade.exit_price.toFixed(5) : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {trade.position_size ? trade.position_size.toString() : "-"}
                        </TableCell>
                        <TableCell>
                          {trade.profit_loss_currency !== null ? (
                            <span className={`font-semibold ${isWin ? "text-emerald-500" : isLoss ? "text-rose-500" : ""}`}>
                              {trade.profit_loss_currency >= 0 ? "+" : ""}${trade.profit_loss_currency.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {trade.setup_type || "-"}
                        </TableCell>
                        <TableCell>
                          {(beforeImage || afterImage) && (
                            <div className="flex items-center gap-1">
                              {beforeImage && (
                                <button
                                  onClick={() => setSelectedImage(beforeImage.url)}
                                  className="relative group"
                                >
                                  <img 
                                    src={beforeImage.url} 
                                    alt="Before" 
                                    className="w-8 h-8 object-cover rounded border border-border hover:border-primary transition-colors"
                                  />
                                </button>
                              )}
                              {afterImage && (
                                <button
                                  onClick={() => setSelectedImage(afterImage.url)}
                                  className="relative group"
                                >
                                  <img 
                                    src={afterImage.url} 
                                    alt="After" 
                                    className="w-8 h-8 object-cover rounded border border-border hover:border-primary transition-colors"
                                  />
                                </button>
                              )}
                            </div>
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

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
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
