import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  User, 
  Shield, 
  Zap, 
  BarChart3, 
  CheckCircle2,
  ArrowRight,
  Loader2,
  LineChart,
  Activity,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Constants ---
const LAST_AUTH_METHOD_KEY = "tradeville-last-auth-method";
const REMEMBER_EMAIL_KEY = "tradeville-remember-email";

// Pre-computed data
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  width: 2 + (i % 4),
  height: 2 + (i % 4),
  left: (i * 5) % 100,
  top: (i * 7) % 100,
  isGreen: i % 2 === 0,
  opacity: 0.2 + (i % 3) * 0.1,
  delay: (i % 5) * 0.6,
  duration: 8 + (i % 4) * 2,
}));

// Default static data (fallback)
const DEFAULT_TICKERS = [
  { symbol: "BTC/USD", price: "67,234", change: "+2.3%", isUp: true },
  { symbol: "ETH/USD", price: "3,456", change: "+1.5%", isUp: true },
  { symbol: "EUR/USD", price: "1.087", change: "-0.1%", isUp: false },
  { symbol: "AAPL", price: "178.32", change: "+0.8%", isUp: true },
];

const DEFAULT_CANDLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  height: 20 + (i * 6) % 50,
  isGreen: i % 3 !== 0,
  delay: i * 0.2,
  wickTop: 5 + (i % 3) * 4,
  wickBottom: 5 + ((i + 1) % 3) * 4,
}));

const FEATURES = [
  { icon: Zap, title: "Automated Import", description: "Sync trades from 50+ brokers instantly." },
  { icon: BarChart3, title: "Detailed Analytics", description: "Visualize R-multiples, win rates, and P&L." },
  { icon: Zap, title: "Strategy Tracking", description: "Identify profitable and losing setups." },
  { icon: Shield, title: "Private & Secure", description: "Bank-grade encryption for your data." },
];

const SOCIAL_BUTTONS = [
  { provider: 'google', label: 'Google', icon: 'google' },
  { provider: 'apple', label: 'Apple', icon: 'apple' },
  { provider: 'facebook', label: 'Facebook', icon: 'facebook' },
  { provider: 'twitter', label: 'X', icon: 'twitter' },
  { provider: 'linkedin_oidc', label: 'LinkedIn', icon: 'linkedin' },
] as const;

// --- Types ---
interface TickerData {
  symbol: string;
  price: string;
  change: string;
  isUp: boolean;
  prevPrice?: number;
}

interface CandleData {
  id: number;
  height: number;
  isGreen: boolean;
  delay: number;
  wickTop: number;
  wickBottom: number;
  open?: number;
  close?: number;
  high?: number;
  low?: number;
}

// --- Custom Hook for Live Market Data ---
const useLiveMarketData = () => {
  const [tickers, setTickers] = useState<TickerData[]>(DEFAULT_TICKERS);
  const [candles, setCandles] = useState<CandleData[]>(DEFAULT_CANDLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const previousPrices = useRef<Map<string, number>>(new Map());

  const fetchMarketData = useCallback(async () => {
    try {
      // Fetch crypto prices from CoinGecko (free, no API key needed)
      const cryptoPromise = fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
      );

      // Fetch additional crypto data for candles (BTC klines-like data)
      const candlePromise = fetch(
        'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly'
      );

      // Fetch forex rates from ExchangeRate API (free)
      const forexPromise = fetch(
        'https://api.exchangerate-api.com/v4/latest/EUR'
      );

      const [cryptoResponse, candleResponse, forexResponse] = await Promise.all([
        cryptoPromise,
        candlePromise,
        forexPromise
      ]);

      if (!cryptoResponse.ok || !forexResponse.ok) {
        throw new Error('Failed to fetch market data');
      }

      const cryptoData = await cryptoResponse.json();
      const forexData = await forexResponse.json();
      
      let candleData = null;
      if (candleResponse.ok) {
        candleData = await candleResponse.json();
      }

      // Calculate price changes
      const btcPrice = cryptoData.bitcoin?.usd || 67234;
      const ethPrice = cryptoData.ethereum?.usd || 3456;
      const eurUsd = forexData.rates?.USD || 1.087;
      
      const btcChange = cryptoData.bitcoin?.usd_24h_change || 0;
      const ethChange = cryptoData.ethereum?.usd_24h_change || 0;

      // Calculate EUR/USD change based on previous value
      const prevEurUsd = previousPrices.current.get('EUR/USD') || eurUsd;
      const eurChange = ((eurUsd - prevEurUsd) / prevEurUsd * 100);

      // Update previous prices
      previousPrices.current.set('BTC/USD', btcPrice);
      previousPrices.current.set('ETH/USD', ethPrice);
      previousPrices.current.set('EUR/USD', eurUsd);

      // Format tickers with real data
      const newTickers: TickerData[] = [
        {
          symbol: "BTC/USD",
          price: btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          change: `${btcChange >= 0 ? '+' : ''}${btcChange.toFixed(1)}%`,
          isUp: btcChange >= 0,
          prevPrice: previousPrices.current.get('BTC/USD')
        },
        {
          symbol: "ETH/USD",
          price: ethPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          change: `${ethChange >= 0 ? '+' : ''}${ethChange.toFixed(1)}%`,
          isUp: ethChange >= 0,
          prevPrice: previousPrices.current.get('ETH/USD')
        },
        {
          symbol: "EUR/USD",
          price: eurUsd.toFixed(4),
          change: `${eurChange >= 0 ? '+' : ''}${eurChange.toFixed(2)}%`,
          isUp: eurChange >= 0,
          prevPrice: prevEurUsd
        },
        {
          symbol: "SOL/USD",
          price: "147.82", // Would need additional API call for SOL
          change: "+3.2%",
          isUp: true
        }
      ];

      setTickers(newTickers);

      // Generate candles from price history
      if (candleData?.prices && candleData.prices.length >= 8) {
        const prices = candleData.prices.slice(-8);
        const newCandles: CandleData[] = prices.map((pricePoint: [number, number], index: number) => {
          const currentPrice = pricePoint[1];
          const prevPrice = index > 0 ? prices[index - 1][1] : currentPrice;
          const priceChange = currentPrice - prevPrice;
          const volatility = Math.abs(priceChange) / prevPrice * 100;
          
          // Calculate candle dimensions based on real price movement
          const baseHeight = 30;
          const heightMultiplier = Math.min(volatility * 50, 40);
          
          return {
            id: index,
            height: baseHeight + heightMultiplier,
            isGreen: priceChange >= 0,
            delay: index * 0.15,
            wickTop: 5 + Math.random() * 10,
            wickBottom: 5 + Math.random() * 10,
            open: prevPrice,
            close: currentPrice,
            high: Math.max(prevPrice, currentPrice) * 1.001,
            low: Math.min(prevPrice, currentPrice) * 0.999
          };
        });
        
        setCandles(newCandles);
      }

      setLastUpdate(new Date());
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Market data fetch error:', err);
      setError('Failed to fetch live data');
      setLoading(false);
      // Keep showing default data on error
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchMarketData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  return { tickers, candles, loading, error, lastUpdate, refresh: fetchMarketData };
};

// Responsive CSS with mobile-first approach
const AUTH_STYLES = `
  /* Base animations */
  .auth-float-slow { animation: auth-float 20s ease-in-out infinite; will-change: transform; }
  .auth-float-reverse { animation: auth-float-rev 25s ease-in-out infinite; will-change: transform; }
  .auth-pulse-slow { animation: auth-pulse 8s ease-in-out infinite; will-change: opacity, transform; }
  .auth-particle { animation: auth-particle-float 10s ease-in-out infinite; will-change: transform, opacity; }
  .auth-grid { animation: auth-grid-move 20s linear infinite; will-change: transform; }
  .auth-scan { animation: auth-scan-line 8s ease-in-out infinite; will-change: top, opacity; }
  .auth-ticker { animation: auth-ticker-scroll 25s linear infinite; will-change: transform; }
  .auth-candle { animation: auth-candle-pulse 3s ease-in-out infinite; will-change: transform, opacity; }
  .auth-logo { animation: auth-logo-bob 3s ease-in-out infinite; will-change: transform; }
  .auth-glow { animation: auth-glow-pulse 3s ease-in-out infinite; will-change: transform, opacity; }
  .auth-slide { animation: auth-slide-up 0.5s ease-out forwards; }
  .auth-bounce { animation: auth-bounce-sm 2s ease-in-out infinite; will-change: transform; }
  .auth-fade { animation: auth-fade-up 0.4s ease-out forwards; }
  .auth-shimmer { animation: auth-shimmer-move 3s ease-in-out infinite; background-size: 200% 100%; }
  .auth-price-flash { animation: auth-price-flash 0.5s ease-out; }
  .auth-price-up { animation: auth-price-up 0.3s ease-out; }
  .auth-price-down { animation: auth-price-down 0.3s ease-out; }
  
  @keyframes auth-float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -20px); } }
  @keyframes auth-float-rev { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-20px, 20px); } }
  @keyframes auth-pulse { 0%, 100% { opacity: 0.1; transform: scale(1); } 50% { opacity: 0.2; transform: scale(1.05); } }
  @keyframes auth-particle-float { 0%, 100% { transform: translateY(0); opacity: 0.3; } 50% { transform: translateY(-40px); opacity: 0.7; } }
  @keyframes auth-grid-move { 0% { transform: translateY(0); } 100% { transform: translateY(50px); } }
  @keyframes auth-scan-line { 0% { top: -2px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
  @keyframes auth-ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes auth-candle-pulse { 0%, 100% { transform: scaleY(1); opacity: 0.5; } 50% { transform: scaleY(1.15); opacity: 0.8; } }
  @keyframes auth-logo-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  @keyframes auth-glow-pulse { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.08); opacity: 0.6; } }
  @keyframes auth-slide-up { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes auth-bounce-sm { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-2px); } }
  @keyframes auth-shimmer-move { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
  @keyframes auth-fade-up { 0% { transform: translateY(15px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes auth-price-flash { 0% { background-color: rgba(16, 185, 129, 0.3); } 100% { background-color: transparent; } }
  @keyframes auth-price-up { 0% { color: #10b981; transform: scale(1.1); } 100% { transform: scale(1); } }
  @keyframes auth-price-down { 0% { color: #ef4444; transform: scale(1.1); } 100% { transform: scale(1); } }
  
  /* Mobile-first responsive utilities */
  .auth-container { 
    min-height: 100vh; 
    min-height: 100dvh;
  }
  
  /* Hide animations on mobile for better performance */
  @media (max-width: 768px) {
    .auth-particle, .auth-candle, .auth-scan, .auth-grid { display: none; }
    .auth-float-slow, .auth-float-reverse, .auth-pulse-slow { animation-duration: 30s; }
  }
  
  /* Reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .auth-float-slow, .auth-float-reverse, .auth-pulse-slow, .auth-particle,
    .auth-grid, .auth-scan, .auth-ticker, .auth-candle, .auth-logo,
    .auth-glow, .auth-bounce, .auth-shimmer { animation: none !important; }
  }
  
  /* Safe area for notched phones */
  .auth-safe-area {
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  /* Custom scrollbar */
  .auth-scroll::-webkit-scrollbar { width: 4px; }
  .auth-scroll::-webkit-scrollbar-track { background: transparent; }
  .auth-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
`;

// Password strength calculator
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20;
  if (/\d/.test(password)) score += 20;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20;

  if (score <= 25) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 50) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 75) return { score, label: "Good", color: "bg-yellow-500" };
  return { score: Math.min(score, 100), label: "Strong", color: "bg-emerald-500" };
};

// --- Memoized Background Components ---

const FloatingOrbs = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ contain: 'strict' }}>
    <div className="absolute -top-20 -left-20 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-emerald-500/20 sm:bg-emerald-500/30 rounded-full blur-[60px] sm:blur-[80px] md:blur-[100px] auth-float-slow" />
    <div className="absolute -bottom-20 -right-20 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-blue-500/15 sm:bg-blue-500/20 rounded-full blur-[80px] sm:blur-[100px] md:blur-[120px] auth-float-reverse" />
    <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] lg:w-[600px] h-[400px] lg:h-[600px] bg-purple-500/10 rounded-full blur-[120px] lg:blur-[150px] auth-pulse-slow" />
    
    <div className="hidden md:block">
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full auth-particle"
          style={{
            width: p.width,
            height: p.height,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: `rgba(${p.isGreen ? '16, 185, 129' : '59, 130, 246'}, ${p.opacity})`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  </div>
));
FloatingOrbs.displayName = 'FloatingOrbs';

const AnimatedGrid = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block" style={{ contain: 'strict' }}>
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:40px_40px] lg:bg-[size:50px_50px] auth-grid" />
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent auth-scan" />
    </div>
  </div>
));
AnimatedGrid.displayName = 'AnimatedGrid';

// --- Live Candlesticks Component ---
const AnimatedCandlesticks = memo(({ 
  candles, 
  loading 
}: { 
  candles: CandleData[]; 
  loading: boolean;
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 md:h-40 lg:h-48 hidden sm:flex items-end justify-center gap-2 md:gap-3 opacity-15 sm:opacity-20 overflow-hidden" style={{ contain: 'strict' }}>
      {/* Loading shimmer effect */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      )}
      
      {candles.map((candle) => (
        <div
          key={candle.id}
          className={cn(
            "relative flex flex-col items-center auth-candle transition-all duration-500",
            loading && "opacity-50"
          )}
          style={{ animationDelay: `${candle.delay}s` }}
        >
          {/* Top wick */}
          <div 
            className={cn(
              "w-0.5 rounded-full transition-all duration-300",
              candle.isGreen ? "bg-emerald-500" : "bg-red-500"
            )}
            style={{ height: candle.wickTop }}
          />
          {/* Candle body */}
          <div 
            className={cn(
              "w-2 md:w-3 rounded-sm shadow-lg transition-all duration-500",
              candle.isGreen 
                ? "bg-emerald-500 shadow-emerald-500/50" 
                : "bg-red-500 shadow-red-500/50"
            )}
            style={{ height: candle.height }}
          />
          {/* Bottom wick */}
          <div 
            className={cn(
              "w-0.5 rounded-full transition-all duration-300",
              candle.isGreen ? "bg-emerald-500" : "bg-red-500"
            )}
            style={{ height: candle.wickBottom }}
          />
        </div>
      ))}
      
      {/* Chart baseline */}
      <div className="absolute bottom-4 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
});
AnimatedCandlesticks.displayName = 'AnimatedCandlesticks';

// --- UI Components ---

const AnimatedLogo = memo(({ size = "default" }: { size?: "default" | "large" | "small" }) => {
  const sizeClasses = {
    small: "w-10 h-10",
    default: "w-11 h-11 sm:w-12 sm:h-12",
    large: "w-14 h-14 sm:w-16 sm:h-16"
  };
  const iconSizes = {
    small: "w-5 h-5",
    default: "w-5 h-5 sm:w-6 sm:h-6",
    large: "w-7 h-7 sm:w-8 sm:h-8"
  };
  
  return (
    <div className="relative group">
      <div className={cn(
        "absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 blur-lg sm:blur-xl opacity-40 sm:opacity-50 group-hover:opacity-70 transition-opacity duration-500 auth-glow",
        sizeClasses[size]
      )} />
      <div className={cn(
        sizeClasses[size],
        "relative rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-blue-600 flex items-center justify-center shadow-xl sm:shadow-2xl shadow-emerald-500/20 sm:shadow-emerald-500/25 auth-logo"
      )}>
        <div className="absolute inset-[1px] rounded-[10px] bg-gradient-to-br from-white/20 to-transparent" />
        <LineChart className={cn(iconSizes[size], "text-white relative z-10")} />
      </div>
    </div>
  );
});
AnimatedLogo.displayName = 'AnimatedLogo';

const AnimatedStat = memo(({ value, label }: { value: string; label: string }) => {
  const [displayValue, setDisplayValue] = useState("0");
  const targetRef = useRef(parseInt(value.replace(/\D/g, '')));
  
  useEffect(() => {
    const target = targetRef.current;
    let frame: number;
    let start: number;
    const duration = 2000;
    
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const current = Math.floor(progress * target);
      
      if (progress < 1) {
        setDisplayValue(current.toLocaleString() + (value.includes('K') ? 'K+' : value.includes('M') ? 'M+' : '%'));
        frame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };
    
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-center group hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-300">
      <div className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-400 tabular-nums">{displayValue}</div>
      <div className="text-xs sm:text-sm text-gray-400">{label}</div>
    </div>
  );
});
AnimatedStat.displayName = 'AnimatedStat';

const FeatureCard = memo(({ icon: Icon, title, description, index }: { 
  icon: typeof Zap; 
  title: string; 
  description: string;
  index: number;
}) => (
  <div 
    className="flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:bg-white/10 hover:border-emerald-500/30 group auth-slide opacity-0"
    style={{ animationDelay: `${index * 100 + 200}ms`, animationFillMode: 'forwards' }}
  >
    <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow duration-300">
      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
    </div>
    <div className="min-w-0">
      <h3 className="font-semibold text-white text-sm md:text-base mb-0.5 group-hover:text-emerald-400 transition-colors">{title}</h3>
      <p className="text-xs md:text-sm text-gray-400 leading-relaxed line-clamp-2">{description}</p>
    </div>
  </div>
));
FeatureCard.displayName = 'FeatureCard';

// Social Icons
const SocialIcons = {
  google: memo(() => (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )),
  apple: memo(() => (
    <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  )),
  facebook: memo(() => (
    <svg className="h-4 w-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )),
  twitter: memo(() => (
    <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )),
  linkedin: memo(() => (
    <svg className="h-4 w-4 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )),
};

const SocialButton = memo(({ 
  provider, 
  iconKey, 
  label, 
  onClick, 
  disabled,
  isLastUsed
}: { 
  provider: string;
  iconKey: keyof typeof SocialIcons;
  label: string;
  onClick: () => void;
  disabled: boolean;
  isLastUsed?: boolean;
}) => {
  const IconComponent = SocialIcons[iconKey];
  
  return (
    <div className="relative w-full group">
      {isLastUsed && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 auth-bounce">
          <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
            <Activity className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">Last used</span>
            <span className="sm:hidden">Last</span>
          </span>
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-emerald-500 mx-auto" />
        </div>
      )}
      <Button
        variant="outline"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full h-10 sm:h-11 relative overflow-hidden transition-all duration-300",
          "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
          "active:scale-[0.98] touch-manipulation",
          isLastUsed && "border-emerald-500/50 ring-1 sm:ring-2 ring-emerald-500/20 bg-emerald-500/5"
        )}
      >
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <span className="relative flex items-center justify-center gap-2">
          <IconComponent />
          <span className="hidden sm:inline text-xs">{label}</span>
        </span>
      </Button>
    </div>
  );
});
SocialButton.displayName = 'SocialButton';

const AnimatedInput = memo(({ 
  id, 
  type, 
  placeholder, 
  value, 
  onChange, 
  icon: Icon,
  required = true,
  showPasswordToggle = false,
  showPassword = false,
  onTogglePassword,
  badge
}: {
  id: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: typeof Mail;
  required?: boolean;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  badge?: React.ReactNode;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  return (
    <div className="relative group">
      <div className={cn(
        "absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg opacity-0 blur transition-opacity duration-300",
        isFocused && "opacity-25 sm:opacity-30"
      )} />
      
      <div className="relative">
        <Icon className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 pointer-events-none",
          isFocused ? "text-emerald-400" : "text-gray-500"
        )} />
        <Input
          id={id}
          type={showPasswordToggle ? (showPassword ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "h-11 sm:h-12 pl-10 text-sm sm:text-base",
            "bg-[#0f1115] border-white/10 text-white placeholder:text-gray-500",
            "focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20",
            "transition-all duration-300",
            showPasswordToggle && "pr-10",
            badge && "pr-20 sm:pr-24"
          )}
        />
        {showPasswordToggle && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1 touch-manipulation"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {badge}
      </div>
    </div>
  );
});
AnimatedInput.displayName = 'AnimatedInput';

const PasswordStrengthIndicator = memo(({ password, strength }: { 
  password: string; 
  strength: ReturnType<typeof calculatePasswordStrength>;
}) => {
  const checks = useMemo(() => [
    { check: password.length >= 8, label: "8+ chars" },
    { check: /[A-Z]/.test(password) && /[a-z]/.test(password), label: "Aa" },
    { check: /\d/.test(password), label: "123" },
    { check: /[!@#$%^&*(),.?":{}|<>]/.test(password), label: "!@#" },
  ], [password]);

  return (
    <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/5 auth-fade">
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", strength.color)}
            style={{ width: `${strength.score}%` }}
          />
        </div>
        <span className={cn(
          "text-xs font-bold uppercase min-w-[50px] text-right",
          strength.score <= 25 ? "text-red-400" :
          strength.score <= 50 ? "text-orange-400" :
          strength.score <= 75 ? "text-yellow-400" : "text-emerald-400"
        )}>
          {strength.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map((item, i) => (
          <div key={i} className={cn(
            "flex items-center gap-1 text-xs transition-colors duration-300 px-2 py-1 rounded",
            item.check ? "text-emerald-400 bg-emerald-500/10" : "text-gray-500"
          )}>
            <CheckCircle2 className="w-3 h-3" />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
});
PasswordStrengthIndicator.displayName = 'PasswordStrengthIndicator';

// --- Main Component ---
export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [isVisible, setIsVisible] = useState(false);
  const [lastUsedProvider, setLastUsedProvider] = useState<string | null>(null);
  const stylesInjected = useRef(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Live market data hook (only candles + loading + refresh used now)
  const { 
    candles, 
    loading: marketLoading, 
    refresh: refreshMarketData 
  } = useLiveMarketData();

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Inject styles once
  useEffect(() => {
    if (!stylesInjected.current) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "auth-animations";
      styleSheet.textContent = AUTH_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }
    
    return () => {
      const existingStyle = document.getElementById("auth-animations");
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  // Initialize state and auth listener
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    const savedProvider = localStorage.getItem(LAST_AUTH_METHOD_KEY);
    if (savedProvider) {
      setLastUsedProvider(savedProvider);
      if (savedProvider === 'email') setActiveTab('signin');
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/");
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  // Memoized handlers
  const saveAuthMethod = useCallback((method: string) => {
    localStorage.setItem(LAST_AUTH_METHOD_KEY, method);
    setLastUsedProvider(method);
  }, []);

  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({ title: "Terms Required", description: "Please agree to the terms and conditions.", variant: "destructive" });
      return;
    }

    if (passwordStrength.score < 50) {
      toast({ title: "Weak Password", description: "Please choose a stronger password.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { name },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({ title: "Account exists", description: "Please sign in instead.", variant: "destructive" });
          setActiveTab("signin");
        } else {
          throw error;
        }
      } else {
        saveAuthMethod('email');
        toast({ title: "🎉 Welcome!", description: "Check your email to verify." });
        setPassword("");
        setAgreedToTerms(false);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [agreedToTerms, passwordStrength.score, email, password, name, saveAuthMethod, toast]);

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (rememberMe) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      saveAuthMethod('email');
      toast({ title: "Welcome back! 📈", description: "Signed in successfully." });
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [email, password, rememberMe, saveAuthMethod, toast]);

  const handleSocialLogin = useCallback(async (provider: 'google' | 'twitter' | 'apple' | 'linkedin_oidc' | 'facebook') => {
    try {
      setLoading(true);
      saveAuthMethod(provider);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/` },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  }, [saveAuthMethod, toast]);

  const handleForgotPassword = useCallback(async () => {
    if (!email) {
      toast({ title: "Email Required", description: "Enter your email first.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Reset Link Sent ✉️", description: "Check your email." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [email, toast]);

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), []);

  return (
    <div className="auth-container auth-safe-area flex flex-col lg:flex-row relative overflow-hidden bg-[#0a0b0f] text-white selection:bg-emerald-500/30">
      {/* Background layers */}
      <FloatingOrbs />
      <AnimatedGrid />
      
      {/* Live Candlesticks - Now with real-time data */}
      <AnimatedCandlesticks 
        candles={candles} 
        loading={marketLoading} 
      />

      {/* Left Panel - Features (Desktop/Tablet) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-center p-6 lg:p-8 xl:p-12 relative z-10 border-r border-white/5">
        <div 
          className={cn(
            "space-y-5 xl:space-y-8 transition-all duration-1000 transform max-w-lg xl:max-w-xl mx-auto w-full",
            isVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
          )}
        >
          {/* Logo/Brand */}
          <div className="space-y-4 xl:space-y-6 auth-fade" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 xl:gap-4">
              <AnimatedLogo />
              <div>
                <span className="text-2xl xl:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">Tradeville</span>
                <div className="text-xs xl:text-sm text-emerald-400 font-medium tracking-wider uppercase">Trading Journal</div>
              </div>
            </div>
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight">
              Journal your way to{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-blue-400 bg-clip-text text-transparent">
                  Profitability
                </span>
                <span className="absolute -bottom-1 xl:-bottom-2 left-0 right-0 h-0.5 xl:h-1 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full animate-pulse" />
              </span>
            </h1>
            <p className="text-sm lg:text-base xl:text-lg text-gray-400 max-w-md leading-relaxed">
              Stop trading blindly. Track, analyze, and improve your trading performance with the most advanced journaling platform.
            </p>
          </div>

          {/* Animated Stats */}
          <div className="grid grid-cols-3 gap-2 lg:gap-3 xl:gap-4 auth-fade" style={{ animationDelay: '200ms' }}>
            <AnimatedStat value="50K+" label="Traders" />
            <AnimatedStat value="2M+" label="Trades" />
            <AnimatedStat value="98%" label="Satisfaction" />
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 gap-2 lg:gap-3 xl:gap-4">
            {FEATURES.map((feature, index) => (
              <FeatureCard key={index} {...feature} index={index} />
            ))}
          </div>

          {/* Testimonial */}
          <div 
            className="p-4 xl:p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 relative overflow-hidden group hover:border-emerald-500/30 transition-colors duration-300 auth-fade"
            style={{ animationDelay: '700ms' }}
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-blue-500" />
            
            <div className="flex gap-1 mb-2 xl:mb-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            
            <p className="text-gray-300 italic text-sm xl:text-base relative z-10">
              "Tradeville helped me cut my losing days by 40% in the first month."
            </p>
            <div className="mt-3 xl:mt-4 flex items-center gap-2 xl:gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                AM
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Alex M.</p>
                <p className="text-xs text-gray-500">Forex Trader • 5 years</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10 auth-scroll overflow-y-auto">
        <Card 
          className={cn(
            "w-full max-w-[420px] sm:max-w-md border-white/10 bg-[#12131a]/95 sm:bg-[#12131a]/90 backdrop-blur-xl shadow-2xl transition-all duration-700 transform relative overflow-hidden",
            isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95"
          )}
        >
          {/* Border gradient */}
          <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-br from-emerald-500/40 via-transparent to-blue-500/40 pointer-events-none">
            <div className="absolute inset-0 rounded-xl bg-[#12131a]" />
          </div>
          
          {/* Top accent */}
          <div className="absolute top-0 left-0 w-full h-1 overflow-hidden rounded-t-xl">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 auth-shimmer" />
          </div>

          <CardHeader className="text-center pb-3 pt-6 sm:pt-8 px-4 sm:px-6 relative z-10">
            {/* Mobile/Tablet Logo */}
            <div className="lg:hidden flex flex-col items-center mb-4 sm:mb-6">
              <AnimatedLogo size="large" />
              <span className="mt-2 text-xl sm:text-2xl font-bold text-white">Tradeville</span>
              <span className="text-xs text-emerald-400 uppercase tracking-wider">Trading Journal</span>
            </div>
            
            <CardTitle className="text-xl sm:text-2xl font-bold text-white">
              {activeTab === "signin" ? "Welcome back" : "Get started"}
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              {activeTab === "signin" 
                ? "Access your trading journal" 
                : "Join 10,000+ traders today"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 pb-4 relative z-10">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 border border-white/5 rounded-lg h-10 sm:h-11">
                <TabsTrigger 
                  value="signin"
                  className="text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-white text-gray-400 rounded-md transition-all duration-300"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-white text-gray-400 rounded-md transition-all duration-300"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-5 sm:mt-6 auth-fade">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">
                      Email
                    </Label>
                    <AnimatedInput
                      id="signin-email"
                      type="email"
                      placeholder="trader@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      icon={Mail}
                      badge={lastUsedProvider === 'email' ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                            Last
                          </span>
                        </div>
                      ) : undefined}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors touch-manipulation"
                      >
                        Forgot?
                      </button>
                    </div>
                    <AnimatedInput
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={Lock}
                      showPasswordToggle
                      showPassword={showPassword}
                      onTogglePassword={togglePassword}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 w-4 h-4"
                    />
                    <label htmlFor="remember" className="text-sm text-gray-400 cursor-pointer select-none">
                      Remember email
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold text-sm sm:text-base transition-all duration-300 group shadow-lg shadow-emerald-500/25 active:scale-[0.98] touch-manipulation relative overflow-hidden" 
                    disabled={loading}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span className="relative">Sign In</span>
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform relative" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="bg-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#12131a] px-3 text-gray-500">Or continue with</span>
                  </div>
                </div>
                
                {/* Social Buttons - Responsive Grid */}
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-3 sm:gap-3">
                    {SOCIAL_BUTTONS.slice(0, 3).map((btn) => (
                      <SocialButton
                        key={btn.provider}
                        provider={btn.provider}
                        iconKey={btn.icon}
                        label={btn.label}
                        onClick={() => handleSocialLogin(btn.provider as any)}
                        disabled={loading}
                        isLastUsed={lastUsedProvider === btn.provider}
                      />
                    ))}
                    {/* Show remaining 2 on mobile in same row */}
                    <div className="sm:hidden">
                      <SocialButton
                        provider={SOCIAL_BUTTONS[3].provider}
                        iconKey={SOCIAL_BUTTONS[3].icon}
                        label={SOCIAL_BUTTONS[3].label}
                        onClick={() => handleSocialLogin(SOCIAL_BUTTONS[3].provider as any)}
                        disabled={loading}
                        isLastUsed={lastUsedProvider === SOCIAL_BUTTONS[3].provider}
                      />
                    </div>
                    <div className="sm:hidden">
                      <SocialButton
                        provider={SOCIAL_BUTTONS[4].provider}
                        iconKey={SOCIAL_BUTTONS[4].icon}
                        label={SOCIAL_BUTTONS[4].label}
                        onClick={() => handleSocialLogin(SOCIAL_BUTTONS[4].provider as any)}
                        disabled={loading}
                        isLastUsed={lastUsedProvider === SOCIAL_BUTTONS[4].provider}
                      />
                    </div>
                  </div>
                  {/* Desktop: show 2 buttons in second row */}
                  <div className="hidden sm:grid grid-cols-2 gap-3">
                    {SOCIAL_BUTTONS.slice(3).map((btn) => (
                      <SocialButton
                        key={btn.provider}
                        provider={btn.provider}
                        iconKey={btn.icon}
                        label={btn.label}
                        onClick={() => handleSocialLogin(btn.provider as any)}
                        disabled={loading}
                        isLastUsed={lastUsedProvider === btn.provider}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-5 sm:mt-6 auth-fade">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">
                      Full Name
                    </Label>
                    <AnimatedInput
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      icon={User}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">
                      Email
                    </Label>
                    <AnimatedInput
                      id="signup-email"
                      type="email"
                      placeholder="trader@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      icon={Mail}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">
                      Password
                    </Label>
                    <AnimatedInput
                      id="signup-password"
                      type="password"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={Lock}
                      showPasswordToggle
                      showPassword={showPassword}
                      onTogglePassword={togglePassword}
                    />
                    
                    {password && (
                      <PasswordStrengthIndicator password={password} strength={passwordStrength} />
                    )}
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 mt-0.5 w-4 h-4"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-400 cursor-pointer leading-relaxed">
                      I agree to the{" "}
                      <a href="/terms" className="text-emerald-400 hover:text-emerald-300 transition-colors">Terms</a>
                      {" "}and{" "}
                      <a href="/privacy" className="text-emerald-400 hover:text-emerald-300 transition-colors">Privacy</a>
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold text-sm sm:text-base transition-all duration-300 group shadow-lg shadow-emerald-500/25 active:scale-[0.98] touch-manipulation relative overflow-hidden" 
                    disabled={loading || !agreedToTerms}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span className="relative">Create Account</span>
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform relative" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="bg-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#12131a] px-3 text-gray-500">Or sign up with</span>
                  </div>
                </div>

                {/* Social Buttons - Same responsive layout */}
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-3 sm:gap-3">
                    {SOCIAL_BUTTONS.slice(0, 3).map((btn) => (
                      <SocialButton
                        key={btn.provider}
                        provider={btn.provider}
                        iconKey={btn.icon}
                        label={btn.label}
                        onClick={() => handleSocialLogin(btn.provider as any)}
                        disabled={loading}
                        isLastUsed={false}
                      />
                    ))}
                    <div className="sm:hidden">
                      <SocialButton
                        provider={SOCIAL_BUTTONS[3].provider}
                        iconKey={SOCIAL_BUTTONS[3].icon}
                        label={SOCIAL_BUTTONS[3].label}
                        onClick={() => handleSocialLogin(SOCIAL_BUTTONS[3].provider as any)}
                        disabled={loading}
                        isLastUsed={false}
                      />
                    </div>
                    <div className="sm:hidden">
                      <SocialButton
                        provider={SOCIAL_BUTTONS[4].provider}
                        iconKey={SOCIAL_BUTTONS[4].icon}
                        label={SOCIAL_BUTTONS[4].label}
                        onClick={() => handleSocialLogin(SOCIAL_BUTTONS[4].provider as any)}
                        disabled={loading}
                        isLastUsed={false}
                      />
                    </div>
                  </div>
                  <div className="hidden sm:grid grid-cols-2 gap-3">
                    {SOCIAL_BUTTONS.slice(3).map((btn) => (
                      <SocialButton
                        key={btn.provider}
                        provider={btn.provider}
                        iconKey={btn.icon}
                        label={btn.label}
                        onClick={() => handleSocialLogin(btn.provider as any)}
                        disabled={loading}
                        isLastUsed={false}
                      />
                    ))}
                  </div>
                </div>

                {/* Free trial badge */}
                <div className="flex justify-center pt-1">
                  <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-medium">
                    <Zap className="w-3.5 h-3.5" />
                    <span>14-day free trial • No card</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          {/* Footer Security Badge */}
          <div className="bg-black/30 py-2.5 sm:py-3 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-gray-500 relative z-10 rounded-b-xl">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-bit AES Encryption</span>
            {/* Market data refresh button */}
            <button
              onClick={refreshMarketData}
              className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
              title="Refresh market data"
            >
              <RefreshCw className={cn(
                "w-3 h-3 text-gray-500 hover:text-emerald-400 transition-colors",
                marketLoading && "animate-spin"
              )} />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}