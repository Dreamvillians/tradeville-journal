// Dashboard.tsx
import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Flame,
  BookOpen,
  PlusCircle,
  Calendar,
  Clock,
  DollarSign,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Zap,
  Award,
  Trophy,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Settings,
  Bell,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  LayoutGrid,
  List,
  MoreHorizontal,
  ExternalLink,
  Wallet,
  CreditCard,
  Percent,
  Hash,
  Timer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Play,
  Pause,
  SkipForward,
  Volume2,
  Sun,
  Moon,
  Globe,
  Shield,
  Lock,
  Unlock,
  Gift,
  Heart,
  Share2,
  Copy,
  Maximize2,
  Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  Legend,
  RadialBarChart,
  RadialBar
} from "recharts";

// ============================================
// TYPES
// ============================================
interface Trade {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number;
  profit_loss_currency: number;
  profit_loss_percent: number;
  opened_at: string;
  closed_at: string;
  strategy?: string;
  notes?: string;
  r_multiple?: number;
  quantity: number;
}

interface MarketData {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

// ============================================
// STYLES
// ============================================
const DASHBOARD_STYLES = `
  /* Base Animations */
  .dash-float { animation: dash-float 6s ease-in-out infinite; }
  .dash-pulse { animation: dash-pulse 2s ease-in-out infinite; }
  .dash-glow { animation: dash-glow 3s ease-in-out infinite; }
  .dash-shimmer { animation: dash-shimmer 2s linear infinite; background-size: 200% 100%; }
  .dash-slide-up { animation: dash-slide-up 0.5s ease-out forwards; }
  .dash-fade-in { animation: dash-fade-in 0.6s ease-out forwards; }
  .dash-scale-in { animation: dash-scale-in 0.4s ease-out forwards; }
  .dash-bounce { animation: dash-bounce 1s ease infinite; }
  .dash-spin-slow { animation: dash-spin 20s linear infinite; }
  .dash-ticker { animation: dash-ticker 30s linear infinite; }
  .dash-gradient-x { animation: dash-gradient-x 3s ease infinite; background-size: 200% 100%; }
  .dash-counter { animation: dash-counter 2s ease-out forwards; }
  .dash-streak-fire { animation: dash-streak-fire 0.5s ease-in-out infinite alternate; }
  .dash-card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .dash-card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(16, 185, 129, 0.15); }
  
  @keyframes dash-float { 
    0%, 100% { transform: translateY(0) rotate(0deg); } 
    50% { transform: translateY(-20px) rotate(5deg); } 
  }
  @keyframes dash-pulse { 
    0%, 100% { opacity: 1; transform: scale(1); } 
    50% { opacity: 0.7; transform: scale(1.05); } 
  }
  @keyframes dash-glow { 
    0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); } 
    50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); } 
  }
  @keyframes dash-shimmer { 
    0% { background-position: -200% 0; } 
    100% { background-position: 200% 0; } 
  }
  @keyframes dash-slide-up { 
    0% { opacity: 0; transform: translateY(20px); } 
    100% { opacity: 1; transform: translateY(0); } 
  }
  @keyframes dash-fade-in { 
    0% { opacity: 0; } 
    100% { opacity: 1; } 
  }
  @keyframes dash-scale-in { 
    0% { opacity: 0; transform: scale(0.9); } 
    100% { opacity: 1; transform: scale(1); } 
  }
  @keyframes dash-bounce { 
    0%, 100% { transform: translateY(0); } 
    50% { transform: translateY(-5px); } 
  }
  @keyframes dash-spin { 
    from { transform: rotate(0deg); } 
    to { transform: rotate(360deg); } 
  }
  @keyframes dash-ticker { 
    0% { transform: translateX(0); } 
    100% { transform: translateX(-50%); } 
  }
  @keyframes dash-gradient-x { 
    0%, 100% { background-position: 0% 50%; } 
    50% { background-position: 100% 50%; } 
  }
  @keyframes dash-counter { 
    from { opacity: 0; transform: translateY(10px); } 
    to { opacity: 1; transform: translateY(0); } 
  }
  @keyframes dash-streak-fire { 
    0% { transform: scale(1) rotate(-5deg); filter: brightness(1); } 
    100% { transform: scale(1.1) rotate(5deg); filter: brightness(1.2); } 
  }

  /* Scrollbar Styling */
  .dash-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
  .dash-scroll::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 3px; }
  .dash-scroll::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.3); border-radius: 3px; }
  .dash-scroll::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.5); }

  /* Card Glass Effect */
  .dash-glass {
    background: rgba(18, 19, 26, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  /* Gradient Borders */
  .dash-gradient-border {
    position: relative;
  }
  .dash-gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.5), rgba(59, 130, 246, 0.5));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    border-radius: inherit;
    pointer-events: none;
  }

  /* Number Animation */
  .dash-number {
    font-variant-numeric: tabular-nums;
  }

  /* Hide on mobile */
  @media (max-width: 768px) {
    .dash-hide-mobile { display: none; }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .dash-float, .dash-pulse, .dash-glow, .dash-shimmer, .dash-bounce,
    .dash-spin-slow, .dash-ticker, .dash-streak-fire { animation: none !important; }
    .dash-card-hover:hover { transform: none; }
  }
`;

// ============================================
// UTILITY FUNCTIONS
// ============================================
const formatCurrency = (value: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const formatNumber = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(2);
};

const getTimeAgo = (date: string) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
};

// ============================================
// CUSTOM HOOKS
// ============================================
const useLiveMarketData = () => {
  const [marketData, setMarketData] = useState<MarketData[]>([
    { symbol: 'BTC/USD', price: '67,234', change: '+1,234', changePercent: '+2.3%', isUp: true },
    { symbol: 'ETH/USD', price: '3,456', change: '+89', changePercent: '+1.5%', isUp: true },
    { symbol: 'SPY', price: '512.34', change: '-2.45', changePercent: '-0.5%', isUp: false },
    { symbol: 'AAPL', price: '178.32', change: '+3.21', changePercent: '+1.8%', isUp: true },
    { symbol: 'TSLA', price: '245.67', change: '-8.90', changePercent: '-3.5%', isUp: false },
    { symbol: 'EUR/USD', price: '1.0876', change: '+0.0012', changePercent: '+0.1%', isUp: true },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
        );
        if (response.ok) {
          const data = await response.json();
          setMarketData(prev => prev.map(item => {
            if (item.symbol === 'BTC/USD' && data.bitcoin) {
              const change = data.bitcoin.usd_24h_change || 0;
              return {
                ...item,
                price: data.bitcoin.usd.toLocaleString(),
                changePercent: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
                isUp: change >= 0
              };
            }
            if (item.symbol === 'ETH/USD' && data.ethereum) {
              const change = data.ethereum.usd_24h_change || 0;
              return {
                ...item,
                price: data.ethereum.usd.toLocaleString(),
                changePercent: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
                isUp: change >= 0
              };
            }
            return item;
          }));
        }
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return marketData;
};

const useAnimatedCounter = (end: number, duration = 2000, decimals = 0) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = easeOutQuart * end;
      
      setCount(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = null;
    requestAnimationFrame(animate);
  }, [end, duration]);

  return decimals > 0 ? count.toFixed(decimals) : Math.floor(count);
};

// ============================================
// ANIMATED BACKGROUND COMPONENT
// ============================================
const AnimatedBackground = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    {/* Gradient Orbs */}
    <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] dash-float" />
    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/15 rounded-full blur-[120px] dash-float" style={{ animationDelay: '-3s' }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] dash-pulse" />
    
    {/* Grid Pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:60px_60px]" />
    
    {/* Noise Texture */}
    <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%" height="100%" filter="url(%23noise)"/%3E%3C/svg%3E")' }} />
  </div>
));
AnimatedBackground.displayName = 'AnimatedBackground';

// ============================================
// MARKET TICKER COMPONENT
// ============================================
const MarketTicker = memo(({ data }: { data: MarketData[] }) => (
  <div className="w-full overflow-hidden bg-black/40 backdrop-blur-sm border-b border-white/5">
    <div className="dash-ticker flex whitespace-nowrap py-2">
      {[...data, ...data, ...data].map((item, i) => (
        <div key={i} className="flex items-center gap-6 mx-8">
          <span className="text-gray-400 text-sm font-medium">{item.symbol}</span>
          <span className="text-white text-sm font-bold dash-number">${item.price}</span>
          <span className={cn(
            "text-xs font-semibold flex items-center gap-1",
            item.isUp ? "text-emerald-400" : "text-red-400"
          )}>
            {item.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {item.changePercent}
          </span>
        </div>
      ))}
    </div>
  </div>
));
MarketTicker.displayName = 'MarketTicker';

// ============================================
// ANIMATED STAT CARD COMPONENT
// ============================================
const AnimatedStatCard = memo(({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  color = "emerald",
  delay = 0,
  prefix = "",
  suffix = "",
  isPercentage = false,
  isCurrency = false
}: { 
  title: string;
  value: number | string;
  subtitle?: string;
  icon: typeof Target;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'emerald' | 'blue' | 'purple' | 'orange' | 'red' | 'yellow';
  delay?: number;
  prefix?: string;
  suffix?: string;
  isPercentage?: boolean;
  isCurrency?: boolean;
}) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const animatedValue = useAnimatedCounter(numericValue, 2000, isPercentage ? 1 : isCurrency ? 2 : 0);
  
  const colorClasses = {
    emerald: {
      bg: 'from-emerald-500/20 to-emerald-600/10',
      border: 'border-emerald-500/30',
      icon: 'from-emerald-500 to-emerald-600',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/20',
    },
    blue: {
      bg: 'from-blue-500/20 to-blue-600/10',
      border: 'border-blue-500/30',
      icon: 'from-blue-500 to-blue-600',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/20',
    },
    purple: {
      bg: 'from-purple-500/20 to-purple-600/10',
      border: 'border-purple-500/30',
      icon: 'from-purple-500 to-purple-600',
      text: 'text-purple-400',
      glow: 'shadow-purple-500/20',
    },
    orange: {
      bg: 'from-orange-500/20 to-orange-600/10',
      border: 'border-orange-500/30',
      icon: 'from-orange-500 to-orange-600',
      text: 'text-orange-400',
      glow: 'shadow-orange-500/20',
    },
    red: {
      bg: 'from-red-500/20 to-red-600/10',
      border: 'border-red-500/30',
      icon: 'from-red-500 to-red-600',
      text: 'text-red-400',
      glow: 'shadow-red-500/20',
    },
    yellow: {
      bg: 'from-yellow-500/20 to-yellow-600/10',
      border: 'border-yellow-500/30',
      icon: 'from-yellow-500 to-yellow-600',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-500/20',
    },
  };

  const colors = colorClasses[color];

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 dash-card-hover dash-slide-up dash-glass",
        colors.bg, colors.border
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Glow effect */}
      <div className={cn(
        "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30",
        `bg-${color}-500`
      )} />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white dash-number">
              {prefix}
              {typeof value === 'number' ? animatedValue : value}
              {suffix}
            </span>
          </div>
          {(subtitle || trendValue) && (
            <div className="flex items-center gap-2">
              {trend && (
                <span className={cn(
                  "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                  trend === 'up' && "bg-emerald-500/20 text-emerald-400",
                  trend === 'down' && "bg-red-500/20 text-red-400",
                  trend === 'neutral' && "bg-gray-500/20 text-gray-400"
                )}>
                  {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                  {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                  {trendValue}
                </span>
              )}
              {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
            </div>
          )}
        </div>
        
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br shadow-lg",
          colors.icon, colors.glow
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
});
AnimatedStatCard.displayName = 'AnimatedStatCard';

// ============================================
// WELCOME BANNER COMPONENT
// ============================================
const WelcomeBanner = memo(({ 
  userName,
  accountBalance,
  todayPnL,
  todayTrades 
}: { 
  userName: string;
  accountBalance: number;
  todayPnL: number;
  todayTrades: number;
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, [currentTime]);

  const marketStatus = useMemo(() => {
    const hour = currentTime.getHours();
    const day = currentTime.getDay();
    const isWeekend = day === 0 || day === 6;
    const isMarketHours = hour >= 9 && hour < 16;
    
    if (isWeekend) return { status: 'Closed', color: 'text-red-400', dot: 'bg-red-500' };
    if (isMarketHours) return { status: 'Market Open', color: 'text-emerald-400', dot: 'bg-emerald-500' };
    return { status: 'Pre/After Hours', color: 'text-yellow-400', dot: 'bg-yellow-500' };
  }, [currentTime]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#12131a]/90 to-[#0a0b0f]/90 backdrop-blur-xl p-6 lg:p-8 dash-slide-up dash-glass">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/15 to-transparent rounded-full blur-2xl" />
      
      {/* Decorative chart lines */}
      <svg className="absolute right-8 top-1/2 -translate-y-1/2 w-48 h-32 text-emerald-500/20 dash-hide-mobile" viewBox="0 0 200 100">
        <path 
          d="M0 80 Q 25 70, 50 60 T 100 40 T 150 50 T 200 20" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path 
          d="M0 80 Q 25 70, 50 60 T 100 40 T 150 50 T 200 20 L 200 100 L 0 100 Z" 
          fill="url(#gradient)" 
          opacity="0.3"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side - Greeting */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-14 h-14 border-2 border-emerald-500/50">
                <AvatarImage src="/avatar.jpg" />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-lg font-bold">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#0a0b0f] flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                {greeting}, <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">{userName}</span>
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-400">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-sm text-gray-400 font-mono">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
          
          {/* Market Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", marketStatus.dot)} />
              <span className={cn("text-sm font-medium", marketStatus.color)}>{marketStatus.status}</span>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              <Zap className="w-3 h-3 mr-1" />
              Pro Trader
            </Badge>
          </div>
        </div>
        
        {/* Right side - Account Stats */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-end gap-6">
          {/* Account Balance */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Account Balance</span>
              <button 
                onClick={() => setShowBalance(!showBalance)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-3xl lg:text-4xl font-bold text-white dash-number">
              {showBalance ? formatCurrency(accountBalance) : '••••••••'}
            </div>
          </div>
          
          {/* Divider */}
          <div className="hidden lg:block w-px h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          
          {/* Today's Stats */}
          <div className="flex gap-6">
            <div className="space-y-1">
              <span className="text-sm text-gray-400">Today's P&L</span>
              <div className={cn(
                "text-2xl font-bold dash-number flex items-center gap-1",
                todayPnL >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {todayPnL >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                {formatCurrency(Math.abs(todayPnL))}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-gray-400">Today's Trades</span>
              <div className="text-2xl font-bold text-white dash-number">
                {todayTrades}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="relative z-10 flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/5">
        <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/25">
          <PlusCircle className="w-4 h-4" />
          Log Trade
        </Button>
        <Button variant="outline" className="border-white/10 hover:bg-white/5 gap-2">
          <BookOpen className="w-4 h-4" />
          Playbook
        </Button>
        <Button variant="outline" className="border-white/10 hover:bg-white/5 gap-2">
          <BarChart3 className="w-4 h-4" />
          Analytics
        </Button>
        <Button variant="ghost" className="text-gray-400 hover:text-white gap-2 ml-auto">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>
    </div>
  );
});
WelcomeBanner.displayName = 'WelcomeBanner';

// ============================================
// EQUITY CURVE CHART COMPONENT
// ============================================
const EquityCurveChart = memo(({ trades }: { trades: Trade[] }) => {
  const [timeframe, setTimeframe] = useState<'1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  
  const chartData = useMemo(() => {
    if (!trades?.length) {
      // Generate demo data
      const baseValue = 10000;
      return Array.from({ length: 30 }, (_, i) => {
        const randomChange = (Math.random() - 0.4) * 500;
        const value = baseValue + (i * 300) + randomChange;
        return {
          date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: Math.max(value, baseValue * 0.8),
          profit: randomChange > 0 ? randomChange : 0,
          loss: randomChange < 0 ? Math.abs(randomChange) : 0,
        };
      });
    }

    let cumulative = 10000;
    return trades
      .slice()
      .sort((a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime())
      .map(trade => {
        cumulative += trade.profit_loss_currency || 0;
        return {
          date: new Date(trade.closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: cumulative,
          profit: trade.profit_loss_currency > 0 ? trade.profit_loss_currency : 0,
          loss: trade.profit_loss_currency < 0 ? Math.abs(trade.profit_loss_currency) : 0,
        };
      });
  }, [trades]);

  const stats = useMemo(() => {
    if (!chartData.length) return { change: 0, changePercent: 0, high: 0, low: 0 };
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const change = last - first;
    const changePercent = (change / first) * 100;
    const high = Math.max(...chartData.map(d => d.value));
    const low = Math.min(...chartData.map(d => d.value));
    return { change, changePercent, high, low };
  }, [chartData]);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12131a]/90 to-[#0a0b0f]/90 backdrop-blur-xl overflow-hidden dash-slide-up dash-glass" style={{ animationDelay: '300ms' }}>
      <div className="p-6 border-b border-white/5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-emerald-400" />
              Equity Curve
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-3xl font-bold text-white dash-number">
                {formatCurrency(chartData[chartData.length - 1]?.value || 0)}
              </span>
              <span className={cn(
                "flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full",
                stats.change >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              )}>
                {stats.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {formatCurrency(Math.abs(stats.change))} ({formatPercent(stats.changePercent)})
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {(['1W', '1M', '3M', '1Y', 'ALL'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  timeframe === tf 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${formatNumber(value)}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(18, 19, 26, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
                }}
                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                itemStyle={{ color: '#10b981' }}
                formatter={(value: number) => [formatCurrency(value), 'Equity']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#equityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Chart Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
          <div className="text-center">
            <span className="text-xs text-gray-500 uppercase tracking-wider">High</span>
            <p className="text-lg font-bold text-white mt-1">{formatCurrency(stats.high)}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Low</span>
            <p className="text-lg font-bold text-white mt-1">{formatCurrency(stats.low)}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Trades</span>
            <p className="text-lg font-bold text-white mt-1">{trades?.length || 0}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Max DD</span>
            <p className="text-lg font-bold text-red-400 mt-1">-8.3%</p>
          </div>
        </div>
      </div>
    </div>
  );
});
EquityCurveChart.displayName = 'EquityCurveChart';

// ============================================
// RECENT TRADES COMPONENT
// ============================================
const RecentTrades = memo(({ trades }: { trades: Trade[] }) => {
  const recentTrades = useMemo(() => {
    if (!trades?.length) {
      // Demo data
      return [
        { id: '1', symbol: 'AAPL', direction: 'long', profit_loss_currency: 234.50, profit_loss_percent: 2.3, opened_at: new Date(Date.now() - 3600000).toISOString(), strategy: 'Breakout' },
        { id: '2', symbol: 'TSLA', direction: 'short', profit_loss_currency: -89.20, profit_loss_percent: -1.2, opened_at: new Date(Date.now() - 7200000).toISOString(), strategy: 'Mean Reversion' },
        { id: '3', symbol: 'NVDA', direction: 'long', profit_loss_currency: 567.80, profit_loss_percent: 4.5, opened_at: new Date(Date.now() - 14400000).toISOString(), strategy: 'Momentum' },
        { id: '4', symbol: 'SPY', direction: 'long', profit_loss_currency: 123.45, profit_loss_percent: 1.8, opened_at: new Date(Date.now() - 28800000).toISOString(), strategy: 'Trend Following' },
        { id: '5', symbol: 'QQQ', direction: 'short', profit_loss_currency: -45.67, profit_loss_percent: -0.7, opened_at: new Date(Date.now() - 43200000).toISOString(), strategy: 'Scalp' },
      ] as Trade[];
    }
    return trades.slice(0, 5);
  }, [trades]);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12131a]/90 to-[#0a0b0f]/90 backdrop-blur-xl overflow-hidden dash-slide-up dash-glass" style={{ animationDelay: '400ms' }}>
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          Recent Trades
        </h3>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white gap-1">
          View All
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      
      <ScrollArea className="h-[320px] dash-scroll">
        <div className="p-4 space-y-3">
          {recentTrades.map((trade, i) => (
            <div 
              key={trade.id}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {/* Direction indicator */}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  trade.direction === 'long' 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : "bg-red-500/20 text-red-400"
                )}>
                  {trade.direction === 'long' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{trade.symbol}</span>
                    <Badge variant="outline" className="text-xs border-white/10 text-gray-400">
                      {trade.direction.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{trade.strategy || 'Manual'}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-xs text-gray-500">{getTimeAgo(trade.opened_at)}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={cn(
                  "font-bold dash-number",
                  trade.profit_loss_currency >= 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  {trade.profit_loss_currency >= 0 ? '+' : ''}{formatCurrency(trade.profit_loss_currency)}
                </div>
                <div className={cn(
                  "text-xs",
                  trade.profit_loss_percent >= 0 ? "text-emerald-400/70" : "text-red-400/70"
                )}>
                  {formatPercent(trade.profit_loss_percent)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});
RecentTrades.displayName = 'RecentTrades';

// ============================================
// PERFORMANCE BREAKDOWN COMPONENT
// ============================================
const PerformanceBreakdown = memo(({ trades }: { trades: Trade[] }) => {
  const [view, setView] = useState<'strategy' | 'symbol' | 'weekday'>('strategy');
  
  const data = useMemo(() => {
    // Demo data
    const strategyData = [
      { name: 'Breakout', value: 45, profit: 2340, trades: 23, color: '#10b981' },
      { name: 'Momentum', value: 25, profit: 1250, trades: 15, color: '#3b82f6' },
      { name: 'Mean Reversion', value: 20, profit: -450, trades: 12, color: '#f59e0b' },
      { name: 'Scalp', value: 10, profit: 120, trades: 8, color: '#8b5cf6' },
    ];
    
    const symbolData = [
      { name: 'SPY', value: 30, profit: 1890, trades: 45, color: '#10b981' },
      { name: 'QQQ', value: 25, profit: 1230, trades: 38, color: '#3b82f6' },
      { name: 'AAPL', value: 20, profit: 890, trades: 25, color: '#f59e0b' },
      { name: 'TSLA', value: 15, profit: -340, trades: 18, color: '#8b5cf6' },
      { name: 'NVDA', value: 10, profit: 560, trades: 12, color: '#ec4899' },
    ];
    
    const weekdayData = [
      { name: 'Mon', value: 20, profit: 450, trades: 12, color: '#10b981' },
      { name: 'Tue', value: 22, profit: 780, trades: 15, color: '#3b82f6' },
      { name: 'Wed', value: 18, profit: -120, trades: 10, color: '#f59e0b' },
      { name: 'Thu', value: 25, profit: 1230, trades: 18, color: '#8b5cf6' },
      { name: 'Fri', value: 15, profit: 340, trades: 8, color: '#ec4899' },
    ];

    if (view === 'symbol') return symbolData;
    if (view === 'weekday') return weekdayData;
    return strategyData;
  }, [view, trades]);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12131a]/90 to-[#0a0b0f]/90 backdrop-blur-xl overflow-hidden dash-slide-up dash-glass" style={{ animationDelay: '500ms' }}>
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            Performance Breakdown
          </h3>
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {(['strategy', 'symbol', 'weekday'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium transition-all capitalize",
                  view === v 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : "text-gray-400 hover:text-white"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-white font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "font-bold dash-number text-sm",
                    item.profit >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {item.profit >= 0 ? '+' : ''}{formatCurrency(item.profit)}
                  </div>
                  <div className="text-xs text-gray-500">{item.trades} trades</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
PerformanceBreakdown.displayName = 'PerformanceBreakdown';

// ============================================
// STREAK CARD COMPONENT
// ============================================
const StreakCard = memo(({ currentStreak, bestStreak }: { currentStreak: number; bestStreak: number }) => {
  const isHot = currentStreak >= 5;
  
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border p-6 dash-card-hover dash-slide-up",
      isHot 
        ? "border-orange-500/30 bg-gradient-to-br from-orange-500/20 via-red-500/10 to-yellow-500/20" 
        : "border-white/10 bg-gradient-to-br from-[#12131a]/90 to-[#0a0b0f]/90 dash-glass"
    )} style={{ animationDelay: '200ms' }}>
      {/* Fire effect when hot */}
      {isHot && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 via-transparent to-transparent" />
          <div className="absolute top-2 right-2">
            <Flame className="w-8 h-8 text-orange-500 dash-streak-fire" />
          </div>
        </>
      )}
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame className={cn("w-5 h-5", isHot ? "text-orange-400" : "text-gray-400")} />
            <span className="text-sm font-medium text-gray-400">Current Streak</span>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-5xl font-bold dash-number",
              isHot ? "text-orange-400" : "text-white"
            )}>
              {currentStreak}
            </span>
            <span className="text-lg text-gray-400">wins</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-400">Best: {bestStreak} wins</span>
          </div>
        </div>
        
        {isHot && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">On Fire!</span>
            <div className="flex gap-1 mt-2">
              {[...Array(Math.min(currentStreak, 5))].map((_, i) => (
                <Flame key={i} className="w-4 h-4 text-orange-400 dash-streak-fire" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
StreakCard.displayName = 'StreakCard';

// ============================================
// QUICK ACTIONS CARD
// ============================================
const QuickActionsCard = memo(({ onNavigate }: { onNavigate: (path: string) => void }) => (
  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12131a]/90 to-[#0a0b0f]/90 backdrop-blur-xl p-6 dash-slide-up dash-glass" style={{ animationDelay: '250ms' }}>
    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <Zap className="w-5 h-5 text-emerald-400" />
      Quick Actions
    </h3>
    
    <div className="space-y-3">
      <Button
        className="w-full h-14 justify-start gap-4 bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 hover:from-emerald-500/30 hover:to-emerald-600/20 border border-emerald-500/30 text-white"
        onClick={() => onNavigate('/journal')}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <PlusCircle className="w-5 h-5" />
        </div>
        <div className="text-left">
          <div className="font-semibold">Log New Trade</div>
          <div className="text-xs text-emerald-400/70">Record your latest trade</div>
        </div>
        <ChevronRight className="w-5 h-5 ml-auto text-emerald-400" />
      </Button>
      
      <Button
        variant="outline"
        className="w-full h-14 justify-start gap-4 border-white/10 hover:bg-white/5"
        onClick={() => onNavigate('/playbook')}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-blue-400" />
        </div>
        <div className="text-left">
          <div className="font-semibold text-white">Review Playbook</div>
          <div className="text-xs text-gray-500">Study your strategies</div>
        </div>
        <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
      </Button>
      
      <Button
        variant="outline"
        className="w-full h-14 justify-start gap-4 border-white/10 hover:bg-white/5"
        onClick={() => onNavigate('/analytics')}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-purple-400" />
        </div>
        <div className="text-left">
          <div className="font-semibold text-white">View Analytics</div>
          <div className="text-xs text-gray-500">Deep dive into stats</div>
        </div>
        <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
      </Button>
    </div>
  </div>
));
QuickActionsCard.displayName = 'QuickActionsCard';

// ============================================
// CALENDAR HEATMAP COMPONENT
// ============================================
const CalendarHeatmap = memo(({ trades }: { trades: Trade[] }) => {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  
  const calendarData = useMemo(() => {
    const data: { day: number; profit: number; trades: number }[] = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      // Demo data - in real app, filter trades by date
      const randomProfit = (Math.random() - 0.4) * 500;
      const randomTrades = Math.floor(Math.random() * 5);
      data.push({ day: i, profit: randomProfit, trades: randomTrades });
    }
    
    return data;
  }, [daysInMonth, trades]);

  const getColorClass = (profit: number, trades: number) => {
    if (trades === 0) return 'bg-white/5';
    if (profit > 300) return 'bg-emerald-500';
    if (profit > 100) return 'bg-emerald-500/70';
    if (profit > 0) return 'bg-emerald-500/40';
    if (profit > -100) return 'bg-red-500/40';
    if (profit > -300) return 'bg-red-500/70';
    return 'bg-red-500';
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12131a]/90 to-[#0a0b0f]/90 backdrop-blur-xl overflow-hidden dash-slide-up dash-glass" style={{ animationDelay: '600ms' }}>
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Trading Calendar
          </h3>
          <span className="text-sm text-gray-400">
            {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {[...Array(firstDayOfMonth)].map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {/* Day cells */}
          {calendarData.map((day) => (
            <div
              key={day.day}
              className={cn(
                "aspect-square rounded-lg flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:ring-2 hover:ring-white/20",
                getColorClass(day.profit, day.trades),
                day.day === today.getDate() && "ring-2 ring-emerald-500"
              )}
              title={`${day.trades} trades, ${formatCurrency(day.profit)}`}
            >
              {day.day}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-xs text-gray-400">Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-white/10" />
            <span className="text-xs text-gray-400">No Trade</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-xs text-gray-400">Profit</span>
          </div>
        </div>
      </div>
    </div>
  );
});
CalendarHeatmap.displayName = 'CalendarHeatmap';

// ============================================
// GOALS PROGRESS CARD
// ============================================
const GoalsCard = memo(() => {
  const goals = [
    { id: 1, title: 'Monthly P&L Target', current: 4250, target: 5000, unit: '$' },
    { id: 2, title: 'Win Rate Goal', current: 62, target: 70, unit: '%' },
    { id: 3, title: 'Trades This Month', current: 45, target: 60, unit: '' },
    { id: 4, title: 'Max Drawdown Limit', current: 5.2, target: 10, unit: '%', inverse: true },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12131a]/90 to-[#0a0b0f]/90 backdrop-blur-xl overflow-hidden dash-slide-up dash-glass" style={{ animationDelay: '700ms' }}>
      <div className="p-6 border-b border-white/5">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-400" />
          Monthly Goals
        </h3>
      </div>
      
      <div className="p-6 space-y-5">
        {goals.map((goal) => {
          const progress = goal.inverse 
            ? 100 - (goal.current / goal.target * 100)
            : (goal.current / goal.target) * 100;
          const isComplete = progress >= 100;
          
          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{goal.title}</span>
                <span className={cn(
                  "text-sm font-bold dash-number",
                  isComplete ? "text-emerald-400" : "text-white"
                )}>
                  {goal.unit === '$' ? '$' : ''}{goal.current}{goal.unit === '%' ? '%' : ''} / {goal.unit === '$' ? '$' : ''}{goal.target}{goal.unit === '%' ? '%' : ''}
                </span>
              </div>
              <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-1000",
                    isComplete 
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                      : progress > 75 
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                        : progress > 50
                          ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                          : "bg-gradient-to-r from-orange-500 to-orange-600"
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
GoalsCard.displayName = 'GoalsCard';

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
const Dashboard = () => {
  const navigate = useNavigate();
  const stylesInjected = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Inject styles
  useEffect(() => {
    if (!stylesInjected.current) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "dashboard-styles";
      styleSheet.textContent = DASHBOARD_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }
    
    setIsLoaded(true);
    
    return () => {
      const existingStyle = document.getElementById("dashboard-styles");
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  // Fetch trades
  const { data: trades, isLoading, refetch } = useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("opened_at", { ascending: false });
      if (error) throw error;
      return data as Trade[];
    },
  });

  // Get live market data
  const marketData = useLiveMarketData();

  // Calculate stats
  const stats = useMemo(() => {
    if (!trades?.length) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalPnL: 0,
        winRate: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        bestTrade: 0,
        worstTrade: 0,
        currentStreak: 0,
        bestStreak: 0,
        todayPnL: 0,
        todayTrades: 0,
      };
    }

    const wins = trades.filter(t => (t.profit_loss_currency || 0) > 0);
    const losses = trades.filter(t => (t.profit_loss_currency || 0) < 0);
    const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
    const winRate = (wins.length / trades.length) * 100;
    
    const totalWins = wins.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    
    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    
    const sortedByPnL = [...trades].sort((a, b) => (b.profit_loss_currency || 0) - (a.profit_loss_currency || 0));
    const bestTrade = sortedByPnL[0]?.profit_loss_currency || 0;
    const worstTrade = sortedByPnL[sortedByPnL.length - 1]?.profit_loss_currency || 0;

    // Calculate streak
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    const sortedTrades = [...trades].sort((a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime());
    
    for (const trade of sortedTrades) {
      if ((trade.profit_loss_currency || 0) > 0) {
        tempStreak++;
        if (currentStreak === 0) currentStreak = tempStreak;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        if (currentStreak === 0) currentStreak = 0;
        tempStreak = 0;
      }
    }

    // Today's stats
    const today = new Date().toDateString();
    const todayTrades = trades.filter(t => new Date(t.closed_at).toDateString() === today);
    const todayPnL = todayTrades.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0);

    return {
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      totalPnL,
      winRate,
      profitFactor: Math.min(profitFactor, 99.99),
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
      currentStreak: currentStreak || 5, // Demo fallback
      bestStreak: Math.max(bestStreak, 8), // Demo fallback
      todayPnL: todayPnL || 1234.56, // Demo fallback
      todayTrades: todayTrades.length || 3, // Demo fallback
    };
  }, [trades]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center dash-pulse">
            <LineChart className="w-8 h-8 text-white" />
          </div>
          <span className="text-gray-400">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white relative">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Market Ticker */}
      <MarketTicker data={marketData} />
      
      {/* Main Content */}
      <div className="relative z-10 max-w-[1800px] mx-auto p-4 lg:p-6 xl:p-8 pt-16 lg:pt-20">
        {/* Welcome Banner */}
        <WelcomeBanner 
          userName="Trader"
          accountBalance={125432.87}
          todayPnL={stats.todayPnL}
          todayTrades={stats.todayTrades}
        />
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mt-6">
          <AnimatedStatCard
            title="Win Rate"
            value={stats.winRate || 65.4}
            suffix="%"
            icon={Target}
            trend={stats.winRate >= 50 ? 'up' : 'down'}
            trendValue={`${stats.wins}W / ${stats.losses}L`}
            color="emerald"
            delay={0}
            isPercentage
          />
          <AnimatedStatCard
            title="Profit Factor"
            value={stats.profitFactor || 1.85}
            icon={TrendingUp}
            trend={stats.profitFactor >= 1.5 ? 'up' : stats.profitFactor >= 1 ? 'neutral' : 'down'}
            trendValue="vs 1.5 target"
            color="blue"
            delay={100}
          />
          <AnimatedStatCard
            title="Total P&L"
            value={Math.abs(stats.totalPnL || 12453.67)}
            prefix={stats.totalPnL >= 0 ? '+$' : '-$'}
            icon={DollarSign}
            trend={stats.totalPnL >= 0 ? 'up' : 'down'}
            trendValue={formatPercent(((stats.totalPnL || 12453.67) / 100000) * 100)}
            color={stats.totalPnL >= 0 ? 'emerald' : 'red'}
            delay={200}
            isCurrency
          />
          <AnimatedStatCard
            title="Total Trades"
            value={stats.totalTrades || 156}
            icon={BarChart3}
            trend="neutral"
            trendValue="This month"
            color="purple"
            delay={300}
          />
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 mt-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-8 space-y-4 lg:space-y-6">
            <EquityCurveChart trades={trades || []} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              <PerformanceBreakdown trades={trades || []} />
              <CalendarHeatmap trades={trades || []} />
            </div>
          </div>
          
          {/* Right Column - Activity & Actions */}
          <div className="lg:col-span-4 space-y-4 lg:space-y-6">
            <StreakCard 
              currentStreak={stats.currentStreak} 
              bestStreak={stats.bestStreak} 
            />
            <QuickActionsCard onNavigate={navigate} />
            <RecentTrades trades={trades || []} />
            <GoalsCard />
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Your data is encrypted and secure</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => refetch()} 
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Refresh
            </button>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;