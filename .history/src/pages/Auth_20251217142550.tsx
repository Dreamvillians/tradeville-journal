// pages/Auth.tsx
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

// Pre-computed data for visual effects
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
  const priceHistory = useRef<number[]>([]);
  const isUnmounted = useRef(false);

  const fetchMarketData = useCallback(async () => {
    if (isUnmounted.current) return;

    try {
      setLoading(true);

      const promises: Promise<Response>[] = [];

      // 1. Crypto prices
      promises.push(
        fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true',
          { signal: AbortSignal.timeout(10000) }
        )
      );

      // 2. Forex rates
      promises.push(
        fetch(
          'https://api.exchangerate-api.com/v4/latest/EUR',
          { signal: AbortSignal.timeout(10000) }
        )
      );

      // 3. Candles
      promises.push(
        fetch(
          'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=8',
          { signal: AbortSignal.timeout(10000) }
        )
      );

      const [cryptoResponse, forexResponse, candleResponse] = await Promise.allSettled(promises);

      if (isUnmounted.current) return;

      let btcPrice = 67234, ethPrice = 3456, solPrice = 147.82;
      let btcChange = 2.3, ethChange = 1.5, solChange = 3.2;

      if (cryptoResponse.status === 'fulfilled' && cryptoResponse.value.ok) {
        try {
          const cryptoData = await cryptoResponse.value.json();
          btcPrice = cryptoData.bitcoin?.usd || btcPrice;
          ethPrice = cryptoData.ethereum?.usd || ethPrice;
          solPrice = cryptoData.solana?.usd || solPrice;
          btcChange = cryptoData.bitcoin?.usd_24h_change || btcChange;
          ethChange = cryptoData.ethereum?.usd_24h_change || ethChange;
          solChange = cryptoData.solana?.usd_24h_change || solChange;
        } catch (e) { console.warn('Failed to parse crypto data'); }
      }

      let eurUsd = 1.087;
      if (forexResponse.status === 'fulfilled' && forexResponse.value.ok) {
        try {
          const forexData = await forexResponse.value.json();
          eurUsd = forexData.rates?.USD || eurUsd;
        } catch (e) { console.warn('Failed to parse forex data'); }
      }

      const prevEurUsd = previousPrices.current.get('EUR/USD') || eurUsd;
      const eurChange = previousPrices.current.has('EUR/USD') 
        ? ((eurUsd - prevEurUsd) / prevEurUsd * 100)
        : 0.05;

      previousPrices.current.set('BTC/USD', btcPrice);
      previousPrices.current.set('ETH/USD', ethPrice);
      previousPrices.current.set('SOL/USD', solPrice);
      previousPrices.current.set('EUR/USD', eurUsd);

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
          price: solPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }),
          change: `${solChange >= 0 ? '+' : ''}${solChange.toFixed(1)}%`,
          isUp: solChange >= 0,
          prevPrice: previousPrices.current.get('SOL/USD')
        }
      ];

      if (!isUnmounted.current) setTickers(newTickers);

      let candlesGenerated = false;
      if (candleResponse.status === 'fulfilled' && candleResponse.value.ok) {
        try {
          const klines = await candleResponse.value.json();
          if (Array.isArray(klines) && klines.length >= 8) {
            const newCandles: CandleData[] = klines.map((kline: any[], index: number) => {
              const open = parseFloat(kline[1]);
              const high = parseFloat(kline[2]);
              const low = parseFloat(kline[3]);
              const close = parseFloat(kline[4]);
              const isGreen = close >= open;
              const priceRange = high - low;
              const bodySize = Math.abs(close - open);
              const baseHeight = 25;
              const dynamicHeight = (bodySize / priceRange) * 50;
              
              const wickTopSize = isGreen 
                ? (high - close) / priceRange * 15
                : (high - open) / priceRange * 15;
              const wickBottomSize = isGreen
                ? (open - low) / priceRange * 15
                : (close - low) / priceRange * 15;
              
              return {
                id: index,
                height: Math.max(20, Math.min(70, baseHeight + dynamicHeight)),
                isGreen,
                delay: index * 0.15,
                wickTop: Math.max(3, Math.min(15, wickTopSize + 3)),
                wickBottom: Math.max(3, Math.min(15, wickBottomSize + 3)),
                open, close, high, low
              };
            });
            if (!isUnmounted.current) {
              setCandles(newCandles);
              candlesGenerated = true;
            }
          }
        } catch (e) { console.warn('Failed to parse candle data'); }
      }

      if (!candlesGenerated) {
        priceHistory.current.push(btcPrice);
        if (priceHistory.current.length > 20) priceHistory.current = priceHistory.current.slice(-20);
        const history = priceHistory.current;
        const volatility = history.length > 1 ? (Math.max(...history) - Math.min(...history)) / btcPrice * 100 : 1;

        const generatedCandles: CandleData[] = Array.from({ length: 8 }, (_, index) => {
          const seed = (btcPrice * (index + 1) + Date.now() / 100000) % 100;
          const isGreen = btcChange >= 0 ? (seed > 35) : (seed > 65);
          const baseHeight = 25 + (volatility * 3);
          const randomHeight = (seed % 25) + 10;
          return {
            id: index,
            height: Math.min(Math.max(baseHeight + randomHeight, 20), 65),
            isGreen,
            delay: index * 0.15,
            wickTop: 3 + (seed % 10),
            wickBottom: 3 + ((seed + 5) % 10),
          };
        });
        if (!isUnmounted.current) setCandles(generatedCandles);
      }

      if (!isUnmounted.current) {
        setLastUpdate(new Date());
        setLoading(false);
        setError(null);
      }
    } catch (err) {
      console.error('Market data fetch error:', err);
      if (!isUnmounted.current) {
        setError('Failed to fetch live data');
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isUnmounted.current = false;
    const initialTimeout = setTimeout(fetchMarketData, 500);
    const interval = setInterval(fetchMarketData, 30000);
    return () => {
      isUnmounted.current = true;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [fetchMarketData]);

  return { tickers, candles, loading, error, lastUpdate, refresh: fetchMarketData };
};

// --- CSS Constants ---
const AUTH_STYLES = `
  /* Mobile-first base styles */
  .auth-container { 
    min-height: 100vh;
    /* Use dvh for better mobile viewport handling */
    min-height: 100dvh;
    width: 100%;
    overflow-x: hidden;
  }

  .auth-scroll::-webkit-scrollbar { width: 4px; }
  .auth-scroll::-webkit-scrollbar-track { background: transparent; }
  .auth-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

  /* Keyframe Animations */
  @keyframes auth-float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -20px); } }
  @keyframes auth-float-rev { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-20px, 20px); } }
  @keyframes auth-pulse { 0%, 100% { opacity: 0.1; transform: scale(1); } 50% { opacity: 0.2; transform: scale(1.05); } }
  @keyframes auth-particle-float { 0%, 100% { transform: translateY(0); opacity: 0.3; } 50% { transform: translateY(-40px); opacity: 0.7; } }
  @keyframes auth-grid-move { 0% { transform: translateY(0); } 100% { transform: translateY(50px); } }
  @keyframes auth-scan-line { 0% { top: -2px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
  @keyframes auth-candle-pulse { 0%, 100% { transform: scaleY(1); opacity: 0.5; } 50% { transform: scaleY(1.15); opacity: 0.8; } }
  @keyframes auth-glow-pulse { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.08); opacity: 0.6; } }
  @keyframes auth-logo-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  @keyframes auth-bounce-sm { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-2px); } }
  @keyframes auth-shimmer-move { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
  @keyframes auth-fade-up { 0% { transform: translateY(15px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  
  /* Animation classes */
  .auth-float-slow { animation: auth-float 20s ease-in-out infinite; will-change: transform; }
  .auth-float-reverse { animation: auth-float-rev 25s ease-in-out infinite; will-change: transform; }
  .auth-pulse-slow { animation: auth-pulse 8s ease-in-out infinite; will-change: opacity, transform; }
  .auth-particle { animation: auth-particle-float 10s ease-in-out infinite; will-change: transform, opacity; }
  .auth-grid { animation: auth-grid-move 20s linear infinite; will-change: transform; }
  .auth-scan { animation: auth-scan-line 8s ease-in-out infinite; will-change: top, opacity; }
  .auth-candle { animation: auth-candle-pulse 3s ease-in-out infinite; will-change: transform, opacity; }
  .auth-logo { animation: auth-logo-bob 3s ease-in-out infinite; will-change: transform; }
  .auth-glow { animation: auth-glow-pulse 3s ease-in-out infinite; will-change: transform, opacity; }
  .auth-bounce { animation: auth-bounce-sm 2s ease-in-out infinite; will-change: transform; }
  .auth-shimmer { animation: auth-shimmer-move 3s ease-in-out infinite; background-size: 200% 100%; }
  .auth-fade { animation: auth-fade-up 0.4s ease-out forwards; }
  
  /* Safe area padding for mobile */
  .auth-safe-area {
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Disable animations on small screens for performance */
  @media (max-width: 768px) {
    .auth-particle, .auth-scan, .auth-grid { display: none; }
    .auth-float-slow, .auth-float-reverse, .auth-pulse-slow { animation-duration: 30s; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, .auth-float-slow, .auth-float-reverse, .auth-pulse-slow, .auth-particle,
    .auth-grid, .auth-scan, .auth-candle, .auth-logo,
    .auth-glow, .auth-bounce, .auth-shimmer { 
      animation: none !important; 
      transition: none !important;
    }
  }
`;

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

// --- Sub-Components ---
const FloatingOrbs = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute -top-20 -left-20 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-emerald-500/20 sm:bg-emerald-500/30 rounded-full blur-[60px] sm:blur-[80px] md:blur-[100px] auth-float-slow" />
    <div className="absolute -bottom-20 -right-20 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-blue-500/15 sm:bg-blue-500/20 rounded-full blur-[80px] sm:blur-[100px] md:blur-[120px] auth-float-reverse" />
    <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] lg:w-[600px] h-[400px] lg:h-[600px] bg-purple-500/10 rounded-full blur-[120px] lg:blur-[150px] auth-pulse-slow" />
    <div className="hidden md:block">
      {PARTICLES.map((p) => (
        <div key={p.id} className="absolute rounded-full auth-particle"
          style={{
            width: p.width, height: p.height, left: `${p.left}%`, top: `${p.top}%`,
            background: `rgba(${p.isGreen ? '16, 185, 129' : '59, 130, 246'}, ${p.opacity})`,
            animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
          }} />
      ))}
    </div>
  </div>
));
FloatingOrbs.displayName = 'FloatingOrbs';

const AnimatedGrid = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block z-0">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:40px_40px] lg:bg-[size:50px_50px] auth-grid" />
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent auth-scan" />
    </div>
  </div>
));
AnimatedGrid.displayName = 'AnimatedGrid';

const AnimatedCandlesticks = memo(({ candles, loading }: { candles: CandleData[]; loading: boolean; }) => {
  // Only show on larger screens to prevent clutter on mobile
  return (
    <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 md:h-40 lg:h-48 hidden lg:flex items-end justify-center gap-2 md:gap-3 opacity-15 sm:opacity-20 overflow-hidden pointer-events-none z-0">
      {loading && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />}
      {candles.map((candle) => (
        <div key={candle.id} className={cn("relative flex flex-col items-center auth-candle transition-all duration-500", loading && "opacity-50")}
          style={{ animationDelay: `${candle.delay}s` }}>
          <div className={cn("w-0.5 rounded-full transition-all duration-300", candle.isGreen ? "bg-emerald-500" : "bg-red-500")} style={{ height: candle.wickTop }} />
          <div className={cn("w-2 md:w-3 rounded-sm shadow-lg transition-all duration-500", candle.isGreen ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50")} style={{ height: candle.height }} />
          <div className={cn("w-0.5 rounded-full transition-all duration-300", candle.isGreen ? "bg-emerald-500" : "bg-red-500")} style={{ height: candle.wickBottom }} />
        </div>
      ))}
      <div className="absolute bottom-4 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
});
AnimatedCandlesticks.displayName = 'AnimatedCandlesticks';

const AnimatedLogo = memo(({ size = "default" }: { size?: "default" | "large" | "small" }) => {
  const sizeClasses = { small: "w-10 h-10", default: "w-11 h-11 sm:w-12 sm:h-12", large: "w-14 h-14 sm:w-16 sm:h-16" };
  const iconSizes = { small: "w-5 h-5", default: "w-5 h-5 sm:w-6 sm:h-6", large: "w-7 h-7 sm:w-8 sm:h-8" };
  return (
    <div className="relative group">
      <div className={cn("absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 blur-lg sm:blur-xl opacity-40 sm:opacity-50 group-hover:opacity-70 transition-opacity duration-500 auth-glow", sizeClasses[size])} />
      <div className={cn(sizeClasses[size], "relative rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-blue-600 flex items-center justify-center shadow-xl sm:shadow-2xl shadow-emerald-500/20 sm:shadow-emerald-500/25 auth-logo")}>
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
    let frame: number, start: number;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / 2000, 1);
      if (progress < 1) {
        setDisplayValue(Math.floor(progress * target).toLocaleString() + (value.includes('K') ? 'K+' : value.includes('M') ? 'M+' : '%'));
        frame = requestAnimationFrame(animate);
      } else setDisplayValue(value);
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

const FeatureCard = memo(({ icon: Icon, title, description, index }: { icon: typeof Zap; title: string; description: string; index: number; }) => (
  <div className="flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:bg-white/10 hover:border-emerald-500/30 group auth-fade opacity-0"
    style={{ animationDelay: `${index * 100 + 200}ms`, animationFillMode: 'forwards' }}>
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

// Social Icons - Simplified for brevity
const SocialIcons = {
  google: memo(() => <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>),
  apple: memo(() => <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>),
  facebook: memo(() => <svg className="h-4 w-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>),
  twitter: memo(() => <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>),
  linkedin: memo(() => <svg className="h-4 w-4 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>),
};

const SocialButton = memo(({ provider, iconKey, label, onClick, disabled, isLastUsed }: any) => {
  const IconComponent = SocialIcons[iconKey as keyof typeof SocialIcons];
  return (
    <div className="relative w-full group">
      {isLastUsed && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 auth-bounce">
          <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
            <Activity className="w-2.5 h-2.5" />
            <span>Last used</span>
          </span>
          <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[3px] border-t-emerald-500 mx-auto" />
        </div>
      )}
      <Button
        variant="outline" onClick={onClick} disabled={disabled}
        className={cn(
          "w-full h-10 relative overflow-hidden transition-all duration-300",
          "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
          "active:scale-[0.98] touch-manipulation",
          isLastUsed && "border-emerald-500/50 bg-emerald-500/5"
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

const AnimatedInput = memo(({ id, type, placeholder, value, onChange, icon: Icon, required = true, showPasswordToggle = false, showPassword = false, onTogglePassword, badge }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div className="relative group">
      <div className={cn("absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg opacity-0 blur transition-opacity duration-300", isFocused && "opacity-25")} />
      <div className="relative">
        <Icon className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 pointer-events-none", isFocused ? "text-emerald-400" : "text-gray-500")} />
        <Input id={id} type={showPasswordToggle ? (showPassword ? "text" : "password") : type} placeholder={placeholder} value={value} onChange={onChange} required={required} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          className={cn("h-11 pl-10 text-sm bg-[#0f1115] border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300", showPasswordToggle && "pr-10", badge && "pr-20")} />
        {showPasswordToggle && onTogglePassword && (
          <button type="button" onClick={onTogglePassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {badge}
      </div>
    </div>
  );
});
AnimatedInput.displayName = 'AnimatedInput';

const PasswordStrengthIndicator = memo(({ password, strength }: any) => {
  return (
    <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/5 auth-fade">
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500", strength.color)} style={{ width: `${strength.score}%` }} />
        </div>
        <span className={cn("text-xs font-bold uppercase min-w-[50px] text-right", strength.score <= 25 ? "text-red-400" : strength.score <= 50 ? "text-orange-400" : strength.score <= 75 ? "text-yellow-400" : "text-emerald-400")}>{strength.label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {[{ check: password.length >= 8, label: "8+" }, { check: /[A-Z]/.test(password) && /[a-z]/.test(password), label: "Aa" }, { check: /\d/.test(password), label: "123" }, { check: /[!@#$%^&*(),.?":{}|<>]/.test(password), label: "!@#" }].map((item, i) => (
          <div key={i} className={cn("flex items-center gap-1 text-[10px] transition-colors duration-300 px-2 py-0.5 rounded", item.check ? "text-emerald-400 bg-emerald-500/10" : "text-gray-500")}>
            <CheckCircle2 className="w-2.5 h-2.5" />{item.label}
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
  const { candles, loading: marketLoading, refresh: refreshMarketData } = useLiveMarketData();
  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  useEffect(() => {
    if (!stylesInjected.current) {
      const existingStyle = document.getElementById("auth-animations");
      if (existingStyle) existingStyle.remove();
      const styleSheet = document.createElement("style");
      styleSheet.id = "auth-animations";
      styleSheet.textContent = AUTH_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }
    return () => { document.getElementById("auth-animations")?.remove(); };
  }, []);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) { setEmail(savedEmail); setRememberMe(true); }
    const savedProvider = localStorage.getItem(LAST_AUTH_METHOD_KEY);
    if (savedProvider) { setLastUsedProvider(savedProvider); if (savedProvider === 'email') setActiveTab('signin'); }
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) navigate("/"); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => { if (session) navigate("/"); });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const saveAuthMethod = useCallback((method: string) => { localStorage.setItem(LAST_AUTH_METHOD_KEY, method); setLastUsedProvider(method); }, []);

  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) return toast({ title: "Terms Required", description: "Please agree to the terms.", variant: "destructive" });
    if (passwordStrength.score < 50) return toast({ title: "Weak Password", description: "Choose a stronger password.", variant: "destructive" });
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/`, data: { name } } });
      if (error) { if (error.message.includes("already registered")) { toast({ title: "Account exists", description: "Please sign in.", variant: "destructive" }); setActiveTab("signin"); } else throw error; } 
      else { saveAuthMethod('email'); toast({ title: "Welcome!", description: "Check your email." }); setPassword(""); setAgreedToTerms(false); }
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); } finally { setLoading(false); }
  }, [agreedToTerms, passwordStrength.score, email, password, name, saveAuthMethod, toast]);

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    rememberMe ? localStorage.setItem(REMEMBER_EMAIL_KEY, email) : localStorage.removeItem(REMEMBER_EMAIL_KEY);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      saveAuthMethod('email');
      toast({ title: "Welcome back!", description: "Signed in successfully." });
    } catch (error: any) { toast({ title: "Login Failed", description: error.message, variant: "destructive" }); } finally { setLoading(false); }
  }, [email, password, rememberMe, saveAuthMethod, toast]);

  const handleSocialLogin = useCallback(async (provider: any) => {
    try {
      setLoading(true); saveAuthMethod(provider);
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/` } });
      if (error) throw error;
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); setLoading(false); }
  }, [saveAuthMethod, toast]);

  const handleForgotPassword = useCallback(async () => {
    if (!email) return toast({ title: "Email Required", description: "Enter your email first.", variant: "destructive" });
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      toast({ title: "Reset Sent", description: "Check your email." });
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); } finally { setLoading(false); }
  }, [email, toast]);

  return (
    <div className="auth-container auth-safe-area flex flex-col lg:flex-row relative overflow-hidden bg-[#0a0b0f] text-white selection:bg-emerald-500/30">
      <FloatingOrbs />
      <AnimatedGrid />
      <AnimatedCandlesticks candles={candles} loading={marketLoading} />

      {/* Left Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-center p-8 xl:p-12 relative z-10 border-r border-white/5">
        <div className={cn("space-y-6 transition-all duration-1000 transform max-w-xl mx-auto w-full", isVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0")}>
          <div className="space-y-4 auth-fade" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3">
              <AnimatedLogo />
              <div>
                <span className="text-3xl font-bold tracking-tight text-white">Tradeville</span>
                <div className="text-sm text-emerald-400 font-medium tracking-wider uppercase">Trading Journal</div>
              </div>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Journal your way to <span className="text-emerald-400 relative inline-block">Profitability</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-md leading-relaxed">
              Track, analyze, and improve your trading performance with the most advanced journaling platform.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 auth-fade" style={{ animationDelay: '200ms' }}>
            <AnimatedStat value="50K+" label="Traders" />
            <AnimatedStat value="2M+" label="Trades" />
            <AnimatedStat value="98%" label="Satisfaction" />
          </div>
          <div className="grid grid-cols-1 gap-3">
            {FEATURES.map((feature, index) => <FeatureCard key={index} {...feature} index={index} />)}
          </div>
        </div>
      </div>

      {/* Right Panel (Form) */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10 auth-scroll overflow-y-auto w-full">
        <Card className={cn("w-full max-w-[420px] sm:max-w-md border-white/10 bg-[#12131a]/95 backdrop-blur-xl shadow-2xl transition-all duration-700 transform relative overflow-hidden", isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95")}>
          <div className="absolute top-0 left-0 w-full h-1 overflow-hidden rounded-t-xl"><div className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 auth-shimmer" /></div>
          
          <CardHeader className="text-center pb-3 pt-6 relative z-10">
            <div className="lg:hidden flex flex-col items-center mb-4">
              <AnimatedLogo size="large" />
              <span className="mt-2 text-2xl font-bold text-white">Tradeville</span>
            </div>
            <CardTitle className="text-2xl font-bold text-white">{activeTab === "signin" ? "Welcome back" : "Get started"}</CardTitle>
            <CardDescription className="text-gray-400 text-sm">{activeTab === "signin" ? "Access your journal" : "Join 10,000+ traders"}</CardDescription>
          </CardHeader>

          <CardContent className="pt-2 px-4 sm:px-6 pb-6 relative z-10">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 border border-white/5 rounded-lg h-10">
                <TabsTrigger value="signin" className="text-xs sm:text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-xs sm:text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-5 auth-fade">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-xs uppercase tracking-wider font-semibold">Email</Label>
                    <AnimatedInput id="signin-email" type="email" placeholder="trader@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} icon={Mail} badge={lastUsedProvider === 'email' ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">Last</span> : null} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><Label className="text-gray-300 text-xs uppercase tracking-wider font-semibold">Password</Label><button type="button" onClick={handleForgotPassword} className="text-xs text-emerald-400 hover:text-emerald-300">Forgot?</button></div>
                    <AnimatedInput id="signin-password" type="password" placeholder="••••••••" value={password} onChange={(e: any) => setPassword(e.target.value)} icon={Lock} showPasswordToggle showPassword={showPassword} onTogglePassword={() => setShowPassword(!showPassword)} />
                  </div>
                  <div className="flex items-center space-x-2"><Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(c as boolean)} className="border-white/20 data-[state=checked]:bg-emerald-500" /><label htmlFor="remember" className="text-sm text-gray-400 cursor-pointer">Remember me</label></div>
                  <Button type="submit" className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold transition-all shadow-lg active:scale-[0.98]" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span className="relative">Sign In</span><ArrowRight className="ml-2 w-4 h-4" /></>}
                  </Button>
                </form>
                <div className="relative py-3"><div className="absolute inset-0 flex items-center"><Separator className="bg-white/10" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-[#12131a] px-3 text-gray-500">Or continue with</span></div></div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {SOCIAL_BUTTONS.map((btn) => <div key={btn.provider} className={cn("col-span-1", btn.provider === 'linkedin_oidc' ? "hidden sm:block" : "")}><SocialButton provider={btn.provider} iconKey={btn.icon} label="" onClick={() => handleSocialLogin(btn.provider)} disabled={loading} isLastUsed={lastUsedProvider === btn.provider} /></div>)}
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-5 auth-fade">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2"><Label className="text-gray-300 text-xs uppercase">Full Name</Label><AnimatedInput id="signup-name" type="text" placeholder="John Doe" value={name} onChange={(e: any) => setName(e.target.value)} icon={User} /></div>
                  <div className="space-y-2"><Label className="text-gray-300 text-xs uppercase">Email</Label><AnimatedInput id="signup-email" type="email" placeholder="trader@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} icon={Mail} /></div>
                  <div className="space-y-2"><Label className="text-gray-300 text-xs uppercase">Password</Label><AnimatedInput id="signup-password" type="password" placeholder="Strong password" value={password} onChange={(e: any) => setPassword(e.target.value)} icon={Lock} showPasswordToggle showPassword={showPassword} onTogglePassword={() => setShowPassword(!showPassword)} />{password && <PasswordStrengthIndicator password={password} strength={passwordStrength} />}</div>
                  <div className="flex items-start space-x-2"><Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(c) => setAgreedToTerms(c as boolean)} className="border-white/20 data-[state=checked]:bg-emerald-500 mt-0.5" /><label htmlFor="terms" className="text-xs text-gray-400">I agree to <a href="#" className="text-emerald-400">Terms</a> & <a href="#" className="text-emerald-400">Privacy</a></label></div>
                  <Button type="submit" className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold" disabled={loading || !agreedToTerms}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}</Button>
                </form>
                <div className="flex justify-center pt-2"><div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"><Zap className="w-3 h-3" /><span>14-day free trial</span></div></div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <div className="bg-black/30 py-3 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-gray-500">
            <Shield className="w-3.5 h-3.5 text-emerald-500" /><span>256-bit AES Encryption</span>
          </div>
        </Card>
      </div>
    </div>
  );
}