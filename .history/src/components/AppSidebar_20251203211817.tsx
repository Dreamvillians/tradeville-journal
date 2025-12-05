import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  BookOpen,
  Home,
  TrendingUp,
  Target,
  Sparkles,
  User,
  Settings,
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Playbook", url: "/playbook", icon: TrendingUp },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Goals & Habits", url: "/goals-habits", icon: Target },
];

type UserProfile = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      }
    );

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
      // Extract username from email (before @)
      return user.email.split("@")[0];
    }
    return "Trader";
  }, [user]);

  // Account type badge
  const accountType = "Pro Account"; // This could come from your database/subscription status

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-sidebar-background/95 backdrop-blur-xl
                bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),transparent_55%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.16),transparent_55%)]
                pt-10"
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-6 border-b border-white/5">
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="relative inline-flex items-center justify-center h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg shadow-emerald-500/40 shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-serif font-bold bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent whitespace-nowrap">
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
                      activeClassName="bg-gradient-to-r from-emerald-500/25 via-emerald-500/10 to-transparent
                                      text-sidebar-primary font-medium shadow-[0_0_0_1px_rgba(16,185,129,0.45)]"
                    >
                      {/* Left active accent bar */}
                      <span className="absolute left-0 top-0 h-full w-0.5 bg-emerald-400/70 opacity-0 group-[&.active]:opacity-100" />
                      <item.icon className="h-5 w-5 shrink-0 text-sidebar-foreground/80 group-[&.active]:text-emerald-400" />
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
                "bg-gradient-to-br from-emerald-500 to-blue-600"
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
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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