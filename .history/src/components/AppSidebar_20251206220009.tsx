import { useState, useEffect, useMemo, useCallback } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Navigation items
const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Playbook", url: "/playbook", icon: TrendingUp },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Goals & Habits", url: "/goals-habits", icon: Target },
];

// Theme definitions
type ThemeId = "dark" | "light" | "grey" | "midnight" | "emerald" | "ocean" | "sunset" | "system";

interface ThemeConfig {
  id: ThemeId;
  name: string;
  icon: typeof Sun;
  description: string;
  colors: {
    primary: string;
    accent: string;
    preview: string;
  };
}

const themes: ThemeConfig[] = [
  {
    id: "system",
    name: "System",
    icon: Monitor,
    description: "Follow system preference",
    colors: {
      primary: "from-gray-400 to-gray-600",
      accent: "bg-gray-500",
      preview: "bg-gradient-to-br from-gray-200 via-gray-400 to-gray-800",
    },
  },
  {
    id: "dark",
    name: "Dark",
    icon: Moon,
    description: "Dark mode for night trading",
    colors: {
      primary: "from-slate-700 to-slate-900",
      accent: "bg-slate-700",
      preview: "bg-gradient-to-br from-slate-800 via-slate-900 to-black",
    },
  },
  {
    id: "light",
    name: "Light",
    icon: Sun,
    description: "Light mode for day trading",
    colors: {
      primary: "from-white to-gray-100",
      accent: "bg-white",
      preview: "bg-gradient-to-br from-white via-gray-100 to-gray-200",
    },
  },
  {
    id: "grey",
    name: "Grey",
    icon: Palette,
    description: "Neutral grey theme",
    colors: {
      primary: "from-zinc-600 to-zinc-800",
      accent: "bg-zinc-600",
      preview: "bg-gradient-to-br from-zinc-500 via-zinc-700 to-zinc-900",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    icon: Moon,
    description: "Deep blue night theme",
    colors: {
      primary: "from-indigo-900 to-slate-900",
      accent: "bg-indigo-600",
      preview: "bg-gradient-to-br from-indigo-900 via-slate-900 to-black",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    icon: Sparkles,
    description: "Green trading theme",
    colors: {
      primary: "from-emerald-800 to-slate-900",
      accent: "bg-emerald-500",
      preview: "bg-gradient-to-br from-emerald-700 via-emerald-900 to-slate-900",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    icon: Palette,
    description: "Deep ocean blue theme",
    colors: {
      primary: "from-cyan-800 to-slate-900",
      accent: "bg-cyan-500",
      preview: "bg-gradient-to-br from-cyan-700 via-blue-900 to-slate-900",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    icon: Sun,
    description: "Warm sunset colors",
    colors: {
      primary: "from-orange-800 to-slate-900",
      accent: "bg-orange-500",
      preview: "bg-gradient-to-br from-orange-600 via-rose-800 to-slate-900",
    },
  },
];

// CSS variables for each theme
const themeStyles: Record<ThemeId, Record<string, string>> = {
  system: {}, // Will use prefers-color-scheme
  dark: {
    "--background": "222.2 84% 4.9%",
    "--foreground": "210 40% 98%",
    "--card": "222.2 84% 4.9%",
    "--card-foreground": "210 40% 98%",
    "--popover": "222.2 84% 4.9%",
    "--popover-foreground": "210 40% 98%",
    "--primary": "142.1 76.2% 36.3%",
    "--primary-foreground": "355.7 100% 97.3%",
    "--secondary": "217.2 32.6% 17.5%",
    "--secondary-foreground": "210 40% 98%",
    "--muted": "217.2 32.6% 17.5%",
    "--muted-foreground": "215 20.2% 65.1%",
    "--accent": "217.2 32.6% 17.5%",
    "--accent-foreground": "210 40% 98%",
    "--destructive": "0 62.8% 30.6%",
    "--destructive-foreground": "210 40% 98%",
    "--border": "217.2 32.6% 17.5%",
    "--input": "217.2 32.6% 17.5%",
    "--ring": "142.1 76.2% 36.3%",
    "--sidebar-background": "222.2 84% 4.9%",
    "--sidebar-foreground": "210 40% 98%",
    "--sidebar-primary": "142.1 76.2% 36.3%",
    "--sidebar-accent": "217.2 32.6% 17.5%",
  },
  light: {
    "--background": "0 0% 100%",
    "--foreground": "222.2 84% 4.9%",
    "--card": "0 0% 100%",
    "--card-foreground": "222.2 84% 4.9%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "222.2 84% 4.9%",
    "--primary": "142.1 76.2% 36.3%",
    "--primary-foreground": "355.7 100% 97.3%",
    "--secondary": "210 40% 96.1%",
    "--secondary-foreground": "222.2 47.4% 11.2%",
    "--muted": "210 40% 96.1%",
    "--muted-foreground": "215.4 16.3% 46.9%",
    "--accent": "210 40% 96.1%",
    "--accent-foreground": "222.2 47.4% 11.2%",
    "--destructive": "0 84.2% 60.2%",
    "--destructive-foreground": "210 40% 98%",
    "--border": "214.3 31.8% 91.4%",
    "--input": "214.3 31.8% 91.4%",
    "--ring": "142.1 76.2% 36.3%",
    "--sidebar-background": "0 0% 98%",
    "--sidebar-foreground": "222.2 84% 4.9%",
    "--sidebar-primary": "142.1 76.2% 36.3%",
    "--sidebar-accent": "210 40% 96.1%",
  },
  grey: {
    "--background": "0 0% 9%",
    "--foreground": "0 0% 95%",
    "--card": "0 0% 9%",
    "--card-foreground": "0 0% 95%",
    "--popover": "0 0% 9%",
    "--popover-foreground": "0 0% 95%",
    "--primary": "0 0% 98%",
    "--primary-foreground": "0 0% 9%",
    "--secondary": "0 0% 14.9%",
    "--secondary-foreground": "0 0% 98%",
    "--muted": "0 0% 14.9%",
    "--muted-foreground": "0 0% 63.9%",
    "--accent": "0 0% 14.9%",
    "--accent-foreground": "0 0% 98%",
    "--destructive": "0 62.8% 30.6%",
    "--destructive-foreground": "0 0% 98%",
    "--border": "0 0% 14.9%",
    "--input": "0 0% 14.9%",
    "--ring": "0 0% 83.1%",
    "--sidebar-background": "0 0% 7%",
    "--sidebar-foreground": "0 0% 95%",
    "--sidebar-primary": "0 0% 98%",
    "--sidebar-accent": "0 0% 14.9%",
  },
  midnight: {
    "--background": "224 71% 4%",
    "--foreground": "213 31% 91%",
    "--card": "224 71% 4%",
    "--card-foreground": "213 31% 91%",
    "--popover": "224 71% 4%",
    "--popover-foreground": "213 31% 91%",
    "--primary": "263.4 70% 50.4%",
    "--primary-foreground": "210 40% 98%",
    "--secondary": "222.2 47.4% 11.2%",
    "--secondary-foreground": "210 40% 98%",
    "--muted": "223 47% 11%",
    "--muted-foreground": "215.4 16.3% 56.9%",
    "--accent": "216 34% 17%",
    "--accent-foreground": "210 40% 98%",
    "--destructive": "0 63% 31%",
    "--destructive-foreground": "210 40% 98%",
    "--border": "216 34% 17%",
    "--input": "216 34% 17%",
    "--ring": "263.4 70% 50.4%",
    "--sidebar-background": "224 71% 3%",
    "--sidebar-foreground": "213 31% 91%",
    "--sidebar-primary": "263.4 70% 50.4%",
    "--sidebar-accent": "216 34% 17%",
  },
  emerald: {
    "--background": "160 84% 3%",
    "--foreground": "150 40% 96%",
    "--card": "160 84% 3%",
    "--card-foreground": "150 40% 96%",
    "--popover": "160 84% 3%",
    "--popover-foreground": "150 40% 96%",
    "--primary": "142.1 76.2% 36.3%",
    "--primary-foreground": "355.7 100% 97.3%",
    "--secondary": "160 32.6% 12%",
    "--secondary-foreground": "150 40% 96%",
    "--muted": "160 32.6% 12%",
    "--muted-foreground": "150 20.2% 60%",
    "--accent": "160 32.6% 12%",
    "--accent-foreground": "150 40% 96%",
    "--destructive": "0 62.8% 30.6%",
    "--destructive-foreground": "150 40% 96%",
    "--border": "160 32.6% 15%",
    "--input": "160 32.6% 15%",
    "--ring": "142.1 76.2% 36.3%",
    "--sidebar-background": "160 84% 2.5%",
    "--sidebar-foreground": "150 40% 96%",
    "--sidebar-primary": "142.1 76.2% 36.3%",
    "--sidebar-accent": "160 32.6% 12%",
  },
  ocean: {
    "--background": "200 84% 4%",
    "--foreground": "190 40% 96%",
    "--card": "200 84% 4%",
    "--card-foreground": "190 40% 96%",
    "--popover": "200 84% 4%",
    "--popover-foreground": "190 40% 96%",
    "--primary": "187 92% 45%",
    "--primary-foreground": "200 84% 4%",
    "--secondary": "200 32.6% 12%",
    "--secondary-foreground": "190 40% 96%",
    "--muted": "200 32.6% 12%",
    "--muted-foreground": "190 20.2% 60%",
    "--accent": "200 32.6% 15%",
    "--accent-foreground": "190 40% 96%",
    "--destructive": "0 62.8% 30.6%",
    "--destructive-foreground": "190 40% 96%",
    "--border": "200 32.6% 17%",
    "--input": "200 32.6% 17%",
    "--ring": "187 92% 45%",
    "--sidebar-background": "200 84% 3%",
    "--sidebar-foreground": "190 40% 96%",
    "--sidebar-primary": "187 92% 45%",
    "--sidebar-accent": "200 32.6% 12%",
  },
  sunset: {
    "--background": "20 84% 4%",
    "--foreground": "30 40% 96%",
    "--card": "20 84% 4%",
    "--card-foreground": "30 40% 96%",
    "--popover": "20 84% 4%",
    "--popover-foreground": "30 40% 96%",
    "--primary": "25 95% 53%",
    "--primary-foreground": "20 84% 4%",
    "--secondary": "20 32.6% 12%",
    "--secondary-foreground": "30 40% 96%",
    "--muted": "20 32.6% 12%",
    "--muted-foreground": "30 20.2% 60%",
    "--accent": "20 32.6% 15%",
    "--accent-foreground": "30 40% 96%",
    "--destructive": "0 62.8% 30.6%",
    "--destructive-foreground": "30 40% 96%",
    "--border": "20 32.6% 17%",
    "--input": "20 32.6% 17%",
    "--ring": "25 95% 53%",
    "--sidebar-background": "20 84% 3%",
    "--sidebar-foreground": "30 40% 96%",
    "--sidebar-primary": "25 95% 53%",
    "--sidebar-accent": "20 32.6% 12%",
  },
};

// Theme hook
const useTheme = () => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tradeville-theme") as ThemeId;
      return stored || "dark";
    }
    return "dark";
  });

  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem("tradeville-theme", newTheme);
    applyTheme(newTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);

    // Listen for system theme changes if using system theme
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return { theme, setTheme, themes };
};

// Apply theme to document
const applyTheme = (themeId: ThemeId) => {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove("light", "dark");

  let effectiveTheme = themeId;

  if (themeId === "system") {
    effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  // Add theme class
  if (effectiveTheme === "light") {
    root.classList.add("light");
  } else {
    root.classList.add("dark");
  }

  // Apply CSS variables
  const styles = themeStyles[themeId === "system" ? effectiveTheme : themeId];
  if (styles) {
    Object.entries(styles).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  // Store theme attribute for CSS targeting
  root.setAttribute("data-theme", themeId);
};

type UserProfile = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

// Theme Selector Component
const ThemeSelector = memo(({ isCollapsed }: { isCollapsed: boolean }) => {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];
  const ThemeIcon = currentTheme.icon;

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
          <div className="grid gap-1">
            {themes.map((t) => {
              const Icon = t.icon;
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
ThemeSelector.displayName = "ThemeSelector";

// Memoized component
const memo = <T extends React.ComponentType<any>>(component: T) => component;

export function AppSidebar() {
  const { state } = useSidebar();
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

    // Listen for auth changes
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

  // Generate initials from name or email
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

  // Display name (fallback to email username if no name)
  const displayName = useMemo(() => {
    if (user?.name) return user.name;
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "Trader";
  }, [user]);

  // Account type badge
  const accountType = "Pro Account";

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-r border-border bg-sidebar-background/95 backdrop-blur-xl pt-10",
        "bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.15),transparent_55%),radial-gradient(circle_at_bottom,_hsl(var(--accent)/0.15),transparent_55%)]"
      )}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-6 border-b border-white/5">
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
                      end
                      className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm
                                text-sidebar-foreground/80 hover:text-white
                                hover:bg-sidebar-accent/40 transition-all duration-200
                                group overflow-hidden"
                      activeClassName="bg-gradient-to-r from-primary/25 via-primary/10 to-transparent
                                      text-sidebar-primary font-medium shadow-[0_0_0_1px_hsl(var(--primary)/0.45)]"
                    >
                      {/* Left active accent bar */}
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
          {/* Avatar with loading state */}
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
                {/* Username */}
                <p className="text-sm font-medium text-sidebar-foreground truncate group-hover:text-white transition-colors">
                  {isLoading ? (
                    <span className="inline-block w-20 h-4 bg-white/10 rounded animate-pulse" />
                  ) : (
                    displayName
                  )}
                </p>

                {/* Account Type Badge */}
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

              {/* Settings Icon */}
              <Settings
                className={cn(
                  "h-4 w-4 text-muted-foreground shrink-0 transition-all duration-200",
                  "group-hover:text-white group-hover:rotate-45"
                )}
              />
            </>
          )}
        </div>

        {/* Tooltip for collapsed state */}
        {isCollapsed && user && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-background/95 border border-border rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs">
            <p className="font-medium">{displayName}</p>
            <p className="text-muted-foreground">{accountType}</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

// Export theme hook for use in other components
export { useTheme, type ThemeId };