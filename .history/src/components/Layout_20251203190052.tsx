"use client";

import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, CalendarDays } from "lucide-react";
import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface LayoutProps {
  children: ReactNode;
}

type UserSnippet = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [user, setUser] = useState<UserSnippet | null>(
    null
  );

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const { data, error } =
          await supabase.auth.getUser();
        if (error) throw error;
        if (!data.user || !mounted) return;

        const meta = data.user.user_metadata || {};
        setUser({
          name:
            meta.full_name ||
            meta.name ||
            null,
          email: data.user.email ?? null,
          avatarUrl:
            meta.avatar_url || meta.picture || null,
        });
      } catch {
        // ignore; header still works without user
      }
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "See you next session.",
      });
      navigate("/auth");
    }
  };

  const currentTitle = useMemo(() => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/journal"))
      return "Journal";
    if (path.startsWith("/playbook"))
      return "Playbook";
    if (path.startsWith("/analytics"))
      return "Analytics";
    if (path.startsWith("/goals-habits"))
      return "Goals & Habits";
    return "Overview";
  }, [location.pathname]);

  const initials = useMemo(() => {
    if (!user) return "TV";
    const source =
      user.name || user.email || "TV";
    return source
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const todayLabel = format(
    new Date(),
    "EEE, MMM d"
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#05060b] text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Top App Bar */}
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border
                             bg-gradient-to-r from-background/95 via-background/80 to-background/95
                             backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <Separator
                orientation="vertical"
                className="h-6 hidden sm:block"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 hidden sm:block">
                  Workspace
                </span>
                <span className="text-sm md:text-base font-semibold truncate">
                  {currentTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date pill */}
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{todayLabel}</span>
              </div>

              {/* User snippet + sign out */}
              <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-2 py-1">
                <Avatar className="h-8 w-8 border border-white/10">
                  {user?.avatarUrl && (
                    <AvatarImage
                      src={user.avatarUrl}
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-[11px] font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="hidden md:flex flex-col leading-tight min-w-0">
                  <span className="text-xs font-medium truncate max-w-[140px]">
                    {user?.name || "Guest Trader"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                    {user?.email || "Not signed in"}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-1 ml-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    Sign Out
                  </span>
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}