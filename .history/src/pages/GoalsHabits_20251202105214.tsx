import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Target, CheckCircle2, Calendar, Upload, Bell, Sparkles } from "lucide-react";
import { format } from "date-fns";

type Goal = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  target_metric: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  image_url: string | null;
};

type Habit = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  image_url: string | null;
};

type HabitLog = {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
};

const GoalsHabits = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [goalImageFile, setGoalImageFile] = useState<File | null>(null);
  const [habitImageFile, setHabitImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const { toast } = useToast();

  const [newGoal, setNewGoal] = useState({
    title: "",
    category: "TRADING" as const,
    description: "",
    target_metric: "",
    due_date: "",
    image_url: "",
  });

  const [newHabit, setNewHabit] = useState({
    name: "",
    description: "",
    image_url: "",
  });

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchData();
    checkNotificationPermission();
    loadReminderPreferences();
  }, []);

  const checkNotificationPermission = () => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  };

  const loadReminderPreferences = () => {
    const savedTime = localStorage.getItem("habitReminderTime");
    if (savedTime) setReminderTime(savedTime);
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Not Supported",
        description: "Notifications are not supported in this browser",
        variant: "destructive",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
    
    if (permission === "granted") {
      toast({
        title: "Notifications Enabled",
        description: "You'll receive daily habit reminders",
      });
      scheduleNotification();
    } else {
      toast({
        title: "Permission Denied",
        description: "Please enable notifications in your browser settings",
        variant: "destructive",
      });
    }
  };

  const scheduleNotification = () => {
    const [hours, minutes] = reminderTime.split(":");
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification("Habit Reminder", {
          body: "Time to check in on your daily habits!",
          icon: "/favicon.ico",
        });
      }
      // Schedule next day
      scheduleNotification();
    }, timeUntilNotification);
  };

  const saveReminderTime = (time: string) => {
    setReminderTime(time);
    localStorage.setItem("habitReminderTime", time);
    if (notificationsEnabled) {
      toast({
        title: "Reminder Updated",
        description: `Daily reminder set for ${time}`,
      });
    }
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("goal-habit-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("goal-habit-images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
      return null;
    }
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [goalsRes, habitsRes, logsRes] = await Promise.all([
        supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("habits").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("habit_logs").select("*").eq("date", today),
      ]);

      if (goalsRes.data) setGoals(goalsRes.data);
      if (habitsRes.data) setHabits(habitsRes.data);
      if (logsRes.data) setHabitLogs(logsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load goals and habits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createGoal = async () => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let imageUrl = newGoal.image_url;
      if (goalImageFile) {
        const uploadedUrl = await uploadImage(goalImageFile, "goals");
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        ...newGoal,
        image_url: imageUrl,
        due_date: newGoal.due_date || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal created successfully",
      });

      setNewGoal({ title: "", category: "TRADING", description: "", target_metric: "", due_date: "", image_url: "" });
      setGoalImageFile(null);
      setShowGoalForm(false);
      fetchData();
    } catch (error) {
      console.error("Error creating goal:", error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const createHabit = async () => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let imageUrl = newHabit.image_url;
      if (habitImageFile) {
        const uploadedUrl = await uploadImage(habitImageFile, "habits");
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const { error } = await supabase.from("habits").insert({
        user_id: user.id,
        date: today,
        ...newHabit,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Habit created successfully",
      });

      setNewHabit({ name: "", description: "", image_url: "" });
      setHabitImageFile(null);
      setShowHabitForm(false);
      fetchData();
    } catch (error) {
      console.error("Error creating habit:", error);
      toast({
        title: "Error",
        description: "Failed to create habit",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateGoalStatus = async (goalId: string, newStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED") => {
    try {
      const { error } = await supabase
        .from("goals")
        .update({ status: newStatus })
        .eq("id", goalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal status updated",
      });

      fetchData();
    } catch (error) {
      console.error("Error updating goal:", error);
      toast({
        title: "Error",
        description: "Failed to update goal status",
        variant: "destructive",
      });
    }
  };

  const toggleHabit = async (habitId: string, isCompleted: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existingLog = habitLogs.find((log) => log.habit_id === habitId);

      if (existingLog) {
        const { error } = await supabase
          .from("habit_logs")
          .update({ completed: isCompleted })
          .eq("id", existingLog.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("habit_logs").insert({
          habit_id: habitId,
          date: today,
          completed: isCompleted,
        });

        if (error) throw error;
      }

      fetchData();
    } catch (error) {
      console.error("Error toggling habit:", error);
      toast({
        title: "Error",
        description: "Failed to update habit",
        variant: "destructive",
      });
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case "NOT_STARTED":
        return 0;
      case "IN_PROGRESS":
        return 50;
      case "COMPLETED":
        return 100;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-emerald-500";
      case "IN_PROGRESS":
        return "text-blue-500";
      default:
        return "text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold mb-2 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Vision Board
          </h1>
          <p className="text-muted-foreground">Visualize and track your goals and daily habits</p>
        </div>
      </div>

      {/* Notification Settings */}
      <Card className="border-border bg-card mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Daily Habit Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Notifications</p>
              <p className="text-xs text-muted-foreground">Get daily reminders to track your habits</p>
            </div>
            <Button
              onClick={requestNotificationPermission}
              variant={notificationsEnabled ? "outline" : "default"}
              size="sm"
            >
              {notificationsEnabled ? "Enabled" : "Enable"}
            </Button>
          </div>
          {notificationsEnabled && (
            <div className="space-y-2">
              <Label htmlFor="reminder-time">Reminder Time</Label>
              <Input
                id="reminder-time"
                type="time"
                value={reminderTime}
                onChange={(e) => saveReminderTime(e.target.value)}
                className="w-40"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Goals
          </h2>
          <Button onClick={() => setShowGoalForm(!showGoalForm)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>

        {showGoalForm && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Create New Goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-title">Title *</Label>
                <Input
                  id="goal-title"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="e.g. Achieve 60% win rate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-category">Category</Label>
                <Select
                  value={newGoal.category}
                  onValueChange={(value: any) => setNewGoal({ ...newGoal, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRADING">Trading</SelectItem>
                    <SelectItem value="HEALTH">Health</SelectItem>
                    <SelectItem value="PERSONAL">Personal</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-description">Description</Label>
                <Textarea
                  id="goal-description"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Describe your goal..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-metric">Target Metric</Label>
                  <Input
                    id="goal-metric"
                    value={newGoal.target_metric}
                    onChange={(e) => setNewGoal({ ...newGoal, target_metric: e.target.value })}
                  placeholder="e.g. 60%"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-due-date">Due Date</Label>
                  <Input
                    id="goal-due-date"
                    type="date"
                    value={newGoal.due_date}
                    onChange={(e) => setNewGoal({ ...newGoal, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-image">Upload Image (optional)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="goal-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setGoalImageFile(file);
                    }}
                    className="flex-1"
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                {goalImageFile && (
                  <p className="text-xs text-muted-foreground">Selected: {goalImageFile.name}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={createGoal} disabled={!newGoal.title || uploading}>
                  {uploading ? "Creating..." : "Create Goal"}
                </Button>
                <Button onClick={() => {
                  setShowGoalForm(false);
                  setGoalImageFile(null);
                }} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.length === 0 ? (
            <Card className="border-border bg-card md:col-span-2 lg:col-span-3">
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No goals yet. Create your first goal to get started!</p>
              </CardContent>
            </Card>
          ) : (
            goals.map((goal) => (
              <Card key={goal.id} className="border-border bg-card overflow-hidden hover:shadow-lg transition-all group">
                {goal.image_url && (
                  <div className="relative h-48 overflow-hidden bg-muted">
                    <img 
                      src={goal.image_url} 
                      alt={goal.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <CheckCircle2 className={`absolute top-3 right-3 h-8 w-8 ${getStatusColor(goal.status)} drop-shadow-lg`} />
                  </div>
                )}
                {!goal.image_url && (
                  <div className="relative h-48 bg-gradient-to-br from-primary/20 via-accent/10 to-background flex items-center justify-center">
                    <Target className="h-16 w-16 text-primary/40" />
                    <CheckCircle2 className={`absolute top-3 right-3 h-8 w-8 ${getStatusColor(goal.status)}`} />
                  </div>
                )}
                
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-serif font-bold mb-2">{goal.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          {goal.category}
                        </span>
                        {goal.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(goal.due_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>

                    {goal.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
                    )}
                    
                    {goal.target_metric && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Target: </span>
                        <span className="font-semibold text-primary">{goal.target_metric}</span>
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className={`font-medium ${getStatusColor(goal.status)}`}>
                          {goal.status.replace("_", " ")}
                        </span>
                      </div>
                      <Progress value={getProgressPercentage(goal.status)} className="h-2" />
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox
                          checked={goal.status === "COMPLETED"}
                          onCheckedChange={(checked) => 
                            updateGoalStatus(goal.id, checked ? "COMPLETED" : "IN_PROGRESS")
                          }
                          id={`goal-${goal.id}`}
                        />
                        <Label htmlFor={`goal-${goal.id}`} className="text-sm cursor-pointer">
                          Mark as complete
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Habits Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            Daily Habits
          </h2>
          <Button onClick={() => setShowHabitForm(!showHabitForm)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Habit
          </Button>
        </div>

        {showHabitForm && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Create New Habit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="habit-name">Habit Name *</Label>
                <Input
                  id="habit-name"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                  placeholder="e.g. Review yesterday's trades"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="habit-description">Description</Label>
                <Textarea
                  id="habit-description"
                  value={newHabit.description}
                  onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                  placeholder="Describe your habit..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="habit-image">Upload Image (optional)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="habit-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setHabitImageFile(file);
                    }}
                    className="flex-1"
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                {habitImageFile && (
                  <p className="text-xs text-muted-foreground">Selected: {habitImageFile.name}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={createHabit} disabled={!newHabit.name || uploading}>
                  {uploading ? "Creating..." : "Create Habit"}
                </Button>
                <Button onClick={() => {
                  setShowHabitForm(false);
                  setHabitImageFile(null);
                }} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <CardTitle className="flex items-center gap-2 mb-6 text-2xl font-serif">
            <Calendar className="h-6 w-6 text-emerald-500" />
            Today's Habits - {format(new Date(), "EEEE, MMMM d")}
          </CardTitle>
          
          {habits.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No habits yet. Create your first habit to track!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {habits.map((habit) => {
                const log = habitLogs.find((l) => l.habit_id === habit.id);
                const isCompleted = log?.completed || false;

                return (
                  <Card
                    key={habit.id}
                    className={`border-border overflow-hidden transition-all hover:shadow-md ${
                      isCompleted ? "bg-emerald-500/10 border-emerald-500/50" : "bg-card"
                    }`}
                  >
                    {habit.image_url && (
                      <div className="relative h-32 overflow-hidden bg-muted">
                        <img 
                          src={habit.image_url} 
                          alt={habit.name}
                          className="w-full h-full object-cover"
                        />
                        {isCompleted && (
                          <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
                            <CheckCircle2 className="h-12 w-12 text-emerald-500 drop-shadow-lg" />
                          </div>
                        )}
                      </div>
                    )}
                    {!habit.image_url && (
                      <div className={`relative h-32 flex items-center justify-center ${
                        isCompleted ? "bg-emerald-500/20" : "bg-gradient-to-br from-secondary to-muted"
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                        ) : (
                          <Target className="h-12 w-12 text-muted-foreground/40" />
                        )}
                      </div>
                    )}
                    
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={(checked) => toggleHabit(habit.id, checked as boolean)}
                          id={`habit-${habit.id}`}
                          className="mt-1 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`habit-${habit.id}`}
                            className="text-sm font-semibold cursor-pointer block"
                          >
                            {habit.name || "Unnamed habit"}
                          </Label>
                          {habit.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{habit.description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalsHabits;
