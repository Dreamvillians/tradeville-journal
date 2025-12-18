import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { AITradePrediction } from "@/components/AITradePrediction";

const tradeSchema = z.object({
  instrument: z.string().min(1, "Instrument is required"),
  direction: z.enum(["LONG", "SHORT"]),
  entry_price: z.string().min(1, "Entry price is required"),
  exit_price: z.string().optional(),
  stop_loss: z.string().optional(),
  take_profit: z.string().optional(),
  position_size: z.string().optional(),
  risk_amount: z.string().optional(),
  reward_amount: z.string().optional(),
  profit_loss_currency: z.string().optional(), // manual override
  opened_at: z.string().min(1, "Entry date/time is required"),
  closed_at: z.string().optional(),
  session: z.string().optional(),
  market_condition: z.string().optional(),
  setup_type: z.string().optional(),
  confluence: z.string().optional(),
  execution_rating: z.string().optional(),
  follow_plan: z.string().optional(),
  notes: z.string().optional(),
});

type TradeFormData = z.infer<typeof tradeSchema>;

interface TradeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const TradeForm = ({ onSuccess, onCancel }: TradeFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [beforeImage, setBeforeImage] = useState<File | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [newFieldName, setNewFieldName] = useState("");
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      direction: "LONG",
      follow_plan: "true",
    },
  });

  const direction = watch("direction");
  const instrument = watch("instrument");
  const entry_price = watch("entry_price");
  const exit_price = watch("exit_price");
  const stop_loss = watch("stop_loss");
  const take_profit = watch("take_profit");
  const position_size = watch("position_size");
  const risk_amount = watch("risk_amount");
  const profit_loss_currency = watch("profit_loss_currency");
  const session = watch("session");
  const market_condition = watch("market_condition");
  const setup_type = watch("setup_type");
  const confluence = watch("confluence");

  // Data sent to AI prediction
  const tradeDataForAI = {
    instrument,
    direction,
    entry_price,
    stop_loss,
    take_profit,
    position_size,
    risk_amount,
    session,
    market_condition,
    setup_type,
    confluence,
  };

  const addCustomField = () => {
    if (newFieldName.trim()) {
      setCustomFields({ ...customFields, [newFieldName]: "" });
      setNewFieldName("");
    }
  };

  const updateCustomField = (key: string, value: string) => {
    setCustomFields({ ...customFields, [key]: value });
  };

  const removeCustomField = (key: string) => {
    const updated = { ...customFields };
    delete updated[key];
    setCustomFields(updated);
  };

  const uploadImage = async (
    file: File,
    tradeId: string,
    type: "BEFORE" | "AFTER"
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${tradeId}-${type.toLowerCase()}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("trade-images")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("trade-images").getPublicUrl(fileName);

    const { error: dbError } = await supabase.from("trade_images").insert({
      trade_id: tradeId,
      user_id: user.id,
      type,
      url: publicUrl,
    });

    if (dbError) throw dbError;
  };

  const onSubmit = async (data: TradeFormData) => {
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const parsedEntry = parseFloat(data.entry_price);
      const parsedExit = data.exit_price ? parseFloat(data.exit_price) : null;
      const parsedSize = data.position_size
        ? parseFloat(data.position_size)
        : null;
      const parsedRisk = data.risk_amount
        ? parseFloat(data.risk_amount)
        : null;

      const hasExitPrice =
        parsedExit !== null && !Number.isNaN(parsedExit as number);

      // If user provided exit price but no closed_at, auto-set closed_at to now
      const closedAtIso =
        data.closed_at && data.closed_at.trim().length > 0
          ? new Date(data.closed_at).toISOString()
          : hasExitPrice
          ? new Date().toISOString()
          : null;

      const tradeData: any = {
        user_id: user.id,
        instrument: data.instrument,
        direction: data.direction,
        entry_price: parsedEntry,
        exit_price: parsedExit,
        stop_loss: data.stop_loss ? parseFloat(data.stop_loss) : null,
        take_profit: data.take_profit ? parseFloat(data.take_profit) : null,
        position_size: parsedSize,
        risk_amount: parsedRisk,
        reward_amount: data.reward_amount
          ? parseFloat(data.reward_amount)
          : null,
        opened_at: new Date(data.opened_at).toISOString(),
        closed_at: closedAtIso,
        session: data.session || null,
        market_condition: data.market_condition || null,
        setup_type: data.setup_type || null,
        confluence: data.confluence || null,
        execution_rating: data.execution_rating
          ? parseInt(data.execution_rating)
          : null,
        follow_plan: data.follow_plan === "true",
        notes: data.notes || null,
        custom_fields: customFields,
        source: "MANUAL" as const,
      };

      // -------------------------------------------------------------
      // P&L CALCULATION
      // -------------------------------------------------------------
      // 1) If user entered P&L manually, trust that value.
      if (
        data.profit_loss_currency &&
        data.profit_loss_currency.trim().length > 0
      ) {
        tradeData.profit_loss_currency = parseFloat(
          data.profit_loss_currency
        );
      }
      // 2) Otherwise, auto-calc if we have an exit_price (trade is closed).
      else if (hasExitPrice && !Number.isNaN(parsedEntry)) {
        const priceDiff =
          data.direction === "LONG"
            ? (parsedExit as number) - parsedEntry
            : parsedEntry - (parsedExit as number);

        const size = parsedSize ?? 1; // default size if missing
        // Generic P&L: price difference * size
        tradeData.profit_loss_currency = priceDiff * size;
      } else {
        // Open trade, or insufficient data → leave P&L null
        tradeData.profit_loss_currency = null;
      }

      // 3) Calculate R-multiple if risk_amount is known and P&L exists (even 0 or negative)
      if (
        tradeData.risk_amount &&
        tradeData.risk_amount > 0 &&
        tradeData.profit_loss_currency !== null
      ) {
        tradeData.profit_loss_r =
          tradeData.profit_loss_currency / tradeData.risk_amount;
      }

      const {
        error,
        data: insertedTrade,
      } = await supabase
        .from("trades")
        .insert(tradeData)
        .select()
        .single();

      if (error) throw error;

      // Upload images if provided
      if (beforeImage && insertedTrade) {
        await uploadImage(beforeImage, insertedTrade.id, "BEFORE");
      }
      if (afterImage && insertedTrade) {
        await uploadImage(afterImage, insertedTrade.id, "AFTER");
      }

      toast({
        title: "Success",
        description: "Trade logged successfully",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error logging trade:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to log trade",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-serif">Log New Trade</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instrument">Instrument *</Label>
              <Input
                id="instrument"
                placeholder="e.g. EURUSD, AAPL, NQ"
                {...register("instrument")}
              />
              {errors.instrument && (
                <p className="text-sm text-destructive">
                  {errors.instrument.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="direction">Direction *</Label>
              <Select
                value={direction}
                onValueChange={(value) =>
                  setValue("direction", value as "LONG" | "SHORT")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LONG">Long</SelectItem>
                  <SelectItem value="SHORT">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_price">Entry Price *</Label>
              <Input
                id="entry_price"
                type="number"
                step="0.00001"
                placeholder="0.00000"
                {...register("entry_price")}
              />
              {errors.entry_price && (
                <p className="text-sm text-destructive">
                  {errors.entry_price.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_price">Exit Price</Label>
              <Input
                id="exit_price"
                type="number"
                step="0.00001"
                placeholder="0.00000"
                {...register("exit_price")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stop_loss">Stop Loss</Label>
              <Input
                id="stop_loss"
                type="number"
                step="0.00001"
                placeholder="0.00000"
                {...register("stop_loss")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="take_profit">Take Profit</Label>
              <Input
                id="take_profit"
                type="number"
                step="0.00001"
                placeholder="0.00000"
                {...register("take_profit")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position_size">Position Size</Label>
              <Input
                id="position_size"
                type="number"
                step="0.01"
                placeholder="Lots/Contracts"
                {...register("position_size")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk_amount">Risk Amount ($)</Label>
              <Input
                id="risk_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("risk_amount")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit_loss_currency">P/L ($)</Label>
              <Input
                id="profit_loss_currency"
                type="number"
                step="0.01"
                placeholder="Leave blank to auto-calc from entry & exit"
                {...register("profit_loss_currency")}
              />
              <p className="text-xs text-muted-foreground">
                If left empty and Exit Price is provided, P/L will be calculated
                automatically based on Entry, Exit, Direction and Position Size.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opened_at">Entry Date/Time *</Label>
              <Input id="opened_at" type="datetime-local" {...register(
                "opened_at"
              )} />
              {errors.opened_at && (
                <p className="text-sm text-destructive">
                  {errors.opened_at.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="closed_at">Exit Date/Time</Label>
              <Input
                id="closed_at"
                type="datetime-local"
                {...register("closed_at")}
              />
              <p className="text-xs text-muted-foreground">
                If left empty but Exit Price is filled, exit time will default
                to now.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session">Session</Label>
              <Input
                id="session"
                placeholder="e.g. London, NY, Asia"
                {...register("session")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="market_condition">Market Condition</Label>
              <Input
                id="market_condition"
                placeholder="e.g. Trending, Ranging"
                {...register("market_condition")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="setup_type">Setup Type</Label>
              <Input
                id="setup_type"
                placeholder="e.g. Breakout, Pullback, Reversal"
                {...register("setup_type")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confluence">Confluence</Label>
              <Input
                id="confluence"
                placeholder="e.g. S/R + MA + Volume"
                {...register("confluence")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="execution_rating">Execution Rating (0-5)</Label>
              <Input
                id="execution_rating"
                type="number"
                min="0"
                max="5"
                {...register("execution_rating")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="follow_plan">Followed Plan?</Label>
              <Select
                defaultValue="true"
                onValueChange={(value) => setValue("follow_plan", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Trade notes, observations, lessons learned..."
              rows={4}
              {...register("notes")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="before_image">Before Screenshot</Label>
              <Input
                id="before_image"
                type="file"
                accept="image/*"
                onChange={(e) => setBeforeImage(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Upload chart screenshot before trade entry
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="after_image">After Screenshot</Label>
              <Input
                id="after_image"
                type="file"
                accept="image/*"
                onChange={(e) => setAfterImage(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Upload chart screenshot after trade exit
              </p>
            </div>
          </div>

          {/* Custom strategy fields */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label>Custom Strategy Fields</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Field name"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="w-40"
                />
                <Button
                  type="button"
                  onClick={addCustomField}
                  size="sm"
                  variant="outline"
                >
                  Add Field
                </Button>
              </div>
            </div>
            {Object.keys(customFields).length > 0 && (
              <div className="space-y-2">
                {Object.entries(customFields).map(([key, value]) => (
                  <div key={key} className="flex gap-2 items-center">
                    <Label className="w-32 text-sm">{key}</Label>
                    <Input
                      value={value}
                      onChange={(e) => updateCustomField(key, e.target.value)}
                      placeholder={`Enter ${key}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => removeCustomField(key)}
                      size="sm"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Analysis */}
          <AITradePrediction tradeData={tradeDataForAI} />

          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Trade"
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};