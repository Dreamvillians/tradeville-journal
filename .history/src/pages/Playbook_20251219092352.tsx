import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Calendar as CalendarIcon,
  Upload,
  X,
  Trash2,
  Image as ImageIcon,
  BookOpen,
  Layers,
  TrendingUp,
  FileText,
} from "lucide-react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type RuleGroups = Record<string, string[]>;

const defaultRuleGroups: RuleGroups = {
  "Entry Criteria": [],
  "Exit Criteria": [],
  Risk: [],
  Notes: [],
};

const createEmptyRuleGroups = (): RuleGroups => ({
  "Entry Criteria": [],
  "Exit Criteria": [],
  Risk: [],
  Notes: [],
});

type ViewMode = "gallery" | "table" | "calendar";

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  checklist: RuleGroups | null;
  created_at: string;
  user_id: string;
}

const formatSupabaseError = (err: unknown): string => {
  if (!err) return "Unknown error";
  if (typeof err === "object" && err !== null) {
    const anyErr = err as any;
    const msg =
      anyErr.message ||
      anyErr.error_description ||
      anyErr.error ||
      anyErr.details;
    if (msg) return String(msg);
    try {
      return JSON.stringify(anyErr);
    } catch {
      return "Unexpected error";
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
};

// Stat Card Component
const StatCard = ({
  title,
  value,
  icon: Icon,
  color = "emerald",
}: {
  title: string;
  value: string | number;
  icon: typeof BookOpen;
  color?: "emerald" | "blue" | "purple" | "orange";
}) => {
  const colorClasses = {
    emerald: {
      bg: "from-emerald-500/20 to-emerald-600/10",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/20",
    },
    blue: {
      bg: "from-blue-500/20 to-blue-600/10",
      text: "text-blue-400",
      glow: "shadow-blue-500/20",
    },
    purple: {
      bg: "from-purple-500/20 to-purple-600/10",
      text: "text-purple-400",
      glow: "shadow-purple-500/20",
    },
    orange: {
      bg: "from-orange-500/20 to-orange-600/10",
      text: "text-orange-400",
      glow: "shadow-orange-500/20",
    },
  };

  const colors = colorClasses[color];

  return (
    <Card className="relative overflow-hidden border-border bg-card/90 backdrop-blur-xl">
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
          colors.bg
        )}
      />
      <CardContent className="relative z-10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div
            className={cn(
              "p-3 rounded-xl bg-gradient-to-br shadow-lg",
              colors.bg,
              colors.glow
            )}
          >
            {/* Icon on gradient can stay colored */}
            <Icon className={cn("w-5 h-5", colors.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Playbook = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [ruleGroups, setRuleGroups] = useState<RuleGroups>(() =>
    createEmptyRuleGroups()
  );
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const queryClient = useQueryClient();

  // Fetch strategies
  const { data: strategies = [], isLoading } = useQuery<Strategy[]>({
    queryKey: ["strategies"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("strategies")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Strategy[];
    },
  });

  // Image upload helper
  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("goal-habit-images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("goal-habit-images").getPublicUrl(filePath);

    return publicUrl;
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description: string;
      ruleGroups: RuleGroups;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { data, error } = await supabase
        .from("strategies")
        .insert({
          name: payload.name,
          description: payload.description,
          image_url: imageUrl,
          checklist: payload.ruleGroups,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Strategy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      toast.success("Playbook created successfully");
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to create playbook: " + formatSupabaseError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description: string;
      ruleGroups: RuleGroups;
    }) => {
      if (!editingStrategy) {
        throw new Error("No strategy selected");
      }

      let imageUrl = editingStrategy.image_url || "";

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { data, error } = await supabase
        .from("strategies")
        .update({
          name: payload.name,
          description: payload.description,
          image_url: imageUrl,
          checklist: payload.ruleGroups,
        })
        .eq("id", editingStrategy.id)
        .select()
        .single();

      if (error) throw error;
      return data as Strategy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      toast.success("Playbook updated successfully");
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to update playbook: " + formatSupabaseError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("strategies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      toast.success("Playbook deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete playbook: " + formatSupabaseError(error));
    },
  });

  // Form helpers
  const resetForm = () => {
    setName("");
    setDescription("");
    setImageFile(null);
    setImagePreview("");
    setRuleGroups(createEmptyRuleGroups());
    setEditingStrategy(null);
    setNewGroupName("");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addRuleToGroup = (groupName: string) => {
    setRuleGroups((prev) => ({
      ...prev,
      [groupName]: [...(prev[groupName] || []), ""],
    }));
  };

  const updateRule = (groupName: string, index: number, value: string) => {
    setRuleGroups((prev) => ({
      ...prev,
      [groupName]: prev[groupName].map((rule, i) =>
        i === index ? value : rule
      ),
    }));
  };

  const removeRule = (groupName: string, index: number) => {
    setRuleGroups((prev) => ({
      ...prev,
      [groupName]: prev[groupName].filter((_, i) => i !== index),
    }));
  };

  const addCustomGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    if (ruleGroups[trimmed]) {
      toast.error("Group already exists");
      return;
    }
    setRuleGroups((prev) => ({
      ...prev,
      [trimmed]: [],
    }));
    setNewGroupName("");
  };

  const removeGroup = (groupName: string) => {
    if (defaultRuleGroups[groupName as keyof RuleGroups]) {
      toast.error("Default groups cannot be removed");
      return;
    }
    setRuleGroups((prev) => {
      const next = { ...prev };
      delete next[groupName];
      return next;
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Please enter a playbook name");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      ruleGroups,
    };

    if (editingStrategy) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEditDialog = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setName(strategy.name);
    setDescription(strategy.description ?? "");
    setImagePreview(strategy.image_url ?? "");
    setImageFile(null);
    setRuleGroups(strategy.checklist || createEmptyRuleGroups());
    setIsCreateOpen(true);
  };

  const getStrategiesForDate = (date: Date) => {
    return strategies.filter((s) => {
      const createdDate = new Date(s.created_at);
      return format(createdDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });
  };

  const ruleGroupKeys = Object.keys(ruleGroups);
  const firstGroup = ruleGroupKeys.length > 0 ? ruleGroupKeys[0] : undefined;

  // Stats
  const stats = useMemo(() => {
    const count = strategies.length;
    const totalGroups = strategies.reduce(
      (sum, s) => sum + (s.checklist ? Object.keys(s.checklist).length : 0),
      0
    );
    const avgGroups = count > 0 ? totalGroups / count : 0;
    const withImage = strategies.filter((s) => !!s.image_url).length;
    return { count, totalGroups, avgGroups, withImage };
  }, [strategies]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Playbook</h1>
              <p className="text-sm text-muted-foreground">
                Manage and refine your trading strategies
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-muted/40 rounded-lg p-1 border border-border">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "px-3 transition-all",
                  viewMode === "gallery"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode("gallery")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "px-3 transition-all",
                  viewMode === "table"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode("table")}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "px-3 transition-all",
                  viewMode === "calendar"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode("calendar")}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Create Button */}
            <Dialog
              open={isCreateOpen}
              onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 text-primary-foreground">
                  <Plus className="h-4 w-4" />
                  New Playbook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
                <DialogHeader>
                  <DialogTitle>
                    {editingStrategy ? "Edit Playbook" : "Create Playbook"}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Define your trading strategy with rules and criteria.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Playbook Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Morning Breakout Strategy"
                      className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your strategy..."
                      rows={3}
                      className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Thumbnail */}
                  <div className="space-y-2">
                    <Label htmlFor="image">Thumbnail / Icon</Label>
                    <div className="flex items-center gap-4">
                      {imagePreview ? (
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-border">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview("");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/40">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <Label htmlFor="image-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-muted/60 text-foreground rounded-lg hover:bg-muted transition-colors">
                          <Upload className="h-4 w-4" />
                          Upload Image
                        </div>
                        <Input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </Label>
                    </div>
                  </div>

                  {/* Rule Groups */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <Label className="text-lg">Rule Groups</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Custom group name"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="w-48 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground"
                        />
                        <Button
                          onClick={addCustomGroup}
                          size="sm"
                          variant="outline"
                          className="border-border text-foreground hover:bg-muted/60"
                        >
                          Add Group
                        </Button>
                      </div>
                    </div>

                    {firstGroup && (
                      <Tabs defaultValue={firstGroup} className="w-full">
                        <TabsList className="w-full flex-wrap h-auto bg-muted/40 border border-border">
                          {ruleGroupKeys.map((groupName) => (
                            <TabsTrigger
                              key={groupName}
                              value={groupName}
                              className="relative data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                            >
                              {groupName}
                              {!Object.prototype.hasOwnProperty.call(
                                defaultRuleGroups,
                                groupName
                              ) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 ml-1 hover:bg-red-500/20 text-muted-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeGroup(groupName);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {Object.entries(ruleGroups).map(([groupName, rules]) => (
                          <TabsContent
                            key={groupName}
                            value={groupName}
                            className="space-y-3 mt-4"
                          >
                            {rules.map((rule, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  value={rule}
                                  onChange={(e) =>
                                    updateRule(groupName, index, e.target.value)
                                  }
                                  placeholder={`Add ${groupName.toLowerCase()} rule...`}
                                  className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeRule(groupName, index)}
                                  className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addRuleToGroup(groupName)}
                              className="w-full border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Rule
                            </Button>
                          </TabsContent>
                        ))}
                      </Tabs>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateOpen(false);
                        resetForm();
                      }}
                      className="border-border text-muted-foreground hover:bg-muted/60"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-primary-foreground"
                    >
                      {editingStrategy ? "Update" : "Create"} Playbook
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Playbooks"
            value={stats.count}
            icon={BookOpen}
            color="emerald"
          />
          <StatCard
            title="Total Rule Groups"
            value={stats.totalGroups}
            icon={Layers}
            color="blue"
          />
          <StatCard
            title="Avg Groups / Playbook"
            value={stats.avgGroups.toFixed(1)}
            icon={TrendingUp}
            color="purple"
          />
          <StatCard
            title="With Thumbnail"
            value={stats.withImage}
            icon={FileText}
            color="orange"
          />
        </div>

        {/* Gallery View */}
        {viewMode === "gallery" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <Card className="border-border bg-card/90 col-span-full">
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Loading playbooks…
                  </div>
                </CardContent>
              </Card>
            ) : strategies.length === 0 ? (
              <Card className="border-border bg-card/90 col-span-full">
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg mb-2 text-foreground">
                      No playbooks yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Create your first trading playbook to get started.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              strategies.map((strategy) => (
                <Card
                  key={strategy.id}
                  className="border-border bg-card/90 hover:border-emerald-500/50 transition-all cursor-pointer group overflow-hidden"
                  onClick={() => openEditDialog(strategy)}
                >
                  {strategy.image_url ? (
                    <div className="w-full h-48 overflow-hidden">
                      <img
                        src={strategy.image_url}
                        alt={strategy.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold group-hover:text-emerald-400 transition-colors">
                      {strategy.name}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground line-clamp-2">
                      {strategy.description || "No description"}
                    </CardDescription>
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-muted/60 text-muted-foreground">
                        {strategy.checklist
                          ? `${Object.keys(strategy.checklist).length} rule groups`
                          : "No rules yet"}
                      </span>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <Card className="border-border bg-card/90 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">
                    Thumbnail
                  </TableHead>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">
                    Description
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Rule Groups
                  </TableHead>
                  <TableHead className="text-right text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="border-border">
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      Loading playbooks…
                    </TableCell>
                  </TableRow>
                ) : strategies.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No playbooks yet. Create your first trading playbook.
                    </TableCell>
                  </TableRow>
                ) : (
                  strategies.map((strategy) => (
                    <TableRow
                      key={strategy.id}
                      className="border-border hover:bg-muted/40"
                    >
                      <TableCell>
                        {strategy.image_url ? (
                          <img
                            src={strategy.image_url}
                            alt={strategy.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {strategy.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {strategy.description || "—"}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted/60 text-muted-foreground">
                          {strategy.checklist
                            ? Object.keys(strategy.checklist).length
                            : 0}{" "}
                          groups
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(strategy)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this playbook?")) {
                                deleteMutation.mutate(strategy.id);
                              }
                            }}
                            className="text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <Card className="border-border bg-card/90 p-4 h-fit">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
              />
            </Card>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                Playbooks for{" "}
                {selectedDate
                  ? format(selectedDate, "MMMM dd, yyyy")
                  : "Select a date"}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {selectedDate &&
                getStrategiesForDate(selectedDate).length === 0 ? (
                  <Card className="border-border bg-card/90 col-span-full">
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/60" />
                        <p>No playbooks created on this date.</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  selectedDate &&
                  getStrategiesForDate(selectedDate).map((strategy) => (
                    <Card
                      key={strategy.id}
                      className="border-border bg-card/90 hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden"
                      onClick={() => openEditDialog(strategy)}
                    >
                      {strategy.image_url && (
                        <div className="w-full h-32 overflow-hidden">
                          <img
                            src={strategy.image_url}
                            alt={strategy.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {strategy.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-muted-foreground">
                          {strategy.description || "No description"}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Playbook;