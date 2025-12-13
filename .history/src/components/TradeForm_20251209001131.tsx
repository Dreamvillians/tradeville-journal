import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Save, 
  X, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Trash2,
  ImagePlus,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AITradePrediction } from "@/components/AITradePrediction";

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
  trade_images?: TradeImage[];
}

interface TradeFormProps {
  initialData?: Trade;
  isEditing?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// -------------------------------------------------------------------------------------
// Schema
// -------------------------------------------------------------------------------------

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

// -------------------------------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------------------------------

const formatDateTimeLocal = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return format(date, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
};

const parseNumber = (value: string | undefined): number | null => {
  if (!value || value.trim() === "") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

// -------------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------------

export const TradeForm = ({ 
  initialData, 
  isEditing = false, 
  onSuccess, 
  onCancel 
}: TradeFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [beforeImage, setBeforeImage] = useState<File | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [newFieldName, setNewFieldName] = useState("");
  const [existingImages, setExistingImages] = useState<TradeImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const { toast } = useToast();

  // Prepare default values based on whether we're editing
  const getDefaultValues = (): TradeFormData => {
    if (initialData) {
      return {
        instrument: initialData.instrument || "",
        direction: initialData.direction || "LONG",
        entry_price: initialData.entry_price?.toString() || "",
        exit_price: initialData.exit_price?.toString() || "",
        stop_loss: initialData.stop_loss?.toString() || "",
        take_profit: initialData.take_profit?.toString() || "",
        position_size: initialData.position_size?.toString() || "",
        risk_amount: initialData.risk_amount?.toString() || "",
        reward_amount: initialData.reward_amount?.toString() || "",
        opened_at: formatDateTimeLocal(initialData.opened_at),
        closed_at: formatDateTimeLocal(initialData.closed_at),
        session: initialData.session || "",
        market_condition: initialData.market_condition || "",
        setup_type: initialData.setup_type || "",
        confluence: initialData.confluence || "",
        execution_rating: initialData.execution_rating?.toString() || "",
        follow_plan: initialData.follow_plan !== null ? String(initialData.follow_plan) : "true",
        notes: initialData.notes || "",
      };
    }
    return {
      instrument: "",
      direction: "LONG",
      entry_price: "",
      exit_price: "",
      stop_loss: "",
      take_profit: "",
      position_size: "",
      risk_amount: "",
      reward_amount: "",
      opened_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      closed_at: "",
      session: "",
      market_condition: "",
      setup_type: "",
      confluence: "",
      execution_rating: "",
      follow_plan: "true",
      notes: "",
    };
  };

  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    setValue, 
    watch,
    reset,
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when initialData changes (for editing different trades)
  useEffect(() => {
    if (initialData) {
      reset(getDefaultValues());
      setCustomFields(initialData.custom_fields || {});
      setExistingImages(initialData.trade_images || []);
      setImagesToDelete([]);
      setBeforeImage(null);
      setAfterImage(null);
    }
  }, [initialData, reset]);

  // Watch all fields needed for AI prediction
  const direction = watch("direction");
  const instrument = watch("instrument");
  const entry_price = watch("entry_price");
  const stop_loss = watch("stop_loss");
  const take_profit = watch("take_profit");
  const position_size = watch("position_size");
  const risk_amount = watch("risk_amount");
  const session = watch("session");
  const market_condition = watch("market_condition");
  const setup_type = watch("setup_type");
  const confluence = watch("confluence");

  // Prepare trade data for AI prediction component
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

  const handleRemoveExistingImage = (imageId: string) => {
    setImagesToDelete((prev) => [...prev, imageId]);
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const uploadImage = async (file: File, tradeId: string, type: "BEFORE" | "AFTER") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${tradeId}-${type.toLowerCase()}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('trade-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('trade-images')
      .getPublicUrl(fileName);

    // Save to trade_images table
    const { error: dbError } = await supabase.from('trade_images').insert({
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const tradeData: any = {
        user_id: user.id,
        instrument: data.instrument.toUpperCase().trim(),
        direction: data.direction,
        entry_price: parseNumber(data.entry_price),
        exit_price: parseNumber(data.exit_price),
        stop_loss: parseNumber(data.stop_loss),
        take_profit: parseNumber(data.take_profit),
        position_size: parseNumber(data.position_size),
        risk_amount: parseNumber(data.risk_amount),
        reward_amount: parseNumber(data.reward_amount),
        opened_at: new Date(data.opened_at).toISOString(),
        closed_at: data.closed_at ? new Date(data.closed_at).toISOString() : null,
        session: data.session?.trim() || null,
        market_condition: data.market_condition?.trim() || null,
        setup_type: data.setup_type?.trim() || null,
        confluence: data.confluence?.trim() || null,
        execution_rating: data.execution_rating ? parseInt(data.execution_rating) : null,
        follow_plan: data.follow_plan === "true",
        notes: data.notes?.trim() || null,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
        source: "MANUAL" as const,
      };

      // Calculate P/L if exit price is provided
      if (tradeData.exit_price && tradeData.entry_price) {
        const priceDiff = tradeData.direction === "LONG" 
          ? tradeData.exit_price - tradeData.entry_price
          : tradeData.entry_price - tradeData.exit_price;
        
        if (tradeData.position_size) {
          tradeData.profit_loss_currency = priceDiff * tradeData.position_size;
        }

        // Calculate R if risk amount is known
        if (tradeData.risk_amount && tradeData.risk_amount > 0 && tradeData.profit_loss_currency) {
          tradeData.profit_loss_r = tradeData.profit_loss_currency / tradeData.risk_amount;
        }
      }

      let tradeId: string;

      if (isEditing && initialData) {
        // UPDATE existing trade
        const { error } = await supabase
          .from("trades")
          .update(tradeData)
          .eq("id", initialData.id);

        if (error) throw error;
        tradeId = initialData.id;

        // Delete removed images
        if (imagesToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from("trade_images")
            .delete()
            .in("id", imagesToDelete);

          if (deleteError) {
            console.error("Error deleting images:", deleteError);
          }
        }
      } else {
        // INSERT new trade
        const { error, data: insertedTrade } = await supabase
          .from("trades")
          .insert(tradeData)
          .select()
          .single();

        if (error) throw error;
        tradeId = insertedTrade.id;
      }

      // Upload new images if provided
      if (beforeImage) {
        await uploadImage(beforeImage, tradeId, "BEFORE");
      }
      if (afterImage) {
        await uploadImage(afterImage, tradeId, "AFTER");
      }

      toast({
        title: "Success",
        description: isEditing ? "Trade updated successfully" : "Trade logged successfully",
        className: "bg-emerald-500 border-none text-white",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error saving trade:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${isEditing ? "update" : "log"} trade`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get existing before/after images
  const existingBeforeImage = existingImages.find(img => img.type === "BEFORE");
  const existingAfterImage = existingImages.find(img => img.type === "AFTER");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Direction Toggle */}
      <div className="space-y-2">
        <Label className="text-gray-400 text-xs uppercase tracking-wider">
          Direction *
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue("direction", "LONG")}
            className={cn(
              "flex items-center justify-center gap-2 py-3 rounded-xl border transition-all font-semibold",
              direction === "LONG"
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
            )}
          >
            <TrendingUp className="w-4 h-4" />
            LONG
          </button>
          <button
            type="button"
            onClick={() => setValue("direction", "SHORT")}
            className={cn(
              "flex items-center justify-center gap-2 py-3 rounded-xl border transition-all font-semibold",
              direction === "SHORT"
                ? "bg-rose-500/20 border-rose-500/50 text-rose-400"
                : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
            )}
          >
            <TrendingDown className="w-4 h-4" />
            SHORT
          </button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="instrument" className="text-gray-400 text-xs uppercase tracking-wider">
            Instrument *
          </Label>
          <Input
            id="instrument"
            placeholder="e.g. EURUSD, AAPL, NQ"
            {...register("instrument")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
          />
          {errors.instrument && (
            <p className="text-sm text-rose-400">{errors.instrument.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="setup_type" className="text-gray-400 text-xs uppercase tracking-wider">
            Setup Type
          </Label>
          <Input
            id="setup_type"
            placeholder="e.g. Breakout, Pullback, Reversal"
            {...register("setup_type")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Entry & Exit Prices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="entry_price" className="text-gray-400 text-xs uppercase tracking-wider">
            Entry Price *
          </Label>
          <Input
            id="entry_price"
            type="number"
            step="0.00001"
            placeholder="0.00000"
            {...register("entry_price")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50 font-mono"
          />
          {errors.entry_price && (
            <p className="text-sm text-rose-400">{errors.entry_price.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="exit_price" className="text-gray-400 text-xs uppercase tracking-wider">
            Exit Price
          </Label>
          <Input
            id="exit_price"
            type="number"
            step="0.00001"
            placeholder="0.00000 (leave empty if open)"
            {...register("exit_price")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50 font-mono"
          />
        </div>
      </div>

      {/* Stop Loss & Take Profit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stop_loss" className="text-gray-400 text-xs uppercase tracking-wider">
            Stop Loss
          </Label>
          <Input
            id="stop_loss"
            type="number"
            step="0.00001"
            placeholder="0.00000"
            {...register("stop_loss")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-rose-500/50 font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="take_profit" className="text-gray-400 text-xs uppercase tracking-wider">
            Take Profit
          </Label>
          <Input
            id="take_profit"
            type="number"
            step="0.00001"
            placeholder="0.00000"
            {...register("take_profit")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50 font-mono"
          />
        </div>
      </div>

      {/* Position Size & Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="position_size" className="text-gray-400 text-xs uppercase tracking-wider">
            Position Size
          </Label>
          <Input
            id="position_size"
            type="number"
            step="0.01"
            placeholder="Lots/Contracts"
            {...register("position_size")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50 font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="risk_amount" className="text-gray-400 text-xs uppercase tracking-wider">
            Risk Amount ($)
          </Label>
          <Input
            id="risk_amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("risk_amount")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50 font-mono"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="opened_at" className="text-gray-400 text-xs uppercase tracking-wider">
            Entry Date/Time *
          </Label>
          <Input
            id="opened_at"
            type="datetime-local"
            {...register("opened_at")}
            className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50 [color-scheme:dark]"
          />
          {errors.opened_at && (
            <p className="text-sm text-rose-400">{errors.opened_at.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="closed_at" className="text-gray-400 text-xs uppercase tracking-wider">
            Exit Date/Time
          </Label>
          <Input
            id="closed_at"
            type="datetime-local"
            {...register("closed_at")}
            className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Session & Market Condition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="session" className="text-gray-400 text-xs uppercase tracking-wider">
            Session
          </Label>
          <Input
            id="session"
            placeholder="e.g. London, NY, Asia"
            {...register("session")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="market_condition" className="text-gray-400 text-xs uppercase tracking-wider">
            Market Condition
          </Label>
          <Input
            id="market_condition"
            placeholder="e.g. Trending, Ranging"
            {...register("market_condition")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Confluence & Execution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="confluence" className="text-gray-400 text-xs uppercase tracking-wider">
            Confluence
          </Label>
          <Input
            id="confluence"
            placeholder="e.g. Support/Resistance + MA + Volume"
            {...register("confluence")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="execution_rating" className="text-gray-400 text-xs uppercase tracking-wider">
            Execution Rating (0-5)
          </Label>
          <Input
            id="execution_rating"
            type="number"
            min="0"
            max="5"
            {...register("execution_rating")}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Follow Plan */}
      <div className="space-y-2">
        <Label htmlFor="follow_plan" className="text-gray-400 text-xs uppercase tracking-wider">
          Followed Trading Plan?
        </Label>
        <Select
          value={watch("follow_plan")}
          onValueChange={(value) => setValue("follow_plan", value)}
        >
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1b23] border-white/10">
            <SelectItem value="true" className="text-white">Yes</SelectItem>
            <SelectItem value="false" className="text-white">No</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-gray-400 text-xs uppercase tracking-wider">
          Notes
        </Label>
        <Textarea
          id="notes"
          placeholder="Trade notes, observations, lessons learned..."
          rows={4}
          {...register("notes")}
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50 resize-none"
        />
      </div>

      {/* Existing Images (only shown when editing) */}
      {isEditing && existingImages.length > 0 && (
        <div className="space-y-3">
          <Label className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-1">
            <ImagePlus className="w-3 h-3" />
            Existing Screenshots
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {existingImages.map((img) => (
              <div key={img.id} className="relative group">
                <div className="aspect-video rounded-lg border border-white/10 bg-black overflow-hidden">
                  <img
                    src={img.url}
                    className="w-full h-full object-cover"
                    alt={`Trade screenshot - ${img.type}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveExistingImage(img.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
                <div className="absolute bottom-1 left-1">
                  <span className="text-[9px] px-1.5 py-0.5 bg-black/70 rounded text-gray-300 uppercase">
                    {img.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {imagesToDelete.length > 0 && (
            <p className="text-xs text-rose-400">
              {imagesToDelete.length} image(s) will be removed when you save
            </p>
          )}
        </div>
      )}

      {/* Image Upload - Using standard input to prevent unintended form submission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="before_image" className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-3 h-3" />
            {isEditing && existingBeforeImage ? "Replace Before Screenshot" : "Before Screenshot"}
          </Label>
          <input
            id="before_image"
            type="file"
            accept="image/*"
            onChange={(e) => setBeforeImage(e.target.files?.[0] || null)}
            className="flex h-10 w-full rounded-md border px-3 py-2 text-sm bg-white/5 border-white/10 text-white file:bg-white/10 file:border-0 file:text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {beforeImage && (
            <p className="text-xs text-emerald-400">New image selected: {beforeImage.name}</p>
          )}
          <p className="text-xs text-gray-500">Chart screenshot before trade entry</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="after_image" className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-3 h-3" />
            {isEditing && existingAfterImage ? "Replace After Screenshot" : "After Screenshot"}
          </Label>
          <input
            id="after_image"
            type="file"
            accept="image/*"
            onChange={(e) => setAfterImage(e.target.files?.[0] || null)}
            className="flex h-10 w-full rounded-md border px-3 py-2 text-sm bg-white/5 border-white/10 text-white file:bg-white/10 file:border-0 file:text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {afterImage && (
            <p className="text-xs text-emerald-400">New image selected: {afterImage.name}</p>
          )}
          <p className="text-xs text-gray-500">Chart screenshot after trade exit</p>
        </div>
      </div>

      {/* Custom Strategy Fields */}
      <div className="space-y-3 pt-4 border-t border-white/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Label className="text-gray-400 text-xs uppercase tracking-wider">
            Custom Strategy Fields
          </Label>
          <div className="flex gap-2 w-full sm:w-auto">
            <Input
              placeholder="Field name"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomField();
                }
              }}
              className="flex-1 sm:w-40 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
            />
            <Button 
              type="button" 
              onClick={addCustomField} 
              size="sm" 
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
        {Object.keys(customFields).length > 0 && (
          <div className="space-y-2">
            {Object.entries(customFields).map(([key, value]) => (
              <div key={key} className="flex gap-2 items-center">
                <Label className="w-32 text-sm text-gray-400 truncate">{key}</Label>
                <Input
                  value={value}
                  onChange={(e) => updateCustomField(key, e.target.value)}
                  placeholder={`Enter ${key}`}
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                />
                <Button
                  type="button"
                  onClick={() => removeCustomField(key)}
                  size="sm"
                  variant="ghost"
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Trade Prediction Component */}
      <AITradePrediction tradeData={tradeDataForAI} />

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEditing ? "Updating..." : "Saving..."}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? "Update Trade" : "Save Trade"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};