"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Target,
  CheckCircle2,
  Calendar,
  Upload,
  Bell,
  Sparkles,
  Activity,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";

type GoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
type GoalCategory = "TRADING" | "HEALTH" | "PERSONAL" | "OTHER";

type Goal = {
  id: string;
  title: string;
  category: GoalCategory;
  description: string | null;
  target_metric: string | null;
  due_date: string | null;
  status: GoalStatus;
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

const formatSupabaseError = (err: unknown): string => {
  if (!err) return "Unknown error";
  if (err instanceof Error) return err.message;
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
  return String(err);
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
    category: "TRADING" as GoalCategory,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  const checkNotificationPermission = () => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  };

  const loadReminderPreferences = () => {
    if (typeof window === "undefined") return;
    const savedTime = localStorage.getItem("habitReminderTime");
    if (savedTime) setReminderTime(savedTime);
  };

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined") return;

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
    if (typeof window === "undefined") return;
    const [hours, minutes] = reminderTime.split(":");
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification =
      scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification("Habit Reminder", {
          body: "Time to check in on your daily habits!",
          icon: "/favicon.ico",
        });
      }
      scheduleNotification();
    }, timeUntilNotification);
  };

  const saveReminderTime = (time: string) => {
    setReminderTime(time);
    if (typeof window !== "undefined") {
      localStorage.setItem("habitReminderTime", time);
    }
    if (notificationsEnabled) {
      toast({
        title: "Reminder Updated",
        description: `Daily reminder set for ${time}`,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Supabase helpers
  // ---------------------------------------------------------------------------

  const uploadImage = async (
    file: File,
    folder: "goals" | "habits"
  ): Promise<string | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("goal-habit-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("goal-habit-images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: formatSupabaseError(error),
        variant: "destructive",
      });
      return null;
    }
  };

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [goalsRes, habitsRes, logsRes] = await Promise.all([
        supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          }),
        supabase
          .from("habits")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          }),
        supabase
          .from("habit_logs")
          .select("*")
          .eq("date", today),
      ]);

      if (goalsRes.error) throw goalsRes.error;
      if (habitsRes.error) throw habitsRes.error;
      if (logsRes.error) throw logsRes.error;

      setGoals((goalsRes.data || []) as Goal[]);
      setHabits((habitsRes.data || []) as Habit[]);
      setHabitLogs((logsRes.data || []) as HabitLog[]);
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

  // ---------------------------------------------------------------------------
  // Create / update actions
  // ---------------------------------------------------------------------------

  const createGoal = async () => {
    try {
      if (!newGoal.title.trim()) {
        toast({
          title: "Missing title",
          description: "Please enter a goal title before saving.",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let imageUrl = newGoal.image_url;
      if (goalImageFile) {
        const uploadedUrl = await uploadImage(goalImageFile, "goals");
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        ...newGoal,
        image_url: imageUrl || null,
        due_date: newGoal.due_date || null,
        status: "NOT_STARTED" as GoalStatus,
      });

      if (error) throw error;

      toast({
        title: "Goal Created",
        description: "Your goal has been added to the board.",
      });

      setNewGoal({
        title: "",
        category: "TRADING",
        description: "",
        target_metric: "",
        due_date: "",
        image_url: "",
      });
      setGoalImageFile(null);
      setShowGoalForm(false);
      fetchData();
    } catch (error) {
      console.error("Error creating goal:", error);
      toast({
        title: "Error",
        description: formatSupabaseError(error),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const createHabit = async () => {
    try {
      if (!newHabit.name.trim()) {
        toast({
          title: "Missing name",
          description: "Please enter a habit name before saving.",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
        image_url: imageUrl || null,
      });

      if (error) throw error;

      toast({
        title: "Habit Created",
        description: "Your habit has been added to today's list.",
      });

      setNewHabit({
        name: "",
        description: "",
        image_url: "",
      });
      setHabitImageFile(null);
      setShowHabitForm(false);
      fetchData();
    } catch (error) {
      console.error("Error creating habit:", error);
      toast({
        title: "Error",
        description: formatSupabaseError(error),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateGoalStatus = async (
    goalId: string,
    newStatus: GoalStatus
  ) => {
    try {
      const { error } = await supabase
        .from("goals")
        .update({ status: newStatus })
        .eq("id", goalId);

      if (error) throw error;

      toast({
        title: "Goal Updated",
        description: "Goal status updated.",
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
      const existingLog = habitLogs.find(
        (log) => log.habit_id === habitId
      );

      if (existingLog) {
        const { error } = await supabase
          .from("habit_logs")
          .update({ completed: isCompleted })
          .eq("id", existingLog.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("habit_logs")
          .insert({
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
        description: "Failed to update habit status",
        variant: "destructive",
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getProgressPercentage = (status: GoalStatus) => {
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

  const getStatusColor = (status: GoalStatus) => {
    switch (status) {
      case "COMPLETED":
        return "text-emerald-500";
      case "IN_PROGRESS":
        return "text-blue-400";
      default:
        return "text-muted-foreground";
    }
  };

  const goalStats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((g) => g.status === "COMPLETED").length;
    const inProgress = goals.filter((g) => g.status === "IN_PROGRESS").length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    const habitCompleted = habitLogs.filter((l) => l.completed).length;
    const habitRate =
      habits.length > 0
        ? (habitCompleted / habits.length) * 100
        : 0;

    return {
      total,
      completed,
      inProgress,
      completionRate,
      habitRate,
    };
  }, [goals, habitLogs, habits]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-muted-foreground">
        <p>Loading vision board…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2 flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              Vision Board
            </h1>
            <p className="text-muted-foreground text-sm">
              Visualize and track your goals and daily habits.
            </p>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-primary/15 to-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-primary/80 font-medium uppercase tracking-wide">
                    Total Goals
                  </p>
                  <p className="text-xl font-semibold">
                    {goalStats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-xs text-emerald-200 font-medium uppercase tracking-wide">
                    Completed Goals
                  </p>
                  <p className="text-xl font-semibold text-emerald-100">
                    {goalStats.completed}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/15 to-blue-500/5 border-blue-500/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-blue-300" />
                <div>
                  <p className="text-xs text-blue-100 font-medium uppercase tracking-wide">
                    Goal Completion
                  </p>
                  <p className="text-xl font-semibold text-blue-50">
                    {goalStats.completionRate.toFixed(0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <div>
                  <p className="text-xs text-emerald-100 font-medium uppercase tracking-wide">
                    Today’s Habit Score
                  </p>
                  <p className="text-xl font-semibold text-emerald-50">
                    {goalStats.habitRate.toFixed(0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification Settings */}
        <Card className="border-border bg-card mb-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Daily Habit Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Enable Notifications
                </p>
                <p className="text-xs text-muted-foreground">
                  Get daily reminders to track your habits.
                </p>
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
                <Label htmlFor="reminder-time">
                  Reminder Time
                </Label>
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
            <Button
              onClick={() => setShowGoalForm(!showGoalForm)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Goal
            </Button>
          </div>

          {showGoalForm && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  Create New Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-title">
                    Title *
                  </Label>
                  <Input
                    id="goal-title"
                    value={newGoal.title}
                    onChange={(e) =>
                      setNewGoal({
                        ...newGoal,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g. Achieve 60% win rate"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-category">
                    Category
                  </Label>
                  <Select
                    value={newGoal.category}
                    onValueChange={(value) =>
                      setNewGoal({
                        ...newGoal,
                        category: value as GoalCategory,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRADING">
                        Trading
                      </SelectItem>
                      <SelectItem value="HEALTH">
                        Health
                      </SelectItem>
                      <SelectItem value="PERSONAL">
                        Personal
                      </SelectItem>
                      <SelectItem value="OTHER">
                        Other
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-description">
                    Description
                  </Label>
                  <Textarea
                    id="goal-description"
                    value={newGoal.description}
                    onChange={(e) =>
                      setNewGoal({
                        ...newGoal,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe your goal..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal-metric">
                      Target Metric
                    </Label>
                    <Input
                      id="goal-metric"
                      value={newGoal.target_metric}
                      onChange={(e) =>
                        setNewGoal({
                          ...newGoal,
                          target_metric: e.target.value,
                        })
                      }
                      placeholder="e.g. 60%"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goal-due-date">
                      Due Date
                    </Label>
                    <Input
                      id="goal-due-date"
                      type="date"
                      value={newGoal.due_date}
                      onChange={(e) =>
                        setNewGoal({
                          ...newGoal,
                          due_date: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-image">
                    Upload Image (optional)
                  </Label>
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
                    <p className="text-xs text-muted-foreground">
                      Selected: {goalImageFile.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={createGoal}
                    disabled={!newGoal.title || uploading}
                  >
                    {uploading ? "Creating..." : "Create Goal"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowGoalForm(false);
                      setGoalImageFile(null);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Goals list */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.length === 0 ? (
              <Card className="border-border bg-card md:col-span-2 lg:col-span-3">
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No goals yet. Create your first goal to get
                    started!
                  </p>
                </CardContent>
              </Card>
            ) : (
              goals.map((goal) => (
                <Card
                  key={goal.id}
                  className="border-border bg-card overflow-hidden hover:shadow-lg transition-all group"
                >
                  {goal.image_url ? (
                    <div className="relative h-48 overflow-hidden bg-muted">
                      <img
                        src={goal.image_url}
                        alt={goal.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      <CheckCircle2
                        className={`absolute top-3 right-3 h-8 w-8 ${getStatusColor(
                          goal.status
                        )} drop-shadow-lg`}
                      />
                    </div>
                  ) : (
                    <div className="relative h-48 bg-gradient-to-br from-primary/20 via-accent/10 to-background flex items-center justify-center">
                      <Target className="h-16 w-16 text-primary/40" />
                      <CheckCircle2
                        className={`absolute top-3 right-3 h-8 w-8 ${getStatusColor(
                          goal.status
                        )}`}
                      />
                    </div>
                  )}

                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xl font-serif font-bold mb-2">
                          {goal.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            {goal.category}
                          </span>
                          {goal.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(
                                new Date(goal.due_date),
                                "MMM d, yyyy"
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {goal.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {goal.description}
                        </p>
                      )}

                      {goal.target_metric && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Target:{" "}
                          </span>
                          <span className="font-semibold text-primary">
                            {goal.target_metric}
                          </span>
                        </div>
                      )}

                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Progress
                          </span>
                          <span
                            className={cn(
                              "font-medium uppercase text-xs",
                              getStatusColor(goal.status)
                            )}
                          >
                            {goal.status.replace("_", " ")}
                          </span>
                        </div>
                        <Progress
                          value={getProgressPercentage(goal.status)}
                          className="h-2"
                        />

                        <div className="flex items-center gap-2 pt-2">
                          <Checkbox
                            checked={goal.status === "COMPLETED"}
                            onCheckedChange={(checked) =>
                              updateGoalStatus(
                                goal.id,
                                checked ? "COMPLETED" : "IN_PROGRESS"
                              )
                            }
                            id={`goal-${goal.id}`}
                          />
                          <Label
                            htmlFor={`goal-${goal.id}`}
                            className="text-sm cursor-pointer"
                          >
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
            <Button
              onClick={() => setShowHabitForm(!showHabitForm)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Habit
            </Button>
          </div>

          {showHabitForm && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  Create New Habit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="habit-name">
                    Habit Name *
                  </Label>
                  <Input
                    id="habit-name"
                    value={newHabit.name}
                    onChange={(e) =>
                      setNewHabit({
                        ...newHabit,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g. Review yesterday's trades"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="habit-description">
                    Description
                  </Label>
                  <Textarea
                    id="habit-description"
                    value={newHabit.description}
                    onChange={(e) =>
                      setNewHabit({
                        ...newHabit,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe your habit..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="habit-image">
                    Upload Image (optional)
                  </Label>
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
                    <p className="text-xs text-muted-foreground">
                      Selected: {habitImageFile.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={createHabit}
                    disabled={!newHabit.name || uploading}
                  >
                    {uploading ? "Creating..." : "Create Habit"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowHabitForm(false);
                      setHabitImageFile(null);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's habits */}
          <div>
            <CardTitle className="flex items-center gap-2 mb-6 text-2xl font-serif">
              <Calendar className="h-6 w-6 text-emerald-500" />
              Today's Habits –{" "}
              {format(new Date(), "EEEE, MMMM d")}
            </CardTitle>

            {habits.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No habits yet. Create your first habit
                    to track!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {habits.map((habit) => {
                  const log = habitLogs.find(
                    (l) => l.habit_id === habit.id
                  );
                  const isCompleted = log?.completed || false;

                  return (
                    <Card
                      key={habit.id}
                      className={cn(
                        "border-border overflow-hidden transition-all hover:shadow-md",
                        isCompleted
                          ? "bg-emerald-500/10 border-emerald-500/50"
                          : "bg-card"
                      )}
                    >
                      {habit.image_url ? (
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
                      ) : (
                        <div
                          className={cn(
                            "relative h-32 flex items-center justify-center",
                            isCompleted
                              ? "bg-emerald-500/20"
                              : "bg-gradient-to-br from-secondary to-muted"
                          )}
                        >
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
                            onCheckedChange={(checked) =>
                              toggleHabit(habit.id, Boolean(checked))
                            }
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
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {habit.description}
                              </p>
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
    </div>
  );
};

export default GoalsHabits;