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
  Loader2,
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

const Playbook = () => {
  const [viewMode, setViewMode] =
    useState<ViewMode>("gallery");
  const [isCreateOpen, setIsCreateOpen] =
    useState(false);
  const [editingStrategy, setEditingStrategy] =
    useState<Strategy | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [imageFile, setImageFile] =
    useState<File | null>(null);
  const [imagePreview, setImagePreview] =
    useState<string>("");

  const [ruleGroups, setRuleGroups] =
    useState<RuleGroups>(() => createEmptyRuleGroups());
  const [newGroupName, setNewGroupName] =
    useState("");
  const [selectedDate, setSelectedDate] =
    useState<Date | undefined>(new Date());

  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Fetch strategies for current user
  // ---------------------------------------------------------------------------

  const {
    data: strategies = [],
    isLoading,
  } = useQuery<Strategy[]>({
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

  // ---------------------------------------------------------------------------
  // Image upload helper
  // ---------------------------------------------------------------------------

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("goal-habit-images")
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("goal-habit-images")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

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
      queryClient.invalidateQueries({
        queryKey: ["strategies"],
      });
      toast.success("Playbook created successfully");
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(
        "Failed to create playbook: " +
          formatSupabaseError(error)
      );
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

      let imageUrl =
        editingStrategy.image_url || "";

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
      queryClient.invalidateQueries({
        queryKey: ["strategies"],
      });
      toast.success("Playbook updated successfully");
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(
        "Failed to update playbook: " +
          formatSupabaseError(error)
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("strategies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["strategies"],
      });
      toast.success("Playbook deleted successfully");
    },
    onError: (error) => {
      toast.error(
        "Failed to delete playbook: " +
          formatSupabaseError(error)
      );
    },
  });

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageFile(null);
    setImagePreview("");
    setRuleGroups(createEmptyRuleGroups());
    setEditingStrategy(null);
    setNewGroupName("");
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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

  const updateRule = (
    groupName: string,
    index: number,
    value: string
  ) => {
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
      [groupName]: prev[groupName].filter(
        (_, i) => i !== index
      ),
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
      toast.error(
        "Default groups cannot be removed"
      );
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
    setRuleGroups(
      strategy.checklist || createEmptyRuleGroups()
    );
    setIsCreateOpen(true);
  };

  const getStrategiesForDate = (date: Date) => {
    return strategies.filter((s) => {
      const createdDate = new Date(s.created_at);
      return (
        format(createdDate, "yyyy-MM-dd") ===
        format(date, "yyyy-MM-dd")
      );
    });
  };

  const ruleGroupKeys = Object.keys(ruleGroups);
  const firstGroup =
    ruleGroupKeys.length > 0 ? ruleGroupKeys[0] : undefined;

  // Simple stats
  const stats = useMemo(() => {
    const count = strategies.length;
    const totalGroups = strategies.reduce(
      (sum, s) =>
        sum +
        (s.checklist
          ? Object.keys(s.checklist).length
          : 0),
      0
    );
    const avgGroups =
      count > 0 ? totalGroups / count : 0;
    const withImage = strategies.filter(
      (s) => !!s.image_url
    ).length;
    return { count, totalGroups, avgGroups, withImage };
  }, [strategies]);

  return (
    // Added container class to align properly with layout
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header / Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-1 text-white">
            Playbook
          </h1>
          <p className="text-muted-foreground">
            Manage and refine your trading strategies.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex bg-muted/50 rounded-lg p-1 border border-white/5">
            <Button
              variant={
                viewMode === "gallery"
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              onClick={() => setViewMode("gallery")}
              className="h-8 w-8 p-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={
                viewMode === "table"
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 w-8 p-0"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={
                viewMode === "calendar"
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="h-8 w-8 p-0"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>

          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4" />
                New Playbook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0a0b0f] border-white/10">
              <DialogHeader>
                <DialogTitle>
                  {editingStrategy
                    ? "Edit Playbook"
                    : "Create Playbook"}
                </DialogTitle>
                <DialogDescription>
                  Define your trading strategy with rules
                  and criteria.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Playbook Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="e.g., Morning Breakout Strategy"
                    className="bg-muted/50 border-white/10"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                    placeholder="Describe your strategy..."
                    rows={3}
                    className="bg-muted/50 border-white/10"
                  />
                </div>

                {/* Thumbnail */}
                <div className="space-y-2">
                  <Label htmlFor="image">
                    Thumbnail / Icon
                  </Label>
                  <div className="flex items-center gap-4">
                    {imagePreview ? (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-white/10">
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
                      <div className="w-32 h-32 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center bg-muted/20">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <Label
                      htmlFor="image-upload"
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors">
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
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <Label className="text-lg font-semibold text-white">
                      Rule Groups
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Custom group name"
                        value={newGroupName}
                        onChange={(e) =>
                          setNewGroupName(
                            e.target.value
                          )
                        }
                        className="w-48 bg-muted/50 border-white/10"
                      />
                      <Button
                        onClick={addCustomGroup}
                        size="sm"
                        variant="outline"
                        className="border-white/10"
                      >
                        Add Group
                      </Button>
                    </div>
                  </div>

                  {firstGroup && (
                    <Tabs
                      defaultValue={firstGroup}
                      value={
                        ruleGroupKeys.includes(
                          firstGroup
                        )
                          ? undefined
                          : undefined
                      }
                      className="w-full"
                    >
                      <TabsList className="w-full flex-wrap h-auto bg-muted/50 p-1">
                        {ruleGroupKeys.map(
                          (groupName) => (
                            <TabsTrigger
                              key={groupName}
                              value={groupName}
                              className="relative group/tab"
                            >
                              {groupName}
                              {!Object.prototype.hasOwnProperty.call(
                                defaultRuleGroups,
                                groupName
                              ) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 ml-1 hover:text-red-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeGroup(
                                      groupName
                                    );
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </TabsTrigger>
                          )
                        )}
                      </TabsList>

                      {Object.entries(
                        ruleGroups
                      ).map(
                        ([
                          groupName,
                          rules,
                        ]) => (
                          <TabsContent
                            key={groupName}
                            value={groupName}
                            className="space-y-3 mt-4"
                          >
                            {rules.map(
                              (rule, index) => (
                                <div
                                  key={index}
                                  className="flex gap-2"
                                >
                                  <Input
                                    value={rule}
                                    onChange={(e) =>
                                      updateRule(
                                        groupName,
                                        index,
                                        e.target
                                          .value
                                      )
                                    }
                                    placeholder={`Add ${groupName.toLowerCase()} rule...`}
                                    className="bg-muted/50 border-white/10"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-red-400"
                                    onClick={() =>
                                      removeRule(
                                        groupName,
                                        index
                                      )
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                addRuleToGroup(
                                  groupName
                                )
                              }
                              className="w-full border-dashed border-white/20 hover:border-white/40"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Rule
                            </Button>
                          </TabsContent>
                        )
                      )}
                    </Tabs>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      resetForm();
                    }}
                    className="border-white/10"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingStrategy
                      ? "Update"
                      : "Create"}{" "}
                    Playbook
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Small stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
          <CardContent className="py-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 font-medium">
              Total Playbooks
            </p>
            <p className="text-2xl font-bold text-white">
              {stats.count}
            </p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
          <CardContent className="py-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 font-medium">
              Total Rule Groups
            </p>
            <p className="text-2xl font-bold text-white">
              {stats.totalGroups}
            </p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
          <CardContent className="py-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 font-medium">
              Avg Groups / Playbook
            </p>
            <p className="text-2xl font-bold text-white">
              {stats.avgGroups.toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
          <CardContent className="py-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 font-medium">
              With Thumbnail
            </p>
            <p className="text-2xl font-bold text-white">
              {stats.withImage}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Views */}
      {viewMode === "gallery" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : strategies.length === 0 ? (
            <Card className="border-dashed border-white/10 bg-transparent col-span-full">
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-white/10" />
                  <p className="text-lg mb-2 text-white">
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
                className="border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 cursor-pointer group overflow-hidden"
                onClick={() =>
                  openEditDialog(strategy)
                }
              >
                {strategy.image_url && (
                  <div className="w-full h-48 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0f] to-transparent z-10 opacity-60" />
                    <img
                      src={strategy.image_url}
                      alt={strategy.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <CardHeader className="relative z-20">
                  <CardTitle className="text-xl font-serif text-white group-hover:text-emerald-400 transition-colors">
                    {strategy.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {strategy.description ||
                      "No description provided"}
                  </CardDescription>
                  <div className="pt-4 flex items-center gap-2">
                    <div className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-xs text-muted-foreground">
                      {strategy.checklist &&
                      Object.keys(
                        strategy.checklist
                      ).length > 0 ? (
                        <span>
                          {
                            Object.keys(
                              strategy.checklist
                            ).length
                          }{" "}
                          rule groups
                        </span>
                      ) : (
                        <span>No rules yet</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      )}

      {viewMode === "table" && (
        <Card className="border-white/5 bg-white/5 overflow-hidden">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-gray-400">Thumbnail</TableHead>
                <TableHead className="text-gray-400">Name</TableHead>
                <TableHead className="text-gray-400">Description</TableHead>
                <TableHead className="text-gray-400">Rule Groups</TableHead>
                <TableHead className="text-right text-gray-400">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 <TableRow>
                 <TableCell colSpan={5} className="text-center py-10">
                   <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
                 </TableCell>
               </TableRow>
              ) : strategies.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No playbooks yet. Create your
                    first trading playbook.
                  </TableCell>
                </TableRow>
              ) : (
                strategies.map((strategy) => (
                  <TableRow
                    key={strategy.id}
                    className="hover:bg-white/5 border-white/5 transition-colors cursor-pointer"
                    onClick={() => openEditDialog(strategy)}
                  >
                    <TableCell>
                      {strategy.image_url ? (
                        <img
                          src={strategy.image_url}
                          alt={strategy.name}
                          className="w-10 h-10 rounded object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {strategy.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {strategy.description || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {strategy.checklist
                        ? Object.keys(
                            strategy.checklist
                          ).length
                        : 0}{" "}
                      groups
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:text-white hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(strategy);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:text-red-400 hover:bg-red-400/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              "Delete this playbook?"
                            )
                          ) {
                            deleteMutation.mutate(
                              strategy.id
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {viewMode === "calendar" && (
        <div className="grid md:grid-cols-[300px_1fr] gap-6">
          <Card className="border-white/5 bg-white/5 p-4 h-fit">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md text-white"
            />
          </Card>
          <div className="space-y-4">
            <h3 className="text-xl font-serif font-bold text-white">
              Playbooks for{" "}
              {selectedDate
                ? format(
                    selectedDate,
                    "MMMM dd, yyyy"
                  )
                : "Select a date"}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {selectedDate &&
              getStrategiesForDate(
                selectedDate
              ).length === 0 ? (
                <Card className="border-dashed border-white/10 bg-transparent col-span-full">
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <p>
                        No playbooks created on this
                        date.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                selectedDate &&
                getStrategiesForDate(
                  selectedDate
                ).map((strategy) => (
                  <Card
                    key={strategy.id}
                    className="border-white/5 bg-white/5 hover:border-emerald-500/30 transition-colors cursor-pointer group"
                    onClick={() =>
                      openEditDialog(strategy)
                    }
                  >
                    {strategy.image_url && (
                      <div className="w-full h-32 overflow-hidden rounded-t-lg relative">
                         <div className="absolute inset-0 bg-black/20" />
                        <img
                          src={strategy.image_url}
                          alt={strategy.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg font-serif text-white group-hover:text-emerald-400 transition-colors">
                        {strategy.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {strategy.description ||
                          "No description"}
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
  );
};

export default Playbook;