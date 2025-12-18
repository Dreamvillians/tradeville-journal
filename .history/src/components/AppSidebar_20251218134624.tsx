"use client";

import { useState, useEffect, useMemo, memo } from "react";
import {
  BarChart3,
  BookOpen,
  Home,
  TrendingUp,
  Target,
  Sparkles,
  Settings,
  Sun,
  Moon,
  Monitor,
  Palette,
  Check,
  ChevronDown,
  X, // Added X icon
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTheme, type ThemeId } from "@/contexts/ThemeContext";

// Navigation items
const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Playbook", url: "/playbook", icon: TrendingUp },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Goals & Habits", url: "/goals-habits", icon: Target },
];

// Icon mapping for themes
const themeIcons: Record<ThemeId, typeof Sun> = {
  system: Monitor,
  dark: Moon,
  light: Sun,
  grey: Palette,
  midnight: Moon,
  emerald: Sparkles,
  ocean: Palette,
  sunset: Sun,
};

type UserProfile = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

// Theme Selector Component
const ThemeSelector = memo(function ThemeSelector({ isCollapsed }: { isCollapsed: boolean }) {
  const { theme, setTheme, themes, currentTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const ThemeIcon = themeIcons[theme] || Monitor;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-3 px-3 py-2.5 rounded-xl",
            "text-sidebar-foreground/80 hover:text-white",
            "hover:bg-sidebar-accent/40 transition-all duration-200",
            isCollapsed && "justify-center px-2"
          )}
        >
          <div
            className={cn(
              "h-5 w-5 rounded-md flex items-center justify-center shrink-0",
              "bg-gradient-to-br",
              currentTheme.colors.primary
            )}
          >
            <ThemeIcon className="h-3 w-3 text-white" />
          </div>
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left text-sm truncate">
                {currentTheme.name}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={isCollapsed ? "right" : "top"}
        align={isCollapsed ? "start" : "center"}
        className="w-64 p-2 bg-popover/95 backdrop-blur-xl border-white/10"
        sideOffset={8}
      >
        <div className="space-y-1">
          <div className="px-2 py-1.5">
            <h4 className="text-sm font-semibold text-foreground">Theme</h4>
            <p className="text-xs text-muted-foreground">
              Select your preferred appearance
            </p>
          </div>
          <div className="h-px bg-border my-2" />
          <div className="grid gap-1 max-h-[300px] overflow-y-auto">
            {themes.map((t) => {
              const Icon = themeIcons[t.id] || Monitor;
              const isActive = theme === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-2 py-2 rounded-lg transition-all duration-200",
                    "hover:bg-accent/50 group",
                    isActive && "bg-accent"
                  )}
                >
                  {/* Theme preview */}
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-white/10",
                      t.colors.preview
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        t.id === "light" ? "text-slate-700" : "text-white"
                      )}
                    />
                  </div>

                  {/* Theme info */}
                  <div className="flex-1 text-left min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        isActive ? "text-foreground" : "text-muted-foreground",
                        "group-hover:text-foreground"
                      )}
                    >
                      {t.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t.description}
                    </p>
                  </div>

                  {/* Check indicator */}
                  {isActive && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

export function AppSidebar() {
  // Grab isMobile and setOpenMobile from context
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!data.user || !mounted) return;

        const meta = data.user.user_metadata || {};
        setUser({
          name: meta.full_name || meta.name || null,
          email: data.user.email ?? null,
          avatarUrl: meta.avatar_url || meta.picture || null,
        });
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        setUser({
          name: meta.full_name || meta.name || null,
          email: session.user.email ?? null,
          avatarUrl: meta.avatar_url || meta.picture || null,
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const initials = useMemo(() => {
    if (!user) return "TV";
    const source = user.name || user.email || "TV";
    return source
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const displayName = useMemo(() => {
    if (user?.name) return user.name;
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "Trader";
  }, [user]);

  const accountType = "Pro Account";

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-r border-border bg-sidebar-background/95 backdrop-blur-xl pt-4 md:pt-10", // Adjusted pt for mobile
        "bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.15),transparent_55%),radial-gradient(circle_at_bottom,_hsl(var(--accent)/0.15),transparent_55%)]"
      )}
    >
      {/* Header */}
      <div className="px-4 pt-2 pb-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div
            className={cn("flex items-center gap-3", isCollapsed && "justify-center")}
          >
            <div className="relative inline-flex items-center justify-center h-9 w-9 rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/40 shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-serif font-bold bg-gradient-to-r from-primary via-cyan-300 to-blue-400 bg-clip-text text-transparent whitespace-nowrap">
                  Tradeville
                </h1>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/80 whitespace-nowrap">
                  Trading OS
                </p>
              </div>
            )}
          </div>
          
          {/* Mobile Close Button - Only visible on mobile */}
          {isMobile && (
            <Button
              variant="ghost" 
              size="icon" 
              onClick={() => setOpenMobile(false)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <SidebarContent className="flex-1">
        {/* Navigation */}
        <SidebarGroup className="mt-4">
          {!isCollapsed && (
            <SidebarGroupLabel className="px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="mt-1 px-2">
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      // Close sidebar on mobile when a link is clicked
                      onClick={() => isMobile && setOpenMobile(false)}
                      end
                      className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm
                                text-sidebar-foreground/80 hover:text-white
                                hover:bg-sidebar-accent/40 transition-all duration-200
                                group overflow-hidden"
                      activeClassName="bg-gradient-to-r from-primary/25 via-primary/10 to-transparent
                                      text-sidebar-primary font-medium shadow-[0_0_0_1px_hsl(var(--primary)/0.45)]"
                    >
                      <span className="absolute left-0 top-0 h-full w-0.5 bg-primary/70 opacity-0 group-[&.active]:opacity-100" />
                      <item.icon className="h-5 w-5 shrink-0 text-sidebar-foreground/80 group-[&.active]:text-primary" />
                      {!isCollapsed && (
                        <span className="truncate">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Theme Section */}
        <SidebarGroup className="mt-4">
          {!isCollapsed && (
            <SidebarGroupLabel className="px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Appearance
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="mt-1 px-2">
            <ThemeSelector isCollapsed={isCollapsed} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer / Profile */}
      <SidebarFooter className="border-t border-white/5 p-3">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent/50 transition-all duration-200 cursor-pointer group",
            isCollapsed ? "justify-center" : "justify-start"
          )}
        >
          <Avatar className="h-9 w-9 border border-white/10 shadow-sm shrink-0 transition-transform duration-200 group-hover:scale-105">
            {user?.avatarUrl && (
              <AvatarImage
                src={user.avatarUrl}
                alt={displayName}
                className="object-cover"
              />
            )}
            <AvatarFallback
              className={cn(
                "text-[11px] font-semibold text-white",
                "bg-gradient-to-br from-primary to-blue-600"
              )}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                initials
              )}
            </AvatarFallback>
          </Avatar>

          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate group-hover:text-white transition-colors">
                  {isLoading ? (
                    <span className="inline-block w-20 h-4 bg-white/10 rounded animate-pulse" />
                  ) : (
                    displayName
                  )}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground truncate">
                    {user?.email ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {accountType}
                      </span>
                    ) : (
                      "Not signed in"
                    )}
                  </span>
                </div>
              </div>
              <Settings
                className={cn(
                  "h-4 w-4 text-muted-foreground shrink-0 transition-all duration-200",
                  "group-hover:text-white group-hover:rotate-45"
                )}
              />
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}