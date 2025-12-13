"use client";

import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, CalendarDays, TrendingUp, TrendingDown } from "lucide-react";
import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
  useRef,
  memo,
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

// Ticker Styles
const TICKER_STYLES = `
  .dash-ticker { animation: dash-ticker 30s linear infinite; }
  @keyframes dash-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @media (prefers-reduced-motion: reduce) {
    .dash-ticker { animation: none !important; }
  }
`;

// Types
interface MarketData {
  symbol: string;
  price: string;
  change: number;
  isUp: boolean;
}

interface LayoutProps {
  children: ReactNode;
}

type UserSnippet = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

// Utility function
const formatPercent = (value: number): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

// Custom hook for market data
const useMarketData = () => {
  const [data, setData] = useState<MarketData[]>([
    { symbol: "BTC/USD", price: "---", change: 0, isUp: true },
    { symbol: "ETH/USD", price: "---", change: 0, isUp: true },
    { symbol: "SPY", price: "---", change: 0, isUp: true },
    { symbol: "EUR/USD", price: "---", change: 0, isUp: false },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
        );
        const cryptoData = await response.json();

        setData([
          {
            symbol: "BTC/USD",
            price: cryptoData.bitcoin?.usd?.toLocaleString() || "67,234",
            change: cryptoData.bitcoin?.usd_24h_change || 2.3,
            isUp: (cryptoData.bitcoin?.usd_24h_change || 0) >= 0,
          },
          {
            symbol: "ETH/USD",
            price: cryptoData.ethereum?.usd?.toLocaleString() || "3,456",
            change: cryptoData.ethereum?.usd_24h_change || 1.5,
            isUp: (cryptoData.ethereum?.usd_24h_change || 0) >= 0,
          },
          { symbol: "SPY", price: "478.32", change: 0.45, isUp: true },
          { symbol: "EUR/USD", price: "1.0872", change: -0.12, isUp: false },
        ]);
      } catch (error) {
        console.error("Failed to fetch market data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return data;
};

// Market Ticker Component
const MarketTicker = memo(() => {
  const data = useMarketData();

  // Use 4 copies to ensure -50% translation lands on an identical frame for seamless looping
  const displayData = [...data, ...data, ...data, ...data];

  return (
    // Fixed height h-10 (40px) matches the pt-10 layout padding perfectly
    <div className="fixed top-0 left-0 right-0 z-50 h-10 overflow-hidden bg-black/60 backdrop-blur-xl border-b border-white/5">
      <div className="dash-ticker flex h-full items-center whitespace-nowrap">
        {displayData.map((item, i) => (
          <div key={i} className="flex items-center gap-4 mx-8">
            <span className="text-gray-400 text-sm font-medium">{item.symbol}</span>
            <span className="text-white text-sm font-bold">{item.price}</span>
            <span
              className={cn(
                "text-xs font-semibold flex items-center gap-1",
                item.isUp ? "text-emerald-400" : "text-red-400"
              )}
            >
              {item.isUp ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {formatPercent(item.change)}
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
MarketTicker.displayName = "MarketTicker";

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const stylesInjected = useRef(false);

  const [user, setUser] = useState<UserSnippet | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Inject ticker styles
  useEffect(() => {
    if (!stylesInjected.current) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "ticker-animations";
      styleSheet.textContent = TICKER_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }

    return () => {
      const existingStyle = document.getElementById("ticker-animations");
      if (existingStyle) existingStyle.remove();
    };
  }, []);

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
        // ignore; header still works without user
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

  return (
    <SidebarProvider>
      {/* Market Ticker - Fixed at top */}
      <MarketTicker />
      
      {/* pt-10 creates exactly 40px space, matching h-10 ticker */}
      <div className="flex min-h-screen w-full bg-[#05060b] text-foreground pt-10">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Top App Bar - Sticky top-10 sticks exactly below the 40px ticker */}
          <header
            className="sticky top-10 z-40 flex h-16 items-center gap-4 border-b border-border
                       bg-gradient-to-r from-background/95 via-background/80 to-background/95
                       backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
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
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
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
                  disabled={isSigningOut}
                  className={cn(
                    "gap-1.5 ml-1 text-xs font-medium transition-all duration-200",
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
                    {isSigningOut ? "Signing out..." : "Sign Out"}
                  </span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default Layout;