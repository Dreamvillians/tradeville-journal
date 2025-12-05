import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Flame, 
  BookOpen, 
  PlusCircle,
  BarChart3,
  Activity,
  Zap,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Bell,
  Settings,
  RefreshCw,
  LineChart,
  PieChart,
  Shield,
  Award,
  Sparkles,
  AlertCircle,
  CandlestickChart,
  Menu
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// --- Styles & Animations ---
const DASHBOARD_STYLES = `
  .dash-float { animation: dash-float 6s ease-in-out infinite; }
  .dash-float-delayed { animation: dash-float 6s ease-in-out infinite; animation-delay: 2s; }
  .dash-pulse { animation: dash-pulse 3s ease-in-out infinite; }
  .dash-slide-up { animation: dash-slide-up 0.5s ease-out forwards; }
  .dash-ticker { animation: dash-ticker 40s linear infinite; }
  .dash-count { transition: all 0.3s ease-out; }
  
  @keyframes dash-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes dash-pulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
  @keyframes dash-slide-up { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes dash-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

  .dash-glass {
    background: rgba(18, 19, 26, 0.7);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  }
  
  .dash-card-hover { transition: all 0.3s ease; }
  .dash-card-hover:hover { 
    transform: translateY(-2px); 
    border-color: rgba(16, 185, 129, 0.3);
    box-shadow: 0 10px 40px -10px rgba(16, 185, 129, 0.1);
  }

  /* Scrollbar hiding for neatness */
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// --- Types & Utils ---
interface Trade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  profit_loss_currency: number;
  opened_at: string;
  closed_at: string;
  strategy?: string;
}

interface MarketData {
  symbol: string;
  price: string;
  change: number;
  isUp: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

// --- Custom Hook for Animated Numbers ---
const useAnimatedCounter = (end: number, duration: number = 1000) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out quart
      const ease = 1 - Math.pow(1 - progress, 4);
      
      setCount(end * ease);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  
  return count;
};

// --- Components ---

const BackgroundEffects = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] dash-float" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] dash-float-delayed" />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
  </div>
));

const MarketTicker = memo(({ data }: { data: MarketData[] }) => (
  <div className="fixed top-0 left-0 right-0 h-10 bg-[#0f1115]/80 backdrop-blur-md border-b border-white/5 z-50 overflow-hidden flex items-center">
    <div className="dash-ticker flex whitespace-nowrap w-max">
      {[...data, ...data, ...data, ...data].map((item, i) => (
        <div key={i} className="flex items-center gap-3 mx-6">
          <span className="text-gray-400 text-xs font-bold tracking-wider">{item.symbol}</span>
          <span className="text-white text-xs font-mono">{item.price}</span>
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
            item.isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          )}>
            {item.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(item.change)}%
          </span>
        </div>
      ))}
    </div>
  </div>
));

const StatCard = memo(({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = "emerald",
  delay = 0 
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'emerald' | 'blue' | 'purple' | 'orange' | 'red';
  delay?: number;
}) => {
  const colorStyles = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <Card 
      className="dash-glass dash-card-hover h-full flex flex-col justify-between border-white/5 overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-2.5 rounded-xl border", colorStyles[color])}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center text-xs font-medium px-2 py-1 rounded-full bg-white/5",
              trend === 'up' ? "text-emerald-400" : trend === 'down' ? "text-red-400" : "text-gray-400"
            )}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              {trend === 'up' ? '+2.4%' : '-1.2%'}
            </div>
          )}
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase font-semibold tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tabular-nums tracking-tight">{value}</h3>
          {subtitle && <p className="text-gray-500 text-xs mt-1 truncate">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
});

const WelcomeCard = memo(({ userName, stats }: { userName: string, stats: any }) => (
  <Card className="dash-glass dash-card-hover h-full relative overflow-hidden border-none bg-gradient-to-br from-emerald-900/20 to-blue-900/20">
    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
    <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Dashboard</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Hello, <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-400">{userName}</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1 max-w-md">
            Markets are volatile today. Your playbook suggests caution on breakouts.
          </p>
        </div>
        
        <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-full bg-[#0f1115] border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] relative group">
          <div className="text-center">
            <span className="block text-xs text-gray-500">Win Rate</span>
            <span className="block text-emerald-400 font-bold">{stats.winRate}%</span>
          </div>
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#333" strokeWidth="2" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray={`${stats.winRate}, 100`} />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-auto">
        <div className="bg-[#0a0b0f]/50 rounded-lg p-3 border border-white/5 backdrop-blur-sm">
          <p className="text-xs text-gray-500">Today's P&L</p>
          <p className="text-sm sm:text-base font-mono text-emerald-400">+$1,240</p>
        </div>
        <div className="bg-[#0a0b0f]/50 rounded-lg p-3 border border-white/5 backdrop-blur-sm">
          <p className="text-xs text-gray-500">Open Positions</p>
          <p className="text-sm sm:text-base font-mono text-white">3 Active</p>
        </div>
        <div className="bg-[#0a0b0f]/50 rounded-lg p-3 border border-white/5 backdrop-blur-sm col-span-2 sm:col-span-1 flex items-center justify-between sm:block">
          <p className="text-xs text-gray-500">Next News</p>
          <p className="text-sm sm:text-base font-mono text-orange-400">FOMC 2:00 PM</p>
        </div>
      </div>
    </CardContent>
  </Card>
));

const PerformanceChart = memo(({ trades }: { trades: Trade[] }) => {
  // Mock chart data generation
  const dataPoints = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      val: 50 + Math.random() * 40 + (i * 2),
      date: `Day ${i + 1}`
    }));
  }, []);
  
  const maxVal = Math.max(...dataPoints.map(d => d.val));
  const minVal = Math.min(...dataPoints.map(d => d.val));

  return (
    <Card className="dash-glass dash-card-hover h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-blue-400" />
              Equity Curve
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">Last 14 Days Performance</CardDescription>
          </div>
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {['1W', '1M', '3M'].map(t => (
              <button key={t} className={cn(
                "px-2 py-1 text-[10px] font-medium rounded-md transition-colors",
                t === '1M' ? "bg-blue-500/20 text-blue-400" : "text-gray-500 hover:text-white"
              )}>{t}</button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-[200px] relative pt-4">
        <div className="absolute inset-0 left-0 right-0 bottom-4 flex items-end justify-between gap-1 px-6">
          {dataPoints.map((d, i) => {
            const height = ((d.val - minVal) / (maxVal - minVal)) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                <div 
                  className="w-full bg-gradient-to-t from-blue-500/10 to-emerald-500/50 rounded-t-sm opacity-60 group-hover:opacity-100 transition-all duration-500 ease-out"
                  style={{ height: `${Math.max(height, 5)}%` }}
                />
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0f1115] border border-white/10 px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                  ${d.val.toFixed(2)}k
                </div>
              </div>
            );
          })}
        </div>
        {/* Baseline */}
        <div className="absolute bottom-4 left-6 right-6 h-px bg-white/10" />
      </CardContent>
    </Card>
  );
});

const RecentTrades = memo(({ trades }: { trades: Trade[] }) => (
  <Card className="dash-glass dash-card-hover h-full flex flex-col">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          Recent Trades
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </Button>
      </div>
    </CardHeader>
    <CardContent className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-2">
      {trades.slice(0, 5).map((trade, i) => (
        <div key={trade.id || i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
              trade.side === 'long' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            )}>
              {trade.side === 'long' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{trade.symbol}</p>
              <p className="text-[10px] text-gray-500 truncate">{trade.strategy || 'Manual'}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={cn(
              "text-sm font-mono font-medium",
              trade.profit_loss_currency >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {trade.profit_loss_currency >= 0 ? '+' : ''}{formatCurrency(trade.profit_loss_currency)}
            </p>
            <p className="text-[10px] text-gray-600">2h ago</p>
          </div>
        </div>
      ))}
      {trades.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 py-8">
          <CandlestickChart className="w-12 h-12 mb-2 opacity-20" />
          <span className="text-sm">No trades yet</span>
        </div>
      )}
    </CardContent>
  </Card>
));

const QuickActions = memo(({ onNavigate }: { onNavigate: (p: string) => void }) => {
  const actions = [
    { icon: PlusCircle, label: "Log Trade", path: "/journal", color: "bg-emerald-600 hover:bg-emerald-500" },
    { icon: BookOpen, label: "Playbook", path: "/playbook", color: "bg-white/5 hover:bg-white/10 border border-white/10" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", color: "bg-white/5 hover:bg-white/10 border border-white/10" },
    { icon: Calendar, label: "Calendar", path: "/calendar", color: "bg-white/5 hover:bg-white/10 border border-white/10" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {actions.map((action, i) => (
        <button
          key={action.label}
          onClick={() => onNavigate(action.path)}
          className={cn(
            "flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all duration-300 group active:scale-95",
            action.color
          )}
        >
          <action.icon className={cn("w-6 h-6 transition-transform group-hover:scale-110", i === 0 ? "text-white" : "text-gray-400 group-hover:text-white")} />
          <span className={cn("text-xs font-medium", i === 0 ? "text-white" : "text-gray-400 group-hover:text-white")}>{action.label}</span>
        </button>
      ))}
    </div>
  );
});

const GoalProgress = memo(({ label, current, target, unit = "", color = "bg-blue-500" }: any) => {
  const percentage = Math.min((current / target) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-mono">{current}{unit} <span className="text-gray-600">/ {target}{unit}</span></span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000 ease-out", color)} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
});

// --- Main Dashboard ---

const Dashboard = () => {
  const navigate = useNavigate();
  const stylesInjected = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Simulated Data (since API keys aren't provided)
  const marketData = [
    { symbol: "BTC", price: "$64,231", change: 2.4, isUp: true },
    { symbol: "ETH", price: "$3,452", change: 1.8, isUp: true },
    { symbol: "SPY", price: "$512.42", change: -0.4, isUp: false },
    { symbol: "EUR", price: "1.0842", change: -0.1, isUp: false },
  ];

  // Styles Injection
  useEffect(() => {
    if (!stylesInjected.current) {
      const style = document.createElement("style");
      style.textContent = DASHBOARD_STYLES;
      document.head.appendChild(style);
      stylesInjected.current = true;
    }
    setIsLoaded(true);
  }, []);

  // Data Fetching
  const { data: trades = [] } = useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      // Mock data if supabase fails or is empty for demo
      return [
        { id: '1', symbol: 'BTC/USD', side: 'long', profit_loss_currency: 1250, opened_at: new Date().toISOString(), closed_at: new Date().toISOString(), strategy: 'Breakout' },
        { id: '2', symbol: 'EUR/USD', side: 'short', profit_loss_currency: -420, opened_at: new Date().toISOString(), closed_at: new Date().toISOString(), strategy: 'Reversal' },
        { id: '3', symbol: 'NVDA', side: 'long', profit_loss_currency: 850, opened_at: new Date().toISOString(), closed_at: new Date().toISOString(), strategy: 'Trend' },
        { id: '4', symbol: 'AAPL', side: 'short', profit_loss_currency: 120, opened_at: new Date().toISOString(), closed_at: new Date().toISOString(), strategy: 'Scalp' },
        { id: '5', symbol: 'GBP/JPY', side: 'long', profit_loss_currency: -150, opened_at: new Date().toISOString(), closed_at: new Date().toISOString(), strategy: 'News' },
        { id: '6', symbol: 'XAU/USD', side: 'long', profit_loss_currency: 2100, opened_at: new Date().toISOString(), closed_at: new Date().toISOString(), strategy: 'Swing' },
      ] as Trade[];
    },
  });

  // Stats Calculation
  const stats = useMemo(() => {
    const wins = trades.filter(t => t.profit_loss_currency > 0);
    const losses = trades.filter(t => t.profit_loss_currency < 0);
    const totalPnL = trades.reduce((acc, t) => acc + t.profit_loss_currency, 0);
    const winRate = trades.length ? ((wins.length / trades.length) * 100).toFixed(1) : "0.0";
    
    return {
      totalTrades: trades.length,
      totalPnL,
      winRate,
      streak: 4, // Mock streak
      wins: wins.length,
      losses: losses.length,
      avgWin: 450,
      profitFactor: 1.85
    };
  }, [trades]);

  const animatedPnL = useAnimatedCounter(stats.totalPnL, 1500);
  const animatedTrades = useAnimatedCounter(stats.totalTrades, 1500);

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white font-sans selection:bg-emerald-500/30">
      <BackgroundEffects />
      <MarketTicker data={marketData} />

      {/* Main Container - Padded for Fixed Header */}
      <main className={cn(
        "relative z-10 pt-20 pb-10 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto transition-opacity duration-700",
        isLoaded ? "opacity-100" : "opacity-0"
      )}>
        
        {/* Dashboard Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <LineChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
              <p className="text-xs text-gray-500">Overview & Analytics</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Market Open
            </span>
            <Button variant="outline" size="icon" className="h-9 w-9 bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="sm:hidden h-9 w-9 bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 auto-rows-fr">
          
          {/* 1. Welcome Card (Spans 2 cols on Tablet/Desktop) */}
          <div className="md:col-span-2 lg:col-span-2 min-h-[240px] dash-slide-up" style={{ animationDelay: '0ms' }}>
            <WelcomeCard userName="Trader" stats={stats} />
          </div>

          {/* 2. Primary Stat (Total PnL) */}
          <div className="dash-slide-up" style={{ animationDelay: '100ms' }}>
            <StatCard
              title="Net Profit (YTD)"
              value={formatCurrency(animatedPnL)}
              subtitle="+$1,240 Today"
              icon={DollarSign}
              trend="up"
              color="emerald"
            />
          </div>

          {/* 3. Secondary Stat (Total Trades) */}
          <div className="dash-slide-up" style={{ animationDelay: '150ms' }}>
            <StatCard
              title="Total Trades"
              value={animatedTrades}
              subtitle={`${stats.wins}W / ${stats.losses}L`}
              icon={Target}
              trend="neutral"
              color="blue"
            />
          </div>

          {/* 4. Chart (Spans 2 cols on Mobile/Tablet, 3 on Desktop? No, let's keep grid consistent) 
             Modified: Spans 2 cols on Tablet, 3 cols on LG
          */}
          <div className="md:col-span-2 lg:col-span-3 min-h-[300px] dash-slide-up" style={{ animationDelay: '200ms' }}>
            <PerformanceChart trades={trades} />
          </div>

          {/* 5. Quick Actions (Compact grid) */}
          <div className="dash-slide-up" style={{ animationDelay: '250ms' }}>
            <QuickActions onNavigate={navigate} />
          </div>

          {/* 6. Recent Trades List (Spans 2 cols on MD) */}
          <div className="md:col-span-2 lg:col-span-2 min-h-[280px] dash-slide-up" style={{ animationDelay: '300ms' }}>
            <RecentTrades trades={trades} />
          </div>

          {/* 7. Goals & Metrics (Stacked) */}
          <div className="md:col-span-2 lg:col-span-2 dash-slide-up" style={{ animationDelay: '350ms' }}>
            <Card className="dash-glass dash-card-hover h-full border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-400" />
                  Monthly Targets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <GoalProgress label="Profit Target" current={3250} target={5000} unit="$" color="bg-emerald-500" />
                <GoalProgress label="Trade Count" current={28} target={40} color="bg-blue-500" />
                <GoalProgress label="Win Rate" current={68} target={70} unit="%" color="bg-purple-500" />
              </CardContent>
            </Card>
          </div>
          
          {/* 8. Extra Small Stats Row (Profit Factor etc) */}
          <div className="dash-slide-up" style={{ animationDelay: '400ms' }}>
             <StatCard
              title="Profit Factor"
              value={stats.profitFactor}
              subtitle="Risk / Reward Ratio"
              icon={PieChart}
              color="purple"
            />
          </div>

          <div className="dash-slide-up" style={{ animationDelay: '450ms' }}>
             <StatCard
              title="Current Streak"
              value={stats.streak}
              subtitle="Consecutive Wins"
              icon={Flame}
              color="orange"
            />
          </div>

        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Encrypted & Secure Connection</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Help</a>
          </div>
        </footer>

      </main>
    </div>
  );
};

export default Dashboard;