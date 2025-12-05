"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function WelcomeCard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState<string | null>(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(
      () => setCurrentTime(new Date()),
      1000
    );
    return () => clearInterval(timer);
  }, []);

  // Load user name (if signed in)
  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      try {
        const { data, error } =
          await supabase.auth.getUser();
        if (error || !data.user || !mounted) return;

        const meta = data.user.user_metadata || {};
        const fullName: string | undefined =
          meta.full_name || meta.name;
        const fallbackFromEmail =
          data.user.email?.split("@")[0] ?? null;

        setUserName(fullName || fallbackFromEmail);
      } catch {
        // silently ignore
      }
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const getGreeting = (date: Date) => {
    const hour = date.getHours();
    if (hour < 5) return "Good night";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const timeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const greeting = getGreeting(currentTime);
  const displayName = userName || "Trader";

  return (
    <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-emerald-500/10 via-card to-sky-500/10">
      {/* subtle glow */}
      <div className="pointer-events-none absolute -top-16 -right-20 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-sky-500/20 blur-3xl" />

      <CardContent className="relative z-10 p-6 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-border/70">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Live trading workspace</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-serif font-bold bg-gradient-to-r from-primary via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
              {greeting}, {displayName}
            </h2>

            <p className="text-xs md:text-sm text-muted-foreground max-w-xl">
              Stay intentional. Review your journal, playbook, and
              goals before placing the next trade.
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-end gap-1 text-right">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Clock className="h-4 w-4" />
              <span>{formatDate(currentTime)}</span>
            </div>
            <div className="text-2xl font-mono font-semibold text-foreground leading-tight">
              {formatTime(currentTime)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {timeZone}
            </p>
          </div>
        </div>

        {/* Mobile time block */}
        <div className="mt-4 sm:hidden flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDate(currentTime)}</span>
          </div>
          <span className="font-mono font-semibold">
            {formatTime(currentTime)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}