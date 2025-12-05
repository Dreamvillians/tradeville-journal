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
import { Progress } from "@/components/ui/progress";
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
  Sparkles,
  ArrowRight,
  Loader2,
  LineChart,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Constants ---
const LAST_AUTH_METHOD_KEY = "tradeville-last-auth-method";
const REMEMBER_EMAIL_KEY = "tradeville-remember-email";

// --- Helper Components ---

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
const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
    <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
    
    {/* Grid Pattern Overlay */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

    {/* Floating particles */}
    {[...Array(15)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${10 + Math.random() * 10}s`,
        }}
      />
    ))}
  </div>
);

// Feature card component
const FeatureCard = ({ icon: Icon, title, description, delay }: { 
  icon: any; 
  title: string; 
  description: string;
  delay: number;
}) => (
  <div 
    className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transform transition-all duration-500 hover:scale-105 hover:bg-white/10 hover:border-primary/30"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-lg shadow-primary/20">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  </div>
);

// Social button component
const SocialButton = ({ 
  provider, 
  icon, 
  label, 
  onClick, 
  disabled,
  isLastUsed
}: { 
  provider: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
  isLastUsed?: boolean;
}) => (
  <div className="relative w-full">
    {isLastUsed && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
           Last used
        </span>
        {/* Triangle pointer */}
        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-emerald-500 mx-auto" />
      </div>
    )}
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full group relative overflow-hidden transition-all duration-300",
        "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
        isLastUsed && "border-emerald-500/50 ring-1 ring-emerald-500/20 bg-emerald-500/5"
      )}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
      <span className="relative flex items-center justify-center gap-2">
        {icon}
        <span className="hidden sm:inline text-xs">{label}</span>
      </span>
    </Button>
  </div>
);

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
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Initial Load Logic
  useEffect(() => {
    setIsVisible(true);
    
    // 1. Check for remembered email
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // 2. Check for last used provider
    const savedProvider = localStorage.getItem(LAST_AUTH_METHOD_KEY);
    if (savedProvider) {
      setLastUsedProvider(savedProvider);
      // If they used email last time, ensure we are on the signin tab
      if (savedProvider === 'email') {
        setActiveTab('signin');
      }
    }

    // 3. Check Auth Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Helper to save auth method
  const saveAuthMethod = (method: string) => {
    localStorage.setItem(LAST_AUTH_METHOD_KEY, method);
    setLastUsedProvider(method);
  };

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
          setActiveTab("signin");
        } else {
          throw error;
        }
      } else {
        saveAuthMethod('email');
        toast({
          title: "🎉 Welcome to Tradeville!",
          description: "Account created. Please check your email to verify.",
        });
        // Clear sensitive data
        setPassword("");
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

    // Handle Remember Me
    if (rememberMe) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      } else {
        saveAuthMethod('email');
        toast({
          title: "Welcome back Trader! 📈",
          description: "Successfully logged in to your journal.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'twitter' | 'apple' | 'linkedin_oidc' | 'facebook') => {
    try {
      setLoading(true);
      // Save method before redirecting (since redirect clears state)
      saveAuthMethod(provider);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Social Login Error",
        description: error.message,
        variant: "destructive",
      });
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

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Reset Link Sent",
        description: "Check your email for the password reset link.",
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
      icon: Zap,
      title: "Automated Import",
      description: "Sync trades instantly from over 50+ brokers and platforms.",
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics",
      description: "Visualize your R-multiples, win rates, and daily P&L.",
    },
    {
      icon: TrendingUp,
      title: "Strategy Tracking",
      description: "Identify which setups are profitable and which are leaking money.",
    },
    {
      icon: Shield,
      title: "Private & Secure",
      description: "Your trading data is encrypted and strictly confidential.",
    },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#0f1115] text-white selection:bg-primary/30">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Left Panel - Features (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative z-10 border-r border-white/5">
        <div 
          className={cn(
            "space-y-8 transition-all duration-1000 transform max-w-xl mx-auto",
            isVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
          )}
        >
          {/* Logo/Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-xl shadow-primary/20">
                <LineChart className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold tracking-tight">Tradeville</span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight">
              Journal your way to <br />
              <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                Profitability
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-md">
              Stop trading blindly. Track, analyze, and improve your trading performance with the most advanced journaling platform.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 gap-4">
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
          <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <p className="text-gray-300 italic relative z-10">
              "Tradeville helped me identify that I was over-trading on Fridays. I cut my losing days by 40% in the first month."
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-white/10" />
              <div>
                <p className="font-semibold text-white text-sm">Alex M.</p>
                <p className="text-xs text-gray-500">Forex Trader</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-10 bg-black/20 backdrop-blur-sm">
        <Card 
          className={cn(
            "w-full max-w-md border-white/10 bg-[#161920] shadow-2xl transition-all duration-1000 transform relative overflow-hidden",
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          )}
        >
          {/* Top Accent Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary opacity-80" />

          <CardHeader className="text-center pb-2 pt-8">
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-lg">
                <LineChart className="w-7 h-7 text-white" />
              </div>
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

          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 border border-white/5">
                <TabsTrigger 
                  value="signin"
                  className="data-[state=active]:bg-[#252932] data-[state=active]:text-white transition-all duration-300 text-gray-400"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-[#252932] data-[state=active]:text-white transition-all duration-300 text-gray-400"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-5 mt-6 animate-in fade-in zoom-in-95 duration-300">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="trader@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 bg-[#0f1115] border-white/10 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      />
                      {/* Email Last Used Indicator */}
                      {lastUsedProvider === 'email' && (
                         <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Last used
                            </span>
                         </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">Password</Label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 pr-10 bg-[#0f1115] border-white/10 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
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
                      className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm text-gray-400 cursor-pointer select-none"
                    >
                      Remember email
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white font-semibold py-2.5 transition-all duration-300 group shadow-lg shadow-primary/20" 
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

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="bg-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#161920] px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>
                
                {/* Social Buttons Grid */}
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 pt-2">
                    <SocialButton
                        provider="google"
                        label="Google"
                        onClick={() => handleSocialLogin('google')}
                        disabled={loading}
                        isLastUsed={lastUsedProvider === 'google'}
                        icon={
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        }
                    />
                    <SocialButton
                        provider="apple"
                        label="Apple"
                        onClick={() => handleSocialLogin('apple')}
                        disabled={loading}
                        isLastUsed={lastUsedProvider === 'apple'}
                        icon={
                        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        }
                    />
                    <SocialButton
                        provider="facebook"
                        label="Facebook"
                        onClick={() => handleSocialLogin('facebook')}
                        disabled={loading}
                        isLastUsed={lastUsedProvider === 'facebook'}
                        icon={
                        <svg className="h-4 w-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        }
                    />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <SocialButton
                            provider="twitter"
                            label="X"
                            onClick={() => handleSocialLogin('twitter')}
                            disabled={loading}
                            isLastUsed={lastUsedProvider === 'twitter'}
                            icon={
                            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            }
                        />
                        <SocialButton
                            provider="linkedin"
                            label="LinkedIn"
                            onClick={() => handleSocialLogin('linkedin_oidc')}
                            disabled={loading}
                            isLastUsed={lastUsedProvider === 'linkedin_oidc'}
                            icon={
                            <svg className="h-4 w-4 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                            }
                        />
                    </div>
                </div>

              </TabsContent>

              <TabsContent value="signup" className="space-y-5 mt-6 animate-in fade-in zoom-in-95 duration-300">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">Full Name</Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-10 bg-[#0f1115] border-white/10 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="trader@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 bg-[#0f1115] border-white/10 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pl-10 pr-10 bg-[#0f1115] border-white/10 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 p-2 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Progress value={passwordStrength.score} className="h-1.5 flex-1 bg-white/10">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-300", passwordStrength.color)}
                              style={{ width: `${passwordStrength.score}%` }}
                            />
                          </Progress>
                          <span className={cn(
                            "text-[10px] font-bold uppercase",
                            passwordStrength.score <= 25 ? "text-red-400" :
                            passwordStrength.score <= 50 ? "text-orange-400" :
                            passwordStrength.score <= 75 ? "text-yellow-400" : "text-emerald-400"
                          )}>
                            {passwordStrength.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-gray-400 cursor-pointer leading-relaxed"
                    >
                      I agree to the{" "}
                      <a href="#" className="text-primary hover:text-primary/80 hover:underline">Terms of Service</a>
                      {" "}and{" "}
                      <a href="#" className="text-primary hover:text-primary/80 hover:underline">Privacy Policy</a>
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white font-semibold py-2.5 transition-all duration-300 group shadow-lg shadow-primary/20" 
                    disabled={loading || !agreedToTerms}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Create Free Account
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="bg-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#161920] px-2 text-gray-500">Or sign up with</span>
                  </div>
                </div>

                 {/* Social Buttons Grid (Reused) */}
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 pt-2">
                    <SocialButton
                        provider="google"
                        label="Google"
                        onClick={() => handleSocialLogin('google')}
                        disabled={loading}
                        isLastUsed={lastUsedProvider === 'google'}
                        icon={
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        }
                    />
                    <SocialButton
                        provider="apple"
                        label="Apple"
                        onClick={() => handleSocialLogin('apple')}
                        disabled={loading}
                        isLastUsed={lastUsedProvider === 'apple'}
                        icon={
                        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        }
                    />
                    <SocialButton
                        provider="facebook"
                        label="Facebook"
                        onClick={() => handleSocialLogin('facebook')}
                        disabled={loading}
                        isLastUsed={lastUsedProvider === 'facebook'}
                        icon={
                        <svg className="h-4 w-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        }
                    />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <SocialButton
                            provider="twitter"
                            label="X"
                            onClick={() => handleSocialLogin('twitter')}
                            disabled={loading}
                            isLastUsed={lastUsedProvider === 'twitter'}
                            icon={
                            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            }
                        />
                        <SocialButton
                            provider="linkedin"
                            label="LinkedIn"
                            onClick={() => handleSocialLogin('linkedin_oidc')}
                            disabled={loading}
                            isLastUsed={lastUsedProvider === 'linkedin_oidc'}
                            icon={
                            <svg className="h-4 w-4 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                            }
                        />
                    </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          {/* Footer Secure Badge */}
          <div className="bg-[#0f1115] py-3 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-gray-500">
            <Shield className="w-3 h-3 text-emerald-500" />
            <span>Bank-grade 256-bit AES Encryption</span>
          </div>
        </Card>
      </div>
    </div>
  );
}