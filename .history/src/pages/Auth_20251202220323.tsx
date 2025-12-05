import { useState, useEffect, useMemo, useCallback, memo } from "react";
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
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Constants ---
const LAST_AUTH_METHOD_KEY = "tradeville-last-auth-method";
const REMEMBER_EMAIL_KEY = "tradeville-remember-email";

// Pre-computed static data to avoid runtime calculations
const STATIC_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: (i * 12.5) % 100,
  top: ((i * 17) % 100),
  delay: i * 0.5,
  size: 2 + (i % 3),
}));

const SOCIAL_BUTTONS = [
  { 
    provider: 'google' as const, 
    label: 'Google', 
    iconPath: [
      { fill: "#4285F4", d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" },
      { fill: "#34A853", d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" },
      { fill: "#FBBC05", d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" },
      { fill: "#EA4335", d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" },
    ]
  },
  { 
    provider: 'apple' as const, 
    label: 'Apple', 
    iconPath: [{ fill: "currentColor", d: "M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" }],
    iconClass: "text-white"
  },
  { 
    provider: 'facebook' as const, 
    label: 'Facebook', 
    iconPath: [{ fill: "currentColor", d: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" }],
    iconClass: "text-[#1877F2]"
  },
  { 
    provider: 'twitter' as const, 
    label: 'X', 
    iconPath: [{ fill: "currentColor", d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" }],
    iconClass: "text-white"
  },
  { 
    provider: 'linkedin_oidc' as const, 
    label: 'LinkedIn', 
    iconPath: [{ fill: "currentColor", d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" }],
    iconClass: "text-[#0A66C2]"
  },
];

const FEATURES = [
  { icon: Zap, title: "Automated Import", description: "Sync trades from 50+ brokers instantly." },
  { icon: BarChart3, title: "Detailed Analytics", description: "Visualize R-multiples, win rates, and P&L." },
  { icon: TrendingUp, title: "Strategy Tracking", description: "Identify profitable vs losing setups." },
  { icon: Shield, title: "Private & Secure", description: "Bank-grade encryption for your data." },
];

// --- Optimized CSS (injected once) ---
const OPTIMIZED_STYLES = `
  .auth-bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    will-change: transform;
    contain: strict;
  }
  
  .auth-bg-orb-1 {
    top: -20%;
    left: -20%;
    width: 50%;
    height: 50%;
    background: rgba(16, 185, 129, 0.15);
    animation: auth-float 20s ease-in-out infinite;
  }
  
  .auth-bg-orb-2 {
    bottom: -20%;
    right: -20%;
    width: 60%;
    height: 60%;
    background: rgba(59, 130, 246, 0.1);
    animation: auth-float 25s ease-in-out infinite reverse;
  }
  
  .auth-particle {
    position: absolute;
    border-radius: 50%;
    background: rgba(16, 185, 129, 0.3);
    will-change: transform, opacity;
    animation: auth-particle-float 12s ease-in-out infinite;
  }
  
  .auth-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(16, 185, 129, 0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(16, 185, 129, 0.05) 1px, transparent 1px);
    background-size: 60px 60px;
    will-change: transform;
    animation: auth-grid-scroll 30s linear infinite;
  }
  
  .auth-card-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #10b981, #3b82f6, #10b981);
    background-size: 200% 100%;
    animation: auth-shimmer 3s ease-in-out infinite;
  }
  
  .auth-logo {
    will-change: transform;
    animation: auth-logo-bob 4s ease-in-out infinite;
  }
  
  .auth-feature-card {
    opacity: 0;
    transform: translateY(20px);
    animation: auth-slide-up 0.5s ease-out forwards;
  }
  
  .auth-input-glow {
    position: absolute;
    inset: -1px;
    border-radius: 8px;
    background: linear-gradient(135deg, #10b981, #3b82f6);
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: -1;
    filter: blur(4px);
  }
  
  .auth-input-wrapper:focus-within .auth-input-glow {
    opacity: 0.3;
  }
  
  .auth-btn-shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
  }
  
  .auth-btn:hover .auth-btn-shimmer {
    transform: translateX(100%);
  }
  
  @keyframes auth-float {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(20px, -20px); }
  }
  
  @keyframes auth-particle-float {
    0%, 100% { transform: translateY(0); opacity: 0.3; }
    50% { transform: translateY(-40px); opacity: 0.7; }
  }
  
  @keyframes auth-grid-scroll {
    0% { transform: translateY(0); }
    100% { transform: translateY(60px); }
  }
  
  @keyframes auth-shimmer {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  
  @keyframes auth-logo-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  
  @keyframes auth-slide-up {
    to { opacity: 1; transform: translateY(0); }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .auth-bg-orb, .auth-particle, .auth-grid, .auth-card-glow, .auth-logo, .auth-feature-card {
      animation: none !important;
    }
    .auth-feature-card {
      opacity: 1;
      transform: none;
    }
  }
`;

// --- Password Strength (memoized calculation) ---
const calculatePasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: "", color: "" };
  
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

// --- Memoized Components ---

const OptimizedBackground = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ contain: 'strict' }}>
    <div className="auth-bg-orb auth-bg-orb-1" />
    <div className="auth-bg-orb auth-bg-orb-2" />
    <div className="auth-grid" />
    {STATIC_PARTICLES.map((p) => (
      <div
        key={p.id}
        className="auth-particle"
        style={{
          left: `${p.left}%`,
          top: `${p.top}%`,
          width: p.size,
          height: p.size,
          animationDelay: `${p.delay}s`,
        }}
      />
    ))}
  </div>
));
OptimizedBackground.displayName = 'OptimizedBackground';

const Logo = memo(({ size = "default" }: { size?: "default" | "large" }) => {
  const sizeClass = size === "large" ? "w-14 h-14" : "w-11 h-11";
  const iconSize = size === "large" ? "w-7 h-7" : "w-5 h-5";
  
  return (
    <div className={cn("auth-logo rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20", sizeClass)}>
      <LineChart className={cn("text-white", iconSize)} />
    </div>
  );
});
Logo.displayName = 'Logo';

const FeatureCard = memo(({ icon: Icon, title, description, index }: { 
  icon: typeof Zap; 
  title: string; 
  description: string;
  index: number;
}) => (
  <div 
    className="auth-feature-card flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-emerald-500/30 transition-colors"
    style={{ animationDelay: `${200 + index * 100}ms` }}
  >
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="min-w-0">
      <h3 className="font-medium text-white text-sm">{title}</h3>
      <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
    </div>
  </div>
));
FeatureCard.displayName = 'FeatureCard';

const SocialIcon = memo(({ paths, className }: { paths: { fill: string; d: string }[]; className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24">
    {paths.map((path, i) => (
      <path key={i} fill={path.fill} d={path.d} />
    ))}
  </svg>
));
SocialIcon.displayName = 'SocialIcon';

const SocialButton = memo(({ 
  provider, 
  label, 
  iconPath,
  iconClass,
  onClick, 
  disabled,
  isLastUsed
}: { 
  provider: string;
  label: string;
  iconPath: { fill: string; d: string }[];
  iconClass?: string;
  onClick: () => void;
  disabled: boolean;
  isLastUsed?: boolean;
}) => (
  <div className="relative">
    {isLastUsed && (
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
        <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
          Last used
        </span>
      </div>
    )}
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "auth-btn w-full relative overflow-hidden bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors",
        isLastUsed && "border-emerald-500/50 bg-emerald-500/5"
      )}
    >
      <span className="auth-btn-shimmer" />
      <span className="relative flex items-center justify-center gap-2">
        <SocialIcon paths={iconPath} className={iconClass} />
        <span className="hidden sm:inline text-xs">{label}</span>
      </span>
    </Button>
  </div>
));
SocialButton.displayName = 'SocialButton';

const PasswordStrengthIndicator = memo(({ password }: { password: string }) => {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);
  
  if (!password) return null;
  
  const checks = [
    { check: password.length >= 8, label: "8+ chars" },
    { check: /[A-Z]/.test(password) && /[a-z]/.test(password), label: "Mixed case" },
    { check: /\d/.test(password), label: "Number" },
    { check: /[!@#$%^&*(),.?":{}|<>]/.test(password), label: "Symbol" },
  ];
  
  return (
    <div className="space-y-2 p-2 bg-white/5 rounded-lg border border-white/5">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-300", strength.color)}
            style={{ width: `${strength.score}%` }}
          />
        </div>
        <span className={cn(
          "text-[10px] font-bold uppercase",
          strength.score <= 25 ? "text-red-400" :
          strength.score <= 50 ? "text-orange-400" :
          strength.score <= 75 ? "text-yellow-400" : "text-emerald-400"
        )}>
          {strength.label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1 text-[10px]">
        {checks.map((item, i) => (
          <div key={i} className={cn("flex items-center gap-1", item.check ? "text-emerald-400" : "text-gray-500")}>
            <CheckCircle2 className="w-2.5 h-2.5" />
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
  const [lastUsedProvider, setLastUsedProvider] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Single effect for initialization
  useEffect(() => {
    // Inject styles once
    const styleId = 'auth-optimized-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = OPTIMIZED_STYLES;
      document.head.appendChild(style);
    }

    // Load saved preferences
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    const savedProvider = localStorage.getItem(LAST_AUTH_METHOD_KEY);
    
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    if (savedProvider) {
      setLastUsedProvider(savedProvider);
    }

    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      } else {
        setMounted(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) navigate("/");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const saveAuthMethod = useCallback((method: string) => {
    localStorage.setItem(LAST_AUTH_METHOD_KEY, method);
    setLastUsedProvider(method);
  }, []);

  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({ title: "Terms Required", description: "Please agree to the terms.", variant: "destructive" });
      return;
    }

    const strength = calculatePasswordStrength(password);
    if (strength.score < 50) {
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
  }, [email, password, name, agreedToTerms, saveAuthMethod, toast]);

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
      toast({ title: "Welcome back! 📈", description: "Successfully signed in." });
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [email, password, rememberMe, saveAuthMethod, toast]);

  const handleSocialLogin = useCallback(async (provider: typeof SOCIAL_BUTTONS[number]['provider']) => {
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

    setLoading(true);
    try {
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

  const togglePassword = useCallback(() => setShowPassword(p => !p), []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0b0f]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#0a0b0f] text-white">
      <OptimizedBackground />

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-10 relative z-10 border-r border-white/5">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <span className="text-2xl font-bold">Tradeville</span>
              <div className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Trading Journal</div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold leading-tight">
            Journal your way to{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Profitability
            </span>
          </h1>
          
          <p className="text-gray-400">
            Track, analyze, and improve your trading with our advanced journaling platform.
          </p>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-xl font-bold text-emerald-400">50K+</div>
              <div className="text-[10px] text-gray-400">Traders</div>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-xl font-bold text-blue-400">2M+</div>
              <div className="text-[10px] text-gray-400">Trades</div>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-xl font-bold text-purple-400">98%</div>
              <div className="text-[10px] text-gray-400">Satisfaction</div>
            </div>
          </div>

          <div className="space-y-2">
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} {...f} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 relative z-10">
        <Card className="w-full max-w-md border-white/10 bg-[#12131a]/95 backdrop-blur shadow-2xl relative overflow-hidden">
          <div className="auth-card-glow" />
          
          <CardHeader className="text-center pb-4 pt-6">
            <div className="lg:hidden flex justify-center mb-4">
              <Logo size="large" />
            </div>
            <CardTitle className="text-xl font-bold">
              {activeTab === "signin" ? "Welcome back" : "Get started"}
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              {activeTab === "signin" ? "Access your trading journal" : "Create your free account"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 bg-black/40 p-1 border border-white/5 mb-4">
                <TabsTrigger value="signin" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 text-sm">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 text-sm">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-0">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email" className="text-gray-300 text-xs uppercase tracking-wide font-medium">Email</Label>
                    <div className="auth-input-wrapper relative">
                      <div className="auth-input-glow" />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="trader@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-9 bg-[#0f1115] border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
                      />
                      {lastUsedProvider === 'email' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                          Last used
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="signin-password" className="text-gray-300 text-xs uppercase tracking-wide font-medium">Password</Label>
                      <button type="button" onClick={handleForgotPassword} className="text-[10px] text-emerald-400 hover:underline">
                        Forgot?
                      </button>
                    </div>
                    <div className="auth-input-wrapper relative">
                      <div className="auth-input-glow" />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-9 pr-9 bg-[#0f1115] border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
                      />
                      <button type="button" onClick={togglePassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(c) => setRememberMe(!!c)}
                      className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <label htmlFor="remember" className="text-xs text-gray-400 cursor-pointer">Remember email</label>
                  </div>

                  <Button 
                    type="submit" 
                    className="auth-btn w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium relative overflow-hidden" 
                    disabled={loading}
                  >
                    <span className="auth-btn-shimmer" />
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <span className="relative flex items-center justify-center gap-2">
                        Sign In <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="relative py-2">
                  <Separator className="bg-white/10" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#12131a] px-2 text-[10px] text-gray-500 uppercase">
                    Or
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {SOCIAL_BUTTONS.slice(0, 3).map((btn) => (
                    <SocialButton
                      key={btn.provider}
                      {...btn}
                      onClick={() => handleSocialLogin(btn.provider)}
                      disabled={loading}
                      isLastUsed={lastUsedProvider === btn.provider}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SOCIAL_BUTTONS.slice(3).map((btn) => (
                    <SocialButton
                      key={btn.provider}
                      {...btn}
                      onClick={() => handleSocialLogin(btn.provider)}
                      disabled={loading}
                      isLastUsed={lastUsedProvider === btn.provider}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-0">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-gray-300 text-xs uppercase tracking-wide font-medium">Name</Label>
                    <div className="auth-input-wrapper relative">
                      <div className="auth-input-glow" />
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-9 bg-[#0f1115] border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-gray-300 text-xs uppercase tracking-wide font-medium">Email</Label>
                    <div className="auth-input-wrapper relative">
                      <div className="auth-input-glow" />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="trader@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-9 bg-[#0f1115] border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-gray-300 text-xs uppercase tracking-wide font-medium">Password</Label>
                    <div className="auth-input-wrapper relative">
                      <div className="auth-input-glow" />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pl-9 pr-9 bg-[#0f1115] border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
                      />
                      <button type="button" onClick={togglePassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrengthIndicator password={password} />
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox 
                      id="terms" 
                      checked={agreedToTerms}
                      onCheckedChange={(c) => setAgreedToTerms(!!c)}
                      className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 mt-0.5"
                    />
                    <label htmlFor="terms" className="text-xs text-gray-400 cursor-pointer leading-relaxed">
                      I agree to the{" "}
                      <a href="/terms" className="text-emerald-400 hover:underline">Terms</a>
                      {" "}and{" "}
                      <a href="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</a>
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="auth-btn w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium relative overflow-hidden" 
                    disabled={loading || !agreedToTerms}
                  >
                    <span className="auth-btn-shimmer" />
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <span className="relative flex items-center justify-center gap-2">
                        Create Account <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="relative py-2">
                  <Separator className="bg-white/10" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#12131a] px-2 text-[10px] text-gray-500 uppercase">
                    Or
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {SOCIAL_BUTTONS.slice(0, 3).map((btn) => (
                    <SocialButton
                      key={btn.provider}
                      {...btn}
                      onClick={() => handleSocialLogin(btn.provider)}
                      disabled={loading}
                      isLastUsed={false}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SOCIAL_BUTTONS.slice(3).map((btn) => (
                    <SocialButton
                      key={btn.provider}
                      {...btn}
                      onClick={() => handleSocialLogin(btn.provider)}
                      disabled={loading}
                      isLastUsed={false}
                    />
                  ))}
                </div>

                <div className="flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                    <Zap className="w-3 h-3" />
                    14-day free trial • No card required
                  </span>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <div className="bg-black/30 py-2.5 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-gray-500">
            <Shield className="w-3 h-3 text-emerald-500" />
            256-bit AES Encryption
          </div>
        </Card>
      </div>
    </div>
  );
}