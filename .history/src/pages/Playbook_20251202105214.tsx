import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, LayoutGrid, Table as TableIcon, Calendar as CalendarIcon, Upload, X, Trash2, Image as ImageIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

type RuleGroups = Record<string, string[]>;

const defaultRuleGroups: RuleGroups = {
  "Entry Criteria": [],
  "Exit Criteria": [],
  "Risk": [],
  "Notes": []
};

const Playbook = () => {
  const [viewMode, setViewMode] = useState<"gallery" | "table" | "calendar">("gallery");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [ruleGroups, setRuleGroups] = useState<RuleGroups>(defaultRuleGroups);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const queryClient = useQueryClient();

  const { data: strategies } = useQuery({
    queryKey: ["strategies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("strategies").select("*");
      if (error) throw error;
      return data;
    },
  });

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('goal-habit-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('goal-habit-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const createMutation = useMutation({
    mutationFn: async (newStrategy: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { data, error } = await supabase.from("strategies").insert({
        name: newStrategy.name,
        description: newStrategy.description,
        image_url: imageUrl,
        checklist: newStrategy.ruleGroups,
        user_id: user.id
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      toast.success("Playbook created successfully");
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to create playbook: " + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedStrategy: any) => {
      let imageUrl = editingStrategy?.image_url || "";
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { data, error } = await supabase.from("strategies").update({
        name: updatedStrategy.name,
        description: updatedStrategy.description,
        image_url: imageUrl,
        checklist: updatedStrategy.ruleGroups
      }).eq("id", editingStrategy.id).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      toast.success("Playbook updated successfully");
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to update playbook: " + error.message);
    }
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
      toast.error("Failed to delete playbook: " + error.message);
    }
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageFile(null);
    setImagePreview("");
    setRuleGroups(defaultRuleGroups);
    setEditingStrategy(null);
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
    setRuleGroups(prev => ({
      ...prev,
      [groupName]: [...(prev[groupName] || []), ""]
    }));
  };

  const updateRule = (groupName: string, index: number, value: string) => {
    setRuleGroups(prev => ({
      ...prev,
      [groupName]: prev[groupName].map((rule, i) => i === index ? value : rule)
    }));
  };

  const removeRule = (groupName: string, index: number) => {
    setRuleGroups(prev => ({
      ...prev,
      [groupName]: prev[groupName].filter((_, i) => i !== index)
    }));
  };

  const addCustomGroup = () => {
    if (newGroupName && !ruleGroups[newGroupName]) {
      setRuleGroups(prev => ({
        ...prev,
        [newGroupName]: []
      }));
      setNewGroupName("");
    }
  };

  const removeGroup = (groupName: string) => {
    setRuleGroups(prev => {
      const newGroups = { ...prev };
      delete newGroups[groupName];
      return newGroups;
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Please enter a playbook name");
      return;
    }

    if (editingStrategy) {
      updateMutation.mutate({ name, description, ruleGroups });
    } else {
      createMutation.mutate({ name, description, ruleGroups });
    }
  };

  const openEditDialog = (strategy: any) => {
    setEditingStrategy(strategy);
    setName(strategy.name);
    setDescription(strategy.description || "");
    setImagePreview(strategy.image_url || "");
    setRuleGroups(strategy.checklist || defaultRuleGroups);
    setIsCreateOpen(true);
  };

  const getStrategiesForDate = (date: Date) => {
    return strategies?.filter(s => {
      const createdDate = new Date(s.created_at);
      return format(createdDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    }) || [];
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold mb-2">Playbook</h1>
          <p className="text-muted-foreground">Manage your trading strategies</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-muted rounded-md p-1">
            <Button
              variant={viewMode === "gallery" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("gallery")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Playbook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingStrategy ? "Edit" : "Create"} Playbook</DialogTitle>
                <DialogDescription>
                  Define your trading strategy with rules and criteria
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Playbook Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Morning Breakout Strategy"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your strategy..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Thumbnail / Icon</Label>
                  <div className="flex items-center gap-4">
                    {imagePreview ? (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-border">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
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
                      <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
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

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg">Rule Groups</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Custom group name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-48"
                      />
                      <Button onClick={addCustomGroup} size="sm">Add Group</Button>
                    </div>
                  </div>

                  <Tabs defaultValue={Object.keys(ruleGroups)[0]} className="w-full">
                    <TabsList className="w-full flex-wrap h-auto">
                      {Object.keys(ruleGroups).map((groupName) => (
                        <TabsTrigger key={groupName} value={groupName} className="relative">
                          {groupName}
                          {!Object.keys(defaultRuleGroups).includes(groupName) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 ml-2"
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
                      <TabsContent key={groupName} value={groupName} className="space-y-3">
                        {rules.map((rule, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={rule}
                              onChange={(e) => updateRule(groupName, index, e.target.value)}
                              placeholder={`Add ${groupName.toLowerCase()} rule...`}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRule(groupName, index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addRuleToGroup(groupName)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Rule
                        </Button>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setIsCreateOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingStrategy ? "Update" : "Create"} Playbook
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === "gallery" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {!strategies || strategies.length === 0 ? (
            <Card className="border-border bg-card col-span-full">
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg mb-2">No playbooks yet</p>
                  <p className="text-sm">Create your first trading playbook</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            strategies.map((strategy) => (
              <Card
                key={strategy.id}
                className="border-border bg-card hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => openEditDialog(strategy)}
              >
                {strategy.image_url && (
                  <div className="w-full h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={strategy.image_url}
                      alt={strategy.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl font-serif">{strategy.name}</CardTitle>
                  <CardDescription>{strategy.description || "No description"}</CardDescription>
                  <div className="pt-2 text-sm text-muted-foreground">
                    {strategy.checklist && Object.keys(strategy.checklist).length > 0 && (
                      <span>{Object.keys(strategy.checklist).length} rule groups</span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      )}

      {viewMode === "table" && (
        <Card className="border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thumbnail</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Rule Groups</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!strategies || strategies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No playbooks yet. Create your first trading playbook.
                  </TableCell>
                </TableRow>
              ) : (
                strategies.map((strategy) => (
                  <TableRow key={strategy.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      {strategy.image_url ? (
                        <img
                          src={strategy.image_url}
                          alt={strategy.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{strategy.name}</TableCell>
                    <TableCell>{strategy.description || "—"}</TableCell>
                    <TableCell>
                      {strategy.checklist ? Object.keys(strategy.checklist).length : 0} groups
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(strategy)}
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
          <Card className="border-border bg-card p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md"
            />
          </Card>
          <div className="space-y-4">
            <h3 className="text-xl font-serif font-bold">
              Playbooks for {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'Select a date'}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {selectedDate && getStrategiesForDate(selectedDate).length === 0 ? (
                <Card className="border-border bg-card col-span-full">
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No playbooks created on this date</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                selectedDate && getStrategiesForDate(selectedDate).map((strategy) => (
                  <Card
                    key={strategy.id}
                    className="border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => openEditDialog(strategy)}
                  >
                    {strategy.image_url && (
                      <div className="w-full h-32 overflow-hidden rounded-t-lg">
                        <img
                          src={strategy.image_url}
                          alt={strategy.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg font-serif">{strategy.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
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
  );
};

export default Playbook;
