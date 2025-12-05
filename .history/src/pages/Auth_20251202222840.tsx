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
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Constants (defined outside component to prevent recreation) ---
const LAST_AUTH_METHOD_KEY = "tradeville-last-auth-method";
const REMEMBER_EMAIL_KEY = "tradeville-remember-email";

// Pre-computed random values for particles (computed once at module load)
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  width: 2 + (i % 5),
  height: 2 + (i % 5),
  left: (i * 3.33) % 100,
  top: (i * 7.77) % 100,
  isGreen: i % 2 === 0,
  opacity: 0.2 + (i % 4) * 0.1,
  delay: (i % 6) * 0.8,
  duration: 8 + (i % 5) * 2,
}));

const CANDLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  height: 20 + (i * 5) % 60,
  isGreen: i % 3 !== 0,
  delay: i * 0.15,
  wickTop: 5 + (i % 3) * 5,
  wickBottom: 5 + ((i + 1) % 3) * 5,
}));

const TICKERS = [
  { symbol: "BTC/USD", price: "67,234.50", change: "+2.34%", isUp: true },
  { symbol: "ETH/USD", price: "3,456.78", change: "+1.56%", isUp: true },
  { symbol: "EUR/USD", price: "1.0876", change: "-0.12%", isUp: false },
  { symbol: "AAPL", price: "178.32", change: "+0.89%", isUp: true },
  { symbol: "TSLA", price: "245.67", change: "-1.23%", isUp: false },
  { symbol: "SPY", price: "512.45", change: "+0.45%", isUp: true },
];

const FEATURES = [
  { icon: Zap, title: "Automated Import", description: "Sync trades instantly from over 50+ brokers and platforms." },
  { icon: BarChart3, title: "Detailed Analytics", description: "Visualize your R-multiples, win rates, and daily P&L." },
  { icon: TrendingUp, title: "Strategy Tracking", description: "Identify which setups are profitable and which are leaking money." },
  { icon: Shield, title: "Private & Secure", description: "Your trading data is encrypted and strictly confidential." },
];

const SOCIAL_BUTTONS = [
  { provider: 'google', label: 'Google', icon: 'google' },
  { provider: 'apple', label: 'Apple', icon: 'apple' },
  { provider: 'facebook', label: 'Facebook', icon: 'facebook' },
  { provider: 'twitter', label: 'X', icon: 'twitter' },
  { provider: 'linkedin_oidc', label: 'LinkedIn', icon: 'linkedin' },
] as const;

// CSS Styles - injected once via useEffect
const AUTH_STYLES = `
  .auth-animate-float-slow { animation: auth-float-slow 20s ease-in-out infinite; will-change: transform; }
  .auth-animate-float-slow-reverse { animation: auth-float-slow-reverse 25s ease-in-out infinite; will-change: transform; }
  .auth-animate-pulse-slow { animation: auth-pulse-slow 8s ease-in-out infinite; will-change: opacity, transform; }
  .auth-animate-float-particle { animation: auth-float-particle 10s ease-in-out infinite; will-change: transform, opacity; }
  .auth-animate-grid-flow { animation: auth-grid-flow 20s linear infinite; will-change: transform; }
  .auth-animate-scan-line { animation: auth-scan-line 8s ease-in-out infinite; will-change: top, opacity; }
  .auth-animate-ticker { animation: auth-ticker 30s linear infinite; will-change: transform; }
  .auth-animate-candlestick { animation: auth-candlestick 3s ease-in-out infinite; will-change: transform, opacity; }
  .auth-animate-logo-float { animation: auth-logo-float 3s ease-in-out infinite; will-change: transform; }
  .auth-animate-pulse-glow { animation: auth-pulse-glow 3s ease-in-out infinite; will-change: transform, opacity; }
  .auth-animate-slide-up { animation: auth-slide-up 0.6s ease-out forwards; }
  .auth-animate-bounce-gentle { animation: auth-bounce-gentle 2s ease-in-out infinite; will-change: transform; }
  .auth-animate-fade-in-up { animation: auth-fade-in-up 0.5s ease-out forwards; }
  .auth-animate-shimmer { animation: auth-shimmer 3s ease-in-out infinite; background-size: 200% 100%; }
  
  @keyframes auth-float-slow {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    33% { transform: translate(30px, -30px) rotate(5deg); }
    66% { transform: translate(-20px, 20px) rotate(-5deg); }
  }
  @keyframes auth-float-slow-reverse {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    33% { transform: translate(-30px, 30px) rotate(-5deg); }
    66% { transform: translate(20px, -20px) rotate(5deg); }
  }
  @keyframes auth-pulse-slow {
    0%, 100% { opacity: 0.1; transform: scale(1); }
    50% { opacity: 0.2; transform: scale(1.1); }
  }
  @keyframes auth-float-particle {
    0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
    25% { transform: translateY(-30px) translateX(10px); opacity: 0.8; }
    50% { transform: translateY(-60px) translateX(-10px); opacity: 0.3; }
    75% { transform: translateY(-30px) translateX(15px); opacity: 0.6; }
  }
  @keyframes auth-grid-flow {
    0% { transform: translateY(0); }
    100% { transform: translateY(50px); }
  }
  @keyframes auth-scan-line {
    0% { top: -2px; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
  @keyframes auth-ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes auth-candlestick {
    0%, 100% { transform: scaleY(1); opacity: 0.6; }
    50% { transform: scaleY(1.2); opacity: 1; }
  }
  @keyframes auth-logo-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @keyframes auth-pulse-glow {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 0.7; }
  }
  @keyframes auth-slide-up {
    0% { transform: translateY(30px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  @keyframes auth-bounce-gentle {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-3px); }
  }
  @keyframes auth-shimmer {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  @keyframes auth-fade-in-up {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .auth-animate-float-slow,
    .auth-animate-float-slow-reverse,
    .auth-animate-pulse-slow,
    .auth-animate-float-particle,
    .auth-animate-grid-flow,
    .auth-animate-scan-line,
    .auth-animate-ticker,
    .auth-animate-candlestick,
    .auth-animate-logo-float,
    .auth-animate-pulse-glow,
    .auth-animate-bounce-gentle,
    .auth-animate-shimmer {
      animation: none !important;
    }
  }
`;

// Password strength calculator - pure function
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

// --- Memoized Sub-Components ---

const AnimatedCandlesticks = memo(() => (
  <div className="absolute bottom-0 left-0 right-0 h-48 flex items-end justify-center gap-3 opacity-20 overflow-hidden" style={{ contain: 'strict' }}>
    {CANDLES.map((candle) => (
      <div
        key={candle.id}
        className="relative flex flex-col items-center auth-animate-candlestick"
        style={{ animationDelay: `${candle.delay}s` }}
      >
        <div 
          className={cn("w-0.5 rounded-full", candle.isGreen ? "bg-emerald-500" : "bg-red-500")}
          style={{ height: candle.wickTop }}
        />
        <div 
          className={cn(
            "w-3 rounded-sm",
            candle.isGreen ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50",
            "shadow-lg"
          )}
          style={{ height: candle.height }}
        />
        <div 
          className={cn("w-0.5 rounded-full", candle.isGreen ? "bg-emerald-500" : "bg-red-500")}
          style={{ height: candle.wickBottom }}
        />
      </div>
    ))}
  </div>
));
AnimatedCandlesticks.displayName = 'AnimatedCandlesticks';

const AnimatedTicker = memo(() => (
  <div className="absolute top-0 left-0 right-0 overflow-hidden bg-black/30 backdrop-blur-sm border-b border-white/5" style={{ contain: 'layout' }}>
    <div className="auth-animate-ticker flex whitespace-nowrap py-2">
      {[...TICKERS, ...TICKERS].map((ticker, i) => (
        <div key={i} className="flex items-center gap-6 mx-8">
          <span className="text-gray-400 text-sm font-medium">{ticker.symbol}</span>
          <span className="text-white text-sm font-bold">{ticker.price}</span>
          <span className={cn(
            "text-xs font-semibold flex items-center gap-1",
            ticker.isUp ? "text-emerald-400" : "text-red-400"
          )}>
            {ticker.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {ticker.change}
          </span>
        </div>
      ))}
    </div>
  </div>
));
AnimatedTicker.displayName = 'AnimatedTicker';

const FloatingOrbs = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ contain: 'strict' }}>
    <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-500/30 rounded-full blur-[100px] auth-animate-float-slow" />
    <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] auth-animate-float-slow-reverse" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] auth-animate-pulse-slow" />
    
    {PARTICLES.map((p) => (
      <div
        key={p.id}
        className="absolute rounded-full auth-animate-float-particle"
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
));
FloatingOrbs.displayName = 'FloatingOrbs';

const AnimatedGrid = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ contain: 'strict' }}>
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98110_1px,transparent_1px),linear-gradient(to_bottom,#10b98110_1px,transparent_1px)] bg-[size:50px_50px] auth-animate-grid-flow" />
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent auth-animate-scan-line" />
    </div>
  </div>
));
AnimatedGrid.displayName = 'AnimatedGrid';

const AnimatedLogo = memo(({ size = "default" }: { size?: "default" | "large" }) => {
  const sizeClasses = size === "large" ? "w-16 h-16" : "w-12 h-12";
  const iconSize = size === "large" ? "w-8 h-8" : "w-6 h-6";
  
  return (
    <div className="relative group">
      <div className={cn(
        "absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 auth-animate-pulse-glow",
        sizeClasses
      )} />
      <div className={cn(
        sizeClasses,
        "relative rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-emerald-500/25 auth-animate-logo-float"
      )}>
        <div className="absolute inset-[1px] rounded-[10px] bg-gradient-to-br from-white/20 to-transparent" />
        <LineChart className={cn(iconSize, "text-white relative z-10")} />
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
    <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-center group hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-300 hover:scale-105">
      <div className="text-2xl font-bold text-emerald-400 tabular-nums">{displayValue}</div>
      <div className="text-sm text-gray-400">{label}</div>
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
    className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transform transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 hover:border-emerald-500/30 group auth-animate-slide-up opacity-0"
    style={{ animationDelay: `${index * 150 + 300}ms`, animationFillMode: 'forwards' }}
  >
    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow duration-300 group-hover:scale-110">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <h3 className="font-semibold text-white mb-1 group-hover:text-emerald-400 transition-colors">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  </div>
));
FeatureCard.displayName = 'FeatureCard';

// Social Icons - memoized SVG components
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
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 auth-animate-bounce-gentle">
          <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
            <Activity className="w-2 h-2" />
            Last used
          </span>
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-emerald-500 mx-auto" />
        </div>
      )}
      <Button
        variant="outline"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full relative overflow-hidden transition-all duration-300",
          "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
          "hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5",
          isLastUsed && "border-emerald-500/50 ring-2 ring-emerald-500/20 bg-emerald-500/5"
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
        isFocused && "opacity-30"
      )} />
      
      <div className="relative">
        <Icon className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300",
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
            "pl-10 bg-[#0f1115] border-white/10 text-white placeholder:text-gray-600",
            "focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20",
            "transition-all duration-300",
            showPasswordToggle && "pr-10",
            badge && "pr-24"
          )}
        />
        {showPasswordToggle && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
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
    { check: password.length >= 8, label: "8+ characters" },
    { check: /[A-Z]/.test(password) && /[a-z]/.test(password), label: "Mixed case" },
    { check: /\d/.test(password), label: "Number" },
    { check: /[!@#$%^&*(),.?":{}|<>]/.test(password), label: "Special char" },
  ], [password]);

  return (
    <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/5 auth-animate-fade-in-up">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", strength.color)}
            style={{ width: `${strength.score}%` }}
          />
        </div>
        <span className={cn(
          "text-[10px] font-bold uppercase min-w-[50px] text-right",
          strength.score <= 25 ? "text-red-400" :
          strength.score <= 50 ? "text-orange-400" :
          strength.score <= 75 ? "text-yellow-400" : "text-emerald-400"
        )}>
          {strength.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {checks.map((item, i) => (
          <div key={i} className={cn(
            "flex items-center gap-1.5 transition-colors duration-300",
            item.check ? "text-emerald-400" : "text-gray-500"
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
      toast({ title: "Terms Required", description: "Please agree to the terms and conditions to continue.", variant: "destructive" });
      return;
    }

    if (passwordStrength.score < 50) {
      toast({ title: "Weak Password", description: "Please choose a stronger password for better security.", variant: "destructive" });
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
          toast({ title: "Account exists", description: "This email is already registered. Please sign in instead.", variant: "destructive" });
          setActiveTab("signin");
        } else {
          throw error;
        }
      } else {
        saveAuthMethod('email');
        toast({ title: "🎉 Welcome to Tradeville!", description: "Account created. Please check your email to verify." });
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
      toast({ title: "Welcome back Trader! 📈", description: "Successfully logged in to your journal." });
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message || "Invalid credentials", variant: "destructive" });
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
      toast({ title: "Social Login Error", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  }, [saveAuthMethod, toast]);

  const handleForgotPassword = useCallback(async () => {
    if (!email) {
      toast({ title: "Email Required", description: "Please enter your email address first.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({ title: "Reset Link Sent ✉️", description: "Check your email for the password reset link." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [email, toast]);

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), []);

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#0a0b0f] text-white selection:bg-emerald-500/30">
      {/* Background layers */}
      <FloatingOrbs />
      <AnimatedGrid />
      <AnimatedTicker />
      <AnimatedCandlesticks />

      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative z-10 border-r border-white/5">
        <div 
          className={cn(
            "space-y-8 transition-all duration-1000 transform max-w-xl mx-auto",
            isVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
          )}
        >
          {/* Logo/Brand */}
          <div className="space-y-6 auth-animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-4">
              <AnimatedLogo />
              <div>
                <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">Tradeville</span>
                <div className="text-xs text-emerald-400 font-medium tracking-wider uppercase">Trading Journal</div>
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight">
              Journal your way to{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-blue-400 bg-clip-text text-transparent">
                  Profitability
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full animate-pulse" />
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-md leading-relaxed">
              Stop trading blindly. Track, analyze, and improve your trading performance with the most advanced journaling platform.
            </p>
          </div>

          {/* Animated Stats */}
          <div className="grid grid-cols-3 gap-4 auth-animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <AnimatedStat value="50K+" label="Active Traders" />
            <AnimatedStat value="2M+" label="Trades Logged" />
            <AnimatedStat value="98%" label="Satisfaction" />
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 gap-4">
            {FEATURES.map((feature, index) => (
              <FeatureCard key={index} {...feature} index={index} />
            ))}
          </div>

          {/* Testimonial */}
          <div 
            className="p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 relative overflow-hidden group hover:border-emerald-500/30 transition-colors duration-300 auth-animate-fade-in-up"
            style={{ animationDelay: '900ms' }}
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-blue-500" />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="flex gap-1 mb-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} className="w-4 h-4 text-yellow-400 fill-current animate-pulse" style={{ animationDelay: `${i * 100}ms` }} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            
            <p className="text-gray-300 italic relative z-10">
              "Tradeville helped me identify that I was over-trading on Fridays. I cut my losing days by 40% in the first month."
            </p>
            <div className="mt-4 flex items-center gap-3">
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <Card 
          className={cn(
            "w-full max-w-md border-white/10 bg-[#12131a]/90 backdrop-blur-xl shadow-2xl transition-all duration-700 transform relative overflow-hidden",
            isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95"
          )}
        >
          {/* Animated border gradient */}
          <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-br from-emerald-500/50 via-transparent to-blue-500/50 pointer-events-none">
            <div className="absolute inset-0 rounded-xl bg-[#12131a]" />
          </div>
          
          {/* Top accent line with animation */}
          <div className="absolute top-0 left-0 w-full h-1 overflow-hidden rounded-t-xl">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 auth-animate-shimmer" />
          </div>

          <CardHeader className="text-center pb-2 pt-8 relative z-10">
            <div className="lg:hidden flex justify-center mb-6">
              <AnimatedLogo size="large" />
            </div>
            
            <CardTitle className="text-2xl font-bold text-white">
              {activeTab === "signin" ? "Welcome back" : "Start your journey"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {activeTab === "signin" 
                ? "Access your trading journal" 
                : "Join 10,000+ profitable traders today"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 relative z-10">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 border border-white/5 rounded-lg">
                <TabsTrigger 
                  value="signin"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-white data-[state=active]:border-white/10 transition-all duration-300 text-gray-400 rounded-md"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-white data-[state=active]:border-white/10 transition-all duration-300 text-gray-400 rounded-md"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-5 mt-6 auth-animate-fade-in-up">
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
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
                            Last used
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
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors hover:underline"
                      >
                        Forgot password?
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
                      className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <label htmlFor="remember" className="text-sm text-gray-400 cursor-pointer select-none">
                      Remember email
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-2.5 transition-all duration-300 group shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 relative overflow-hidden" 
                    disabled={loading}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
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
                
                {/* Social Buttons */}
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
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
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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

              <TabsContent value="signup" className="space-y-5 mt-6 auth-animate-fade-in-up">
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
                      className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 mt-0.5"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-400 cursor-pointer leading-relaxed">
                      I agree to the{" "}
                      <a href="#" className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors">Terms of Service</a>
                      {" "}and{" "}
                      <a href="#" className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors">Privacy Policy</a>
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-2.5 transition-all duration-300 group shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 relative overflow-hidden" 
                    disabled={loading || !agreedToTerms}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span className="relative">Create Free Account</span>
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

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
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
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <Zap className="w-3 h-3" />
                    14-day free trial • No credit card required
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          {/* Footer Security Badge */}
          <div className="bg-black/30 py-3 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-gray-500 relative z-10 rounded-b-xl">
            <Shield className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span>Bank-grade 256-bit AES Encryption</span>
          </div>
        </Card>
      </div>
    </div>
  );
}