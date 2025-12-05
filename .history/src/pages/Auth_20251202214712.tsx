import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  ArrowRight,
  Loader2,
  LineChart,
  TrendingUp,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Constants ---
const LAST_AUTH_METHOD_KEY = "tradeville-last-auth-method";
const REMEMBER_EMAIL_KEY = "tradeville-remember-email";

// --- CSS & Animation Styles ---
// We inject these styles to avoid needing 'framer-motion' or extra tailwind config
const CustomStyles = () => (
  <style>{`
    @keyframes grid-move {
      0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
      100% { transform: perspective(500px) rotateX(60deg) translateY(40px); }
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    .animate-grid-move {
      animation: grid-move 3s linear infinite;
    }
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
    .animate-float-slow {
      animation: float 6s ease-in-out infinite;
    }
    /* Spotlight Effect Logic */
    .spotlight-card {
      position: relative;
      overflow: hidden;
    }
    .spotlight-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(
        800px circle at var(--mouse-x) var(--mouse-y), 
        rgba(16, 185, 129, 0.15), 
        transparent 40%
      );
      opacity: 0;
      transition: opacity 0.5s;
      pointer-events: none;
      z-index: 1;
    }
    .spotlight-card:hover::before {
      opacity: 1;
    }
    .spotlight-border {
      position: absolute;
      inset: 0;
      pointer-events: none;
      border-radius: inherit;
      padding: 1px;
      background: radial-gradient(
        600px circle at var(--mouse-x) var(--mouse-y), 
        rgba(16, 185, 129, 0.4), 
        transparent 40%
      ); 
      -webkit-mask: 
         linear-gradient(#fff 0 0) content-box, 
         linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      transition: opacity 0.5s;
    }
    .spotlight-card:hover .spotlight-border {
      opacity: 1;
    }
    /* Floating Label Input */
    .floating-input-group input:focus ~ label,
    .floating-input-group input:not(:placeholder-shown) ~ label {
      top: -10px;
      left: 10px;
      font-size: 11px;
      color: #10b981; /* Emerald 500 */
      background-color: #161920;
      padding: 0 5px;
    }
    .floating-input-group input:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 1px #10b981;
    }
  `}</style>
);

// --- Helper Components ---

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

// "Ultra" Background
const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden bg-[#0a0c10]">
    {/* Moving Grid Floor */}
    <div className="absolute inset-0 opacity-20 pointer-events-none" 
         style={{ 
           background: 'linear-gradient(to bottom, transparent 50%, #0f1115 100%)', 
           zIndex: 2 
         }} 
    />
    <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none" style={{ perspective: '500px', overflow: 'hidden' }}>
      <div className="animate-grid-move w-[200%] h-[200%] absolute -top-[50%] -left-[50%]"
           style={{
             backgroundSize: '40px 40px',
             backgroundImage: 'linear-gradient(to right, #34d399 1px, transparent 1px), linear-gradient(to bottom, #34d399 1px, transparent 1px)',
           }}
      />
    </div>

    {/* Ambient Glows */}
    <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
  </div>
);

const FeatureCard = ({ icon: Icon, title, description, delay }: { 
  icon: any; 
  title: string; 
  description: string;
  delay: number;
}) => (
  <div 
    className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm transform transition-all duration-500 hover:bg-white/10 hover:border-emerald-500/30 hover:translate-x-2 group"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-[#161920] to-[#1c2029] border border-white/10 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/20 group-hover:border-emerald-500/50 transition-all">
      <Icon className="w-5 h-5 text-gray-400 group-hover:text-emerald-400 transition-colors" />
    </div>
    <div>
      <h3 className="font-semibold text-white mb-1 group-hover:text-emerald-400 transition-colors">{title}</h3>
      <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
    </div>
  </div>
);

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
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="relative">
            <span className="bg-emerald-500 text-[#0a0c10] text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.5)] flex items-center gap-1 whitespace-nowrap">
            Last used
            </span>
            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[3px] border-t-emerald-500 mx-auto mt-[-1px]" />
        </div>
      </div>
    )}
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full h-10 bg-[#1a1d24] border-white/5 text-gray-400 hover:text-white hover:bg-[#20242c] hover:border-white/10 transition-all duration-200",
        isLastUsed && "border-emerald-500/50 ring-1 ring-emerald-500/20 bg-emerald-500/5 text-emerald-100"
      )}
    >
      <span className="flex items-center justify-center gap-2">
        {icon}
        <span className="hidden sm:inline text-xs font-medium">{label}</span>
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
  
  // Spotlight Ref
  const cardRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Handle Mouse Move for Spotlight Effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  useEffect(() => {
    setIsVisible(true);
    
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    const savedProvider = localStorage.getItem(LAST_AUTH_METHOD_KEY);
    if (savedProvider) {
      setLastUsedProvider(savedProvider);
      if (savedProvider === 'email') {
        setActiveTab('signin');
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const saveAuthMethod = (method: string) => {
    localStorage.setItem(LAST_AUTH_METHOD_KEY, method);
    setLastUsedProvider(method);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      toast({ title: "Terms Required", description: "Please agree to the terms.", variant: "destructive" });
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
        options: { emailRedirectTo: `${window.location.origin}/`, data: { name } },
      });
      if (error) {
        if (error.message.includes("already registered")) {
          toast({ title: "Account exists", description: "Please sign in instead.", variant: "destructive" });
          setActiveTab("signin");
        } else { throw error; }
      } else {
        saveAuthMethod('email');
        toast({ title: "Success", description: "Check your email to verify." });
        setPassword("");
        setAgreedToTerms(false);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (rememberMe) localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    else localStorage.removeItem(REMEMBER_EMAIL_KEY);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      saveAuthMethod('email');
      toast({ title: "Welcome back", description: "Successfully logged in." });
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'twitter' | 'apple' | 'linkedin_oidc' | 'facebook') => {
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
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Email Required", description: "Please enter your email first.", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      toast({ title: "Sent", description: "Password reset link sent to your email." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, title: "Live Sync", description: "Real-time execution data from 50+ brokers." },
    { icon: BarChart3, title: "Deep Analytics", description: "Visualize P&L, win-rates, and R-multiples." },
    { icon: TrendingUp, title: "Playbook", description: "Tag and categorize your setups automatically." },
    { icon: Shield, title: "Vault Security", description: "Zero-knowledge encryption for your journal." },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden text-white font-sans selection:bg-emerald-500/30">
      <CustomStyles />
      <AnimatedBackground />

      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-16 relative z-10 border-r border-white/5 bg-[#0a0c10]/50 backdrop-blur-[2px]">
        <div className={cn("space-y-10 max-w-lg mx-auto transition-all duration-1000 delay-100", isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                <Activity className="w-6 h-6 text-[#0a0c10]" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">Tradeville</span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-[1.1] tracking-tight">
              Master your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                trading psychology
              </span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed">
              The most advanced journaling platform for serious traders. Identify your edge, cut your losses, and scale your winners.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} delay={i * 100} />
            ))}
          </div>
          
          {/* Trusted Badge */}
          <div className="flex items-center gap-4 pt-4 border-t border-white/5">
             <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border border-[#0a0c10] flex items-center justify-center text-[10px] font-bold">
                        {String.fromCharCode(64+i)}
                    </div>
                ))}
             </div>
             <div className="text-sm text-gray-500">
                Trusted by <span className="text-white font-medium">10,000+</span> funded traders
             </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 relative z-10">
        {/* Spotlight Card Wrapper */}
        <div 
          ref={cardRef}
          onMouseMove={handleMouseMove}
          className={cn(
            "spotlight-card w-full max-w-[420px] rounded-2xl bg-[#161920] border border-white/5 shadow-2xl transition-all duration-700",
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}
        >
          <div className="spotlight-border" /> {/* Interactive Glow Border */}
          
          <div className="relative z-10 p-1">
            <CardHeader className="text-center pb-2 pt-8">
                <div className="lg:hidden flex justify-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <LineChart className="w-6 h-6 text-[#0a0c10]" />
                    </div>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                {activeTab === "signin" ? "Welcome back" : "Create an account"}
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                {activeTab === "signin" ? "Enter your credentials to access your journal" : "Start your 14-day free trial. No card required."}
                </p>
            </CardHeader>

            <CardContent className="p-6 sm:p-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
                <TabsList className="grid w-full grid-cols-2 bg-[#0f1115] p-1 rounded-lg border border-white/5 h-11">
                    <TabsTrigger 
                    value="signin"
                    className="rounded-md text-xs font-medium data-[state=active]:bg-[#1f232b] data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm transition-all"
                    >
                    Sign In
                    </TabsTrigger>
                    <TabsTrigger 
                    value="signup"
                    className="rounded-md text-xs font-medium data-[state=active]:bg-[#1f232b] data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm transition-all"
                    >
                    Sign Up
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6 relative">
                    <TabsContent value="signin" className="space-y-5 mt-0 focus-visible:ring-0 animate-in fade-in slide-in-from-left-4 duration-300">
                    <form onSubmit={handleSignIn} className="space-y-4">
                        {/* Floating Label Input: Email */}
                        <div className="relative floating-input-group group">
                            <Input
                                id="signin-email"
                                type="email"
                                placeholder=" "
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-12 bg-[#0f1115] border-white/10 text-white rounded-lg transition-all focus:bg-[#0f1115] pt-4 peer"
                            />
                            <Label 
                                htmlFor="signin-email" 
                                className="absolute left-3 top-4 text-gray-500 text-xs transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-500 group-focus-within:!top-[-10px] group-focus-within:!text-[11px] group-focus-within:!text-emerald-500"
                            >
                                Email address
                            </Label>
                            {lastUsedProvider === 'email' && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <span className="text-[9px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                        Last used
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Floating Label Input: Password */}
                        <div className="relative floating-input-group group">
                            <Input
                                id="signin-password"
                                type={showPassword ? "text" : "password"}
                                placeholder=" "
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-12 bg-[#0f1115] border-white/10 text-white rounded-lg transition-all focus:bg-[#0f1115] pt-4 peer pr-10"
                            />
                            <Label 
                                htmlFor="signin-password" 
                                className="absolute left-3 top-4 text-gray-500 text-xs transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-500 group-focus-within:!top-[-10px] group-focus-within:!text-[11px] group-focus-within:!text-emerald-500"
                            >
                                Password
                            </Label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                id="remember" 
                                checked={rememberMe}
                                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                className="border-white/20 w-4 h-4 rounded data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                />
                                <label htmlFor="remember" className="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-300">
                                Remember me
                                </label>
                            </div>
                            <button type="button" onClick={handleForgotPassword} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                                Forgot password?
                            </button>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-[#0a0c10] font-bold transition-all duration-300 relative overflow-hidden group" 
                            disabled={loading}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full animate-shimmer" />
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                            )}
                        </Button>
                    </form>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-5 mt-0 focus-visible:ring-0 animate-in fade-in slide-in-from-right-4 duration-300">
                    <form onSubmit={handleSignUp} className="space-y-4">
                         <div className="relative floating-input-group group">
                            <Input
                                id="signup-name"
                                type="text"
                                placeholder=" "
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="h-12 bg-[#0f1115] border-white/10 text-white rounded-lg transition-all focus:bg-[#0f1115] pt-4 peer"
                            />
                            <Label htmlFor="signup-name" className="absolute left-3 top-4 text-gray-500 text-xs transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm group-focus-within:!top-[-10px] group-focus-within:!text-[11px] group-focus-within:!text-emerald-500">Full Name</Label>
                        </div>

                        <div className="relative floating-input-group group">
                            <Input
                                id="signup-email"
                                type="email"
                                placeholder=" "
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-12 bg-[#0f1115] border-white/10 text-white rounded-lg transition-all focus:bg-[#0f1115] pt-4 peer"
                            />
                            <Label htmlFor="signup-email" className="absolute left-3 top-4 text-gray-500 text-xs transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm group-focus-within:!top-[-10px] group-focus-within:!text-[11px] group-focus-within:!text-emerald-500">Email address</Label>
                        </div>

                        <div className="space-y-2">
                            <div className="relative floating-input-group group">
                                <Input
                                    id="signup-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder=" "
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="h-12 bg-[#0f1115] border-white/10 text-white rounded-lg transition-all focus:bg-[#0f1115] pt-4 peer pr-10"
                                />
                                <Label htmlFor="signup-password" className="absolute left-3 top-4 text-gray-500 text-xs transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm group-focus-within:!top-[-10px] group-focus-within:!text-[11px] group-focus-within:!text-emerald-500">Create Password</Label>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                             {/* Password Strength Indicator */}
                            {password && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Progress value={passwordStrength.score} className="h-1 flex-1 bg-white/5">
                                            <div className={cn("h-full rounded-full transition-all duration-300", passwordStrength.color)} style={{ width: `${passwordStrength.score}%` }} />
                                        </Progress>
                                        <span className={cn("text-[10px] font-bold uppercase", passwordStrength.score <= 50 ? "text-red-400" : "text-emerald-400")}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-start space-x-2 pt-1">
                            <Checkbox 
                                id="terms" 
                                checked={agreedToTerms}
                                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                                className="border-white/20 w-4 h-4 rounded mt-0.5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            <label htmlFor="terms" className="text-xs text-gray-400 cursor-pointer leading-relaxed">
                                I agree to the <a href="#" className="text-white hover:underline">Terms</a> and <a href="#" className="text-white hover:underline">Privacy Policy</a>
                            </label>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-[#0a0c10] font-bold transition-all duration-300 relative overflow-hidden group" 
                            disabled={loading || !agreedToTerms}
                        >
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full animate-shimmer" />
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <span className="flex items-center gap-2">Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                            )}
                        </Button>
                    </form>
                    </TabsContent>
                </div>
                
                <div className="relative py-6">
                    <div className="absolute inset-0 flex items-center"><Separator className="bg-white/5" /></div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#161920] px-2 text-gray-600">Or continue with</span></div>
                </div>

                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        <SocialButton
                            provider="google"
                            label="Google"
                            onClick={() => handleSocialLogin('google')}
                            disabled={loading}
                            isLastUsed={lastUsedProvider === 'google'}
                            icon={<svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
                        />
                         <SocialButton
                            provider="apple"
                            label="Apple"
                            onClick={() => handleSocialLogin('apple')}
                            disabled={loading}
                            isLastUsed={lastUsedProvider === 'apple'}
                            icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>}
                        />
                         <SocialButton
                            provider="facebook"
                            label="Facebook"
                            onClick={() => handleSocialLogin('facebook')}
                            disabled={loading}
                            isLastUsed={lastUsedProvider === 'facebook'}
                            icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>}
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-3">
                        <SocialButton
                            provider="twitter"
                            label="X"
                            onClick={() => handleSocialLogin('twitter')}
                            disabled={loading}
                            isLastUsed={lastUsedProvider === 'twitter'}
                            icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
                        />
                         <SocialButton
                            provider="linkedin"
                            label="LinkedIn"
                            onClick={() => handleSocialLogin('linkedin_oidc')}
                            disabled={loading}
                            isLastUsed={lastUsedProvider === 'linkedin_oidc'}
                            icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>}
                        />
                     </div>
                </div>
            </CardContent>
          </div>
        </div>
        
        <div className="absolute bottom-6 text-[10px] text-gray-600 font-mono tracking-tight flex items-center gap-2">
             <Shield className="w-3 h-3" />
             ENCRYPTED CONNECTION
        </div>
      </div>
    </div>
  );
}