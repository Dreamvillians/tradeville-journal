"use client";

import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, CalendarDays, X, PanelLeftClose } from "lucide-react";
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
import { cn } from "@/lib/utils";

// Types
interface LayoutProps {
  children: ReactNode;
}

type UserSnippet = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

// Inner component that can access sidebar context
function LayoutContent({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { open, setOpen, isMobile, openMobile, setOpenMobile } = useSidebar();

  const [user, setUser] = useState<UserSnippet | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Fetch User
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
      } catch {
        // ignore
      }
    };
    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setIsSigningOut(false);
    
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

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile && openMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname]);

  const handleCloseSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  const currentTitle = useMemo(() => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/journal")) return "Journal";
    if (path.startsWith("/playbook")) return "Playbook";
    if (path.startsWith("/analytics")) return "Analytics";
    if (path.startsWith("/goals-habits")) return "Goals & Habits";
    return "Overview";
  }, [location.pathname]);

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

  const todayLabel = format(new Date(), "EEE, MMM d");

  const isSidebarOpen = isMobile ? openMobile : open;

  return (
    <div className="flex h-screen w-full bg-[#05060b] text-foreground overflow-hidden">
      
      {/* Mobile Overlay - Click to close sidebar */}
      {isMobile && openMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-in fade-in-0 duration-200"
          onClick={handleCloseSidebar}
          aria-label="Close sidebar"
        />
      )}
      
      {/* Sidebar */}
      <div className="relative">
        <AppSidebar />
        
        {/* Mobile Close Button - Inside Sidebar */}
        {isMobile && openMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseSidebar}
            className={cn(
              "fixed top-4 right-4 z-50 md:hidden",
              "h-9 w-9 rounded-full",
              "bg-gray-800/80 hover:bg-gray-700/80",
              "border border-gray-700/50",
              "text-gray-400 hover:text-white",
              "backdrop-blur-sm",
              "transition-all duration-200",
              "hover:scale-105 active:scale-95",
              "shadow-lg"
            )}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        
        <header
          className="flex h-16 shrink-0 items-center gap-4 border-b border-border
                     bg-gradient-to-r from-background/95 via-background/80 to-background/95
                     backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 z-40 w-full"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Custom Sidebar Trigger with close indicator on mobile */}
            <div className="relative shrink-0">
              <SidebarTrigger 
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  isSidebarOpen && "text-primary"
                )} 
              />
              {/* Indicator dot when sidebar is open on mobile */}
              {isMobile && openMobile && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
            
            <Separator orientation="vertical" className="h-6 hidden sm:block shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 hidden sm:block truncate">
                Workspace
              </span>
              <span className="text-sm md:text-base font-semibold truncate">
                {currentTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile: Show close sidebar button in header when open */}
            {isMobile && openMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseSidebar}
                className={cn(
                  "md:hidden gap-1.5 text-xs",
                  "border-gray-700 bg-gray-800/50",
                  "hover:bg-gray-700/50 hover:text-white",
                  "transition-all duration-200"
                )}
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
                <span>Close</span>
              </Button>
            )}
            
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground whitespace-nowrap">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{todayLabel}</span>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-2 py-1">
              <Avatar className="h-8 w-8 border border-white/10 shrink-0">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-[11px] font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="hidden md:flex flex-col leading-tight min-w-0 max-w-[140px]">
                <span className="text-xs font-medium truncate">
                  {user?.name || "Guest Trader"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {user?.email || "Not signed in"}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={cn(
                  "gap-1.5 ml-1 text-xs font-medium transition-all duration-200 shrink-0",
                  "text-gray-400 hover:text-red-400",
                  "hover:bg-red-500/10 hover:border-red-500/20",
                  "active:bg-red-500/20 active:scale-95",
                  "rounded-lg px-2.5 py-1.5",
                  "group"
                )}
              >
                <LogOut 
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    "group-hover:translate-x-0.5 group-hover:-rotate-12"
                  )} 
                />
                <span className="hidden sm:inline">
                  {isSigningOut ? "..." : "Exit"}
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}

// Main Layout wrapper that provides the sidebar context
export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

export default Layout;