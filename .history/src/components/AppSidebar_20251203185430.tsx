"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Home,
  TrendingUp,
  Target,
  Sparkles,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Playbook", url: "/playbook", icon: TrendingUp },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Goals & Habits", url: "/goals-habits", icon: Target },
];

type UserSnippet = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [user, setUser] = useState<UserSnippet | null>(null);

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
        // silently ignore; sidebar still works
      }
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const initials = (() => {
    if (!user) return "TV";
    const source =
      user.name || user.email || "TV";
    return source
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  })();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-sidebar-background/95 backdrop-blur-xl
                 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),transparent_55%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.16),transparent_55%)]"
    >
      <SidebarContent className="flex h-full flex-col">
        {/* Brand / Header */}
        <div className="px-4 pt-5 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative inline-flex items-center justify-center h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg shadow-emerald-500/40">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-serif font-bold bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  Tradeville
                </h1>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/80">
                  Trading OS
                </p>
              </div>
            )}
          </div>
        </div>

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
                        <span className="truncate">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer: Focus card + user snippet */}
        <div className="mt-auto px-3 pb-4 pt-2 space-y-3">
          {/* Today’s Focus */}
          <div className="rounded-2xl border border-white/10 bg-sidebar-accent/20 px-3 py-3 text-xs text-muted-foreground">
            {!isCollapsed ? (
              <>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  Today’s Focus
                </p>
                <p className="text-[12px] text-gray-300">
                  Review your{" "}
                  <span className="font-semibold">
                    Journal
                  </span>{" "}
                  and update{" "}
                  <span className="font-semibold">
                    Goals &amp; Habits
                  </span>{" "}
                  before the session.
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 text-emerald-300">
                <Sparkles className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* User profile snippet */}
          <div className="rounded-2xl border border-white/10 bg-sidebar-accent/40 px-3 py-2.5 flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-white/20">
              {user?.avatarUrl && (
                <AvatarImage src={user.avatarUrl} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-[11px] font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>

            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {user?.name || "Guest Trader"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email || "Not signed in"}
                </p>
              </div>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}