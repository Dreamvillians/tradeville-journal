import { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  User, 
  Shield, 
  TrendingUp, 
  BarChart3, 
  CheckCircle2,
  ArrowRight,
  Loader2,
  LineChart,
  Target,
  BookOpen,
  Clock,
  PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type AuthProvider = 'google' | 'twitter' | 'apple' | 'linkedin_oidc' | 'facebook' | 'email';

interface LastUsedLogin {
  provider: AuthProvider;
  email?: string;
  timestamp: number;
}

// Constants
const LAST_LOGIN_KEY = 'tradeville_last_login';

const PROVIDER_CONFIG: Record<AuthProvider, { name: string; icon: React.ReactNode; color: string }> = {
  google: {
    name: 'Google',
    color: 'border-red-500/50 bg-red-500/10',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  apple: {
    name: 'Apple',
    color: 'border-gray-500/50 bg-gray-500/10',
    icon: (
      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    ),
  },
  facebook: {
    name: 'Facebook',
    color: 'border-blue-600/50 bg-blue-600/10',
    icon: (
      <svg className="h-4 w-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  twitter: {
    name: 'X',
    color: 'border-gray-400/50 bg-gray-400/10',
    icon: (
      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  linkedin_oidc: {
    name: 'LinkedIn',
    color: 'border-blue-500/50 bg-blue-500/10',
    icon: (
      <svg className="h-4 w-4 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  email: {
    name: 'Email',
    color: 'border-emerald-500/50 bg-emerald-500/10',
    icon: <Mail className="h-4 w-4 text-emerald-400" />,
  },
};

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
  return { score: Math.min(score, 100), label: "Strong", color: "bg-green-500" };
};

// Animated background component
const AnimatedBackground = () => {
  const [particles] = useState(() => 
    [...Array(20)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 5 + Math.random() * 10,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-full blur-3xl animate-bounce" style={{ animationDuration: '6s' }} />
      
      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 bg-emerald-400/20 rounded-full"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animation: `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      {/* Trading chart decoration */}
      <svg className="absolute bottom-0 left-0 w-full h-32 opacity-10" preserveAspectRatio="none">
        <path
          d="M0,100 L50,80 L100,90 L150,60 L200,70 L250,40 L300,50 L350,20 L400,35 L450,15 L500,25 L550,5 L600,15 L650,10 L700,20 L750,5 L800,15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-emerald-400"
        />
      </svg>
    </div>
  );
};

// Tradeville Logo Component
const TradevilleLogo = ({ size = "default" }: { size?: "default" | "large" }) => {
  const sizeClasses = size === "large" ? "w-16 h-16" : "w-12 h-12";
  const iconSize = size === "large" ? "w-8 h-8" : "w-6 h-6";
  
  return (
    <div className={cn(
      sizeClasses,
      "rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
    )}>
      <LineChart className={cn(iconSize, "text-white")} />
    </div>
  );
};

// Feature card component
const FeatureCard = ({ icon: Icon, title, description, delay }: { 
  icon: any; 
  title: string; 
  description: string;
  delay: number;
}) => (
  <div 
    className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transform transition-all duration-500 hover:scale-105 hover:bg-white/10"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  </div>
);

// Last Used Badge Component
const LastUsedBadge = () => (
  <Badge 
    variant="secondary" 
    className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 animate-pulse"
  >
    <Clock className="w-2 h-2 mr-1" />
    Last used
  </Badge>
);

// Social button component with last used indicator
const SocialButton = ({ 
  provider, 
  onClick, 
  disabled,
  isLastUsed 
}: { 
  provider: AuthProvider;
  onClick: () => void;
  disabled: boolean;
  isLastUsed: boolean;
}) => {
  const config = PROVIDER_CONFIG[provider];
  
  return (
    <div className="relative">
      {isLastUsed && <LastUsedBadge />}
      <Button
        variant="outline"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full group relative overflow-hidden transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10",
          isLastUsed && config.color
        )}
      >
        <span className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
        <span className="relative flex items-center justify-center gap-2">
          {config.icon}
          <span className="hidden sm:inline text-xs">{config.name}</span>
        </span>
      </Button>
    </div>
  );
};

// Helper functions for localStorage
const getLastUsedLogin = (): LastUsedLogin | null => {
  try {
    const stored = localStorage.getItem(LAST_LOGIN_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading last login:', error);
  }
  return null;
};

const setLastUsedLogin = (provider: AuthProvider, email?: string) => {
  try {
    const data: LastUsedLogin = {
      provider,
      email,
      timestamp: Date.now(),
    };
    localStorage.setItem(LAST_LOGIN_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving last login:', error);
  }
};

const getTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

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
  const [lastUsedLogin, setLastUsedLoginState] = useState<LastUsedLogin | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  useEffect(() => {
    setIsVisible(true);
    
    // Load last used login
    const lastLogin = getLastUsedLogin();
    setLastUsedLoginState(lastLogin);
    
    // Pre-fill email if available
    if (lastLogin?.email) {
      setEmail(lastLogin.email);
    }
    
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength.score < 50) {
      toast({
        title: "Weak Password",
        description: "Please choose a stronger password for better security.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: name,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        // Save last used login
        setLastUsedLogin('email', email);
        setLastUsedLoginState({ provider: 'email', email, timestamp: Date.now() });
        
        toast({
          title: "🎉 Welcome to Tradeville!",
          description: "Account created successfully. Check your email to verify your account.",
        });
        setPassword("");
        setName("");
        setAgreedToTerms(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Save last used login
        setLastUsedLogin('email', email);
        
        toast({
          title: "Welcome back! 📈",
          description: "Let's review your trades.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'twitter' | 'apple' | 'linkedin_oidc' | 'facebook') => {
    try {
      setLoading(true);
      
      // Save last used login before redirect
      setLastUsedLogin(provider);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Check your email 📧",
        description: "We've sent you a password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: BookOpen,
      title: "Trade Journaling",
      description: "Log every trade with detailed notes, screenshots, and emotional state tracking.",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Visualize your performance with powerful charts and key trading metrics.",
    },
    {
      icon: Target,
      title: "Pattern Recognition",
      description: "Identify your winning setups and eliminate unprofitable patterns.",
    },
    {
      icon: PieChart,
      title: "Risk Management",
      description: "Track your risk/reward ratios and position sizing across all trades.",
    },
  ];

  const socialProviders: AuthProvider[] = ['google', 'apple', 'facebook', 'twitter', 'linkedin_oidc'];

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Left Panel - Features (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative z-10">
        <div 
          className={cn(
            "space-y-8 transition-all duration-1000 transform",
            isVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
          )}
        >
          {/* Logo/Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TradevilleLogo />
              <span className="text-3xl font-bold text-white">Tradeville</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Your trades deserve{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                better analysis
              </span>
            </h1>
            <p className="text-lg text-gray-300">
              Join thousands of traders who use Tradeville to track, analyze, and improve their trading performance.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-center">
              <div className="text-2xl font-bold text-emerald-400">50K+</div>
              <div className="text-sm text-gray-400">Active Traders</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-center">
              <div className="text-2xl font-bold text-blue-400">2M+</div>
              <div className="text-sm text-gray-400">Trades Logged</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-center">
              <div className="text-2xl font-bold text-purple-400">98%</div>
              <div className="text-sm text-gray-400">Satisfaction</div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-4">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={index * 100}
              />
            ))}
          </div>

          {/* Testimonial */}
          <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <p className="text-gray-300 italic">
              "Tradeville helped me identify that I was overtrading on Mondays. After adjusting my strategy, my win rate improved by 23%. This tool is a game-changer!"
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold">
                MK
              </div>
              <div>
                <p className="font-semibold text-white">Michael K.</p>
                <p className="text-sm text-gray-400">Day Trader, 3 years</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <Card 
          className={cn(
            "w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl transition-all duration-1000 transform",
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          )}
        >
          <CardHeader className="text-center pb-2">
            {/* Mobile Logo */}
            <div className="lg:hidden flex flex-col items-center mb-4">
              <TradevilleLogo size="large" />
              <span className="text-2xl font-bold text-white mt-2">Tradeville</span>
            </div>
            
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {activeTab === "signin" ? "Welcome Back" : "Start Trading Smarter"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {activeTab === "signin" 
                ? "Enter your credentials to access your trading journal" 
                : "Create your free account and elevate your trading"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {/* Last Used Login Indicator */}
            {lastUsedLogin && activeTab === "signin" && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <div className="flex-shrink-0">
                  {PROVIDER_CONFIG[lastUsedLogin.provider].icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-emerald-400 font-medium">
                    Last signed in with {PROVIDER_CONFIG[lastUsedLogin.provider].name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {lastUsedLogin.email || getTimeAgo(lastUsedLogin.timestamp)}
                  </p>
                </div>
                <Clock className="w-4 h-4 text-gray-500" />
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1">
                <TabsTrigger 
                  value="signin"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="trader@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-gray-300">Password</Label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm text-gray-400 cursor-pointer"
                    >
                      Remember me for 30 days
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 transition-all duration-300 group" 
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="bg-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900/50 px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {socialProviders.map((provider) => (
                    <SocialButton
                      key={provider}
                      provider={provider}
                      onClick={() => handleSocialLogin(provider as any)}
                      disabled={loading}
                      isLastUsed={lastUsedLogin?.provider === provider}
                    />
                  ))}
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 pt-4 text-xs text-gray-500">
                  <Shield className="w-3 h-3" />
                  <span>Your trading data is encrypted and secure</span>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-gray-300">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Trader"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="trader@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-300", passwordStrength.color)}
                              style={{ width: `${passwordStrength.score}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-xs font-medium min-w-[50px]",
                            passwordStrength.score <= 25 ? "text-red-400" :
                            passwordStrength.score <= 50 ? "text-orange-400" :
                            passwordStrength.score <= 75 ? "text-yellow-400" : "text-green-400"
                          )}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className={cn("flex items-center gap-1", password.length >= 8 ? "text-green-400" : "text-gray-500")}>
                            <CheckCircle2 className="w-3 h-3" />
                            8+ characters
                          </div>
                          <div className={cn("flex items-center gap-1", /[A-Z]/.test(password) && /[a-z]/.test(password) ? "text-green-400" : "text-gray-500")}>
                            <CheckCircle2 className="w-3 h-3" />
                            Mixed case
                          </div>
                          <div className={cn("flex items-center gap-1", /\d/.test(password) ? "text-green-400" : "text-gray-500")}>
                            <CheckCircle2 className="w-3 h-3" />
                            Number
                          </div>
                          <div className={cn("flex items-center gap-1", /[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-green-400" : "text-gray-500")}>
                            <CheckCircle2 className="w-3 h-3" />
                            Special char
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 mt-0.5"
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-gray-400 cursor-pointer leading-relaxed"
                    >
                      I agree to the{" "}
                      <a href="/terms" className="text-emerald-400 hover:underline">Terms of Service</a>
                      {" "}and{" "}
                      <a href="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</a>
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 transition-all duration-300 group" 
                    disabled={loading || !agreedToTerms}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Create Account
                        <TrendingUp className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="bg-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900/50 px-2 text-gray-500">Or sign up with</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {socialProviders.map((provider) => (
                    <SocialButton
                      key={provider}
                      provider={provider}
                      onClick={() => handleSocialLogin(provider as any)}
                      disabled={loading}
                      isLastUsed={false}
                    />
                  ))}
                </div>

                {/* Free Trial Badge */}
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    14-day free trial • No credit card required
                  </Badge>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Add CSS for float animation */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }
      `}</style>
    </div>
  );
}