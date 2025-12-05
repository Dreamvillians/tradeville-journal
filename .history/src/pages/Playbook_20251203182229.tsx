import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, LayoutGrid, Table as TableIcon, Calendar as CalendarIcon, Upload, X, Trash2, Image as ImageIcon, BookOpen, CheckSquare, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// -------------------------------------------------------------------------------------
// Styles & Visuals
// -------------------------------------------------------------------------------------

const PLAYBOOK_STYLES = `
  .playbook-glass {
    background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.05), transparent 40%),
                rgba(15, 16, 24, 0.85);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  }
  
  .playbook-card-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .playbook-card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .animate-enter { animation: enter 0.5s ease-out forwards; opacity: 0; transform: translateY(10px); }
  @keyframes enter { to { opacity: 1; transform: translateY(0); } }
`;

const FloatingOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px]" />
    <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px]" />
  </div>
));
FloatingOrbs.displayName = "FloatingOrbs";

// -------------------------------------------------------------------------------------
// Types & Defaults
// -------------------------------------------------------------------------------------

type RuleGroups = Record<string, string[]>;

const defaultRuleGroups: RuleGroups = {
  "Entry Criteria": [],
  "Exit Criteria": [],
  "Risk Management": [],
  "Mental State": []
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
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();

  // Inject Styles
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = PLAYBOOK_STYLES;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  const { data: strategies } = useQuery({
    queryKey: ["strategies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("strategies").select("*").order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredStrategies = strategies?.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // --- Helpers ---

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('goal-habit-images') // Ensure this bucket exists or change to 'strategies'
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('goal-habit-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

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

  // --- Rule Management ---

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

  // --- Mutations ---

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
      toast.success("Playbook deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    }
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Please enter a playbook name");
      return;
    }
    const payload = { name, description, ruleGroups };
    if (editingStrategy) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
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

  // -------------------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white relative overflow-x-hidden font-sans selection:bg-blue-500/30">
      <FloatingOrbs />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-enter">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Playbook</h1>
            <p className="text-gray-500 text-sm mt-1">Define your edge. Execute with precision.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all">
                <Plus className="h-4 w-4 mr-2" /> New Strategy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0f1117] border-white/10 p-0 gap-0">
              
              {/* Dialog Header */}
              <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                <DialogTitle className="text-xl font-medium text-white">{editingStrategy ? "Edit Strategy" : "Create New Strategy"}</DialogTitle>
                <DialogDescription className="text-gray-500 mt-1">
                  Design your trading plan and checklists.
                </DialogDescription>
              </div>

              {/* Dialog Body */}
              <div className="p-6 space-y-8">
                
                {/* Basic Info & Image */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-gray-400 text-xs uppercase tracking-wider font-bold">Strategy Name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Morning Gap Fill"
                                className="bg-white/5 border-white/10 focus:border-blue-500/50 text-lg py-6"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-400 text-xs uppercase tracking-wider font-bold">Description</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is the logic behind this strategy?"
                                rows={4}
                                className="bg-white/5 border-white/10 focus:border-blue-500/50 resize-none"
                            />
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <Label className="text-gray-400 text-xs uppercase tracking-wider font-bold">Thumbnail</Label>
                        <div className="relative group cursor-pointer">
                            {imagePreview ? (
                                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-white/10">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Button size="sm" variant="destructive" onClick={() => { setImageFile(null); setImagePreview(""); }}>Remove</Button>
                                    </div>
                                </div>
                            ) : (
                                <label htmlFor="image-upload" className="w-full h-40 rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500/50 hover:text-blue-400 transition-colors bg-white/5">
                                    <Upload className="h-8 w-8 mb-2" />
                                    <span className="text-xs">Upload Cover</span>
                                </label>
                            )}
                            <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </div>
                    </div>
                </div>

                {/* Rules Builder */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <Label className="text-lg font-medium text-white">Rules & Checklists</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="New group name..."
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                className="w-48 h-8 bg-white/5 border-white/10 text-xs"
                            />
                            <Button onClick={addCustomGroup} size="sm" variant="secondary" className="h-8">Add Group</Button>
                        </div>
                    </div>

                    <Tabs defaultValue={Object.keys(ruleGroups)[0]} className="w-full">
                        <TabsList className="w-full flex-wrap justify-start h-auto bg-transparent gap-2 p-0 mb-4">
                            {Object.keys(ruleGroups).map((groupName) => (
                                <TabsTrigger 
                                    key={groupName} 
                                    value={groupName} 
                                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white bg-white/5 border border-white/10 text-gray-400 rounded-full px-4 py-1.5 text-xs"
                                >
                                    {groupName}
                                    {!Object.keys(defaultRuleGroups).includes(groupName) && (
                                        <X className="h-3 w-3 ml-2 hover:text-red-400" onClick={(e) => { e.stopPropagation(); removeGroup(groupName); }} />
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {Object.entries(ruleGroups).map(([groupName, rules]) => (
                            <TabsContent key={groupName} value={groupName} className="space-y-3 bg-white/5 rounded-xl p-4 border border-white/10 animate-in fade-in slide-in-from-left-2 duration-300">
                                {rules.length === 0 && (
                                    <p className="text-sm text-gray-500 italic text-center py-4">No rules added yet.</p>
                                )}
                                {rules.map((rule, index) => (
                                    <div key={index} className="flex gap-2 items-center group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                                        <Input
                                            value={rule}
                                            onChange={(e) => updateRule(groupName, index, e.target.value)}
                                            placeholder="Enter rule criteria..."
                                            className="bg-transparent border-none focus-visible:ring-0 text-gray-300 p-0 h-auto"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeRule(groupName, index)}
                                            className="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 h-6 w-6"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addRuleToGroup(groupName)}
                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 w-full mt-2 h-8 text-xs"
                                >
                                    <Plus className="h-3 w-3 mr-2" /> Add Rule
                                </Button>
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>

              </div>

              {/* Dialog Footer */}
              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5">
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="hover:bg-white/10 text-gray-400">Cancel</Button>
                <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">{editingStrategy ? "Save Changes" : "Create Strategy"}</Button>
              </div>

            </DialogContent>
          </Dialog>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
            {/* View Toggles */}
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("gallery")}
                    className={cn("h-8 px-3 rounded-md text-gray-400 hover:text-white", viewMode === "gallery" && "bg-white/10 text-white")}
                >
                    <LayoutGrid className="h-4 w-4 mr-2" /> Gallery
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className={cn("h-8 px-3 rounded-md text-gray-400 hover:text-white", viewMode === "table" && "bg-white/10 text-white")}
                >
                    <TableIcon className="h-4 w-4 mr-2" /> List
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("calendar")}
                    className={cn("h-8 px-3 rounded-md text-gray-400 hover:text-white", viewMode === "calendar" && "bg-white/10 text-white")}
                >
                    <CalendarIcon className="h-4 w-4 mr-2" /> Calendar
                </Button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input 
                    placeholder="Search strategies..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-sm focus:border-blue-500/50 rounded-lg"
                />
            </div>
        </div>

        {/* Views */}
        {viewMode === "gallery" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStrategies.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white/2 rounded-xl border border-white/5 border-dashed">
                <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No strategies found</p>
                <p className="text-gray-600 text-sm">Create a new one to get started.</p>
              </div>
            ) : (
              filteredStrategies.map((strategy) => (
                <Card
                  key={strategy.id}
                  className="playbook-glass playbook-card-hover border-none cursor-pointer group overflow-hidden flex flex-col"
                  onClick={() => openEditDialog(strategy)}
                >
                  {/* Image Area */}
                  <div className="relative h-48 w-full bg-gray-900 overflow-hidden">
                    {strategy.image_url ? (
                        <img
                        src={strategy.image_url}
                        alt={strategy.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                            <ImageIcon className="h-10 w-10 text-gray-700" />
                        </div>
                    )}
                    {/* Overlay Content */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end">
                        <h3 className="text-xl font-bold text-white leading-tight">{strategy.name}</h3>
                    </div>
                  </div>

                  <CardContent className="p-6 flex-1 flex flex-col">
                    <p className="text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
                        {strategy.description || "No description provided."}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <CheckSquare className="h-3.5 w-3.5" />
                            {strategy.checklist ? Object.values(strategy.checklist).flat().length : 0} Rules
                        </div>
                        <div className="text-xs text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            View Details →
                        </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {viewMode === "table" && (
          <Card className="playbook-glass border-none overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-b border-white/10">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-500 h-12">Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-500">Checklist</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-500">Created</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-gray-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStrategies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">No playbooks found.</TableCell>
                  </TableRow>
                ) : (
                  filteredStrategies.map((strategy) => (
                    <TableRow key={strategy.id} className="hover:bg-white/5 cursor-pointer border-b border-white/5" onClick={() => openEditDialog(strategy)}>
                      <TableCell className="font-medium text-white">
                          <div className="flex items-center gap-3">
                              {strategy.image_url && <img src={strategy.image_url} className="w-8 h-8 rounded object-cover border border-white/10" />}
                              {strategy.name}
                          </div>
                      </TableCell>
                      <TableCell className="text-gray-400 max-w-xs truncate">{strategy.description || "—"}</TableCell>
                      <TableCell className="text-gray-400 text-xs">
                        {strategy.checklist ? Object.keys(strategy.checklist).length : 0} Groups
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs font-mono">{format(new Date(strategy.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this playbook?")) deleteMutation.mutate(strategy.id);
                          }}
                          className="text-gray-500 hover:text-red-400 hover:bg-red-500/10"
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
          <div className="grid lg:grid-cols-[350px_1fr] gap-8">
            <div className="playbook-glass p-6 rounded-xl h-fit">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border border-white/10 bg-black/20 w-full"
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">
                Created on {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'Select a date'}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedDate && getStrategiesForDate(selectedDate).length === 0 ? (
                  <div className="col-span-full py-12 text-center border border-white/5 border-dashed rounded-xl bg-white/2">
                    <p className="text-gray-500">No strategies created on this date.</p>
                  </div>
                ) : (
                  selectedDate && getStrategiesForDate(selectedDate).map((strategy) => (
                    <Card
                      key={strategy.id}
                      className="playbook-glass border-none cursor-pointer group hover:bg-white/5"
                      onClick={() => openEditDialog(strategy)}
                    >
                      <div className="flex items-center gap-4 p-4">
                          {strategy.image_url ? (
                              <img src={strategy.image_url} className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                          ) : (
                              <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                  <ImageIcon className="h-6 w-6 text-gray-600" />
                              </div>
                          )}
                          <div>
                              <h4 className="font-bold text-white">{strategy.name}</h4>
                              <p className="text-xs text-gray-500 line-clamp-1">{strategy.description}</p>
                          </div>
                      </div>
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