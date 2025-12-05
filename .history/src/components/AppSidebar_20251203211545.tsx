"use client";

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
import { useEffect, useState, useMemo } from "react";
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

  // Fetch User Data on Mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        setUser({
          name: meta.full_name || meta.name || "Trader",
          email: user.email || "",
          avatarUrl: meta.avatar_url || meta.picture || null,
        });
      }
    };
    getUser();
  }, []);

  // Calculate Initials for Fallback
  const userInitials = useMemo(() => {
    const name = user?.name || "TV";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  return (
    <Sidebar
      collapsible="icon"
      // Added mt-10 to push it down below the Market Bar
      // Added !h-[calc(100vh-2.5rem)] to ensure it doesn't overflow vertically
      className="mt-10 !h-[calc(100vh-2.5rem)] border-r border-border bg-sidebar-background/95 backdrop-blur-xl
                 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),transparent_55%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.16),transparent_55%)]"
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
            "flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent/50 transition-colors cursor-pointer group",
            isCollapsed ? "justify-center" : "justify-start"
          )}
        >
          <Avatar className="h-9 w-9 border border-white/10 bg-sidebar-accent shadow-sm shrink-0">
            <AvatarImage src={user?.avatarUrl || ""} alt={user?.name || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400 text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>

          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate group-hover:text-white transition-colors">
                  {user?.name || "Guest Trader"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user?.email || "Basic Account"}
                </p>
              </div>
              <Settings className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors shrink-0" />
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}