import { useState, useEffect, useCallback, memo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Only import icons we actually use - reduces bundle size
import { 
  Eye, EyeOff, Lock, Mail, User, Shield, Zap, 
  BarChart3, ArrowRight, Loader2, LineChart, TrendingUp 
} from "lucide-react";

// --- Constants (outside component to avoid recreation) ---
const LAST_AUTH_KEY = "tv-auth";
const REMEMBER_KEY = "tv-email";

// Pre-computed static data
const FEATURES = [
  { icon: Zap, title: "Auto Import", desc: "50+ broker sync" },
  { icon: BarChart3, title: "Analytics", desc: "Win rates & P&L" },
  { icon: TrendingUp, title: "Strategy", desc: "Track setups" },
  { icon: Shield, title: "Secure", desc: "256-bit encryption" },
] as const;

const SOCIAL_PROVIDERS = [
  { id: 'google', label: 'Google', paths: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z|M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z|M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z|M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z', fills: '#4285F4|#34A853|#FBBC05|#EA4335' },
  { id: 'apple', label: 'Apple', paths: 'M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z', fills: 'white' },
  { id: 'facebook', label: 'FB', paths: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z', fills: '#1877F2' },
  { id: 'twitter', label: 'X', paths: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z', fills: 'white' },
  { id: 'linkedin_oidc', label: 'In', paths: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 110-4.125 2.062 2.062 0 010 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454c.978 0 1.775-.773 1.775-1.729V1.729C24 .774 23.203 0 22.225 0z', fills: '#0A66C2' },
] as const;

// Password strength - pure function
const getPasswordStrength = (p: string) => {
  if (!p) return null;
  let s = 0;
  if (p.length >= 8) s += 25;
  if (p.length >= 12) s += 15;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s += 20;
  if (/\d/.test(p)) s += 20;
  if (/[^a-zA-Z0-9]/.test(p)) s += 20;
  return {
    score: Math.min(s, 100),
    label: s <= 25 ? 'Weak' : s <= 50 ? 'Fair' : s <= 75 ? 'Good' : 'Strong',
    color: s <= 25 ? '#ef4444' : s <= 50 ? '#f97316' : s <= 75 ? '#eab308' : '#10b981'
  };
};

// --- Memoized Sub-components ---

const Logo = memo(() => (
  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
    <LineChart className="w-5 h-5 text-white" />
  </div>
));

const SocialIcon = memo(({ paths, fills }: { paths: string; fills: string }) => {
  const pathArr = paths.split('|');
  const fillArr = fills.split('|');
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      {pathArr.map((d, i) => (
        <path key={i} d={d} fill={fillArr[i] || fillArr[0]} />
      ))}
    </svg>
  );
});

const SocialBtn = memo(({ 
  provider, 
  onClick, 
  disabled, 
  isLast 
}: { 
  provider: typeof SOCIAL_PROVIDERS[number];
  onClick: () => void;
  disabled: boolean;
  isLast: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "relative flex items-center justify-center gap-2 px-3 py-2 rounded-md border transition-colors",
      "bg-white/5 border-white/10 hover:bg-white/10 disabled:opacity-50",
      isLast && "ring-1 ring-emerald-500/30 bg-emerald-500/5"
    )}
  >
    <SocialIcon paths={provider.paths} fills={provider.fills} />
    <span className="text-xs text-gray-300 hidden sm:inline">{provider.label}</span>
    {isLast && (
      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-emerald-500 text-white px-1 rounded">
        Last
      </span>
    )}
  </button>
));

const PasswordMeter = memo(({ password }: { password: string }) => {
  const strength = getPasswordStrength(password);
  if (!strength) return null;
  
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
          />
        </div>
        <span className="text-[10px] font-medium" style={{ color: strength.color }}>
          {strength.label}
        </span>
      </div>
    </div>
  );
});

const FeatureItem = memo(({ icon: Icon, title, desc }: typeof FEATURES[number]) => (
  <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
    <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center">
      <Icon className="w-4 h-4 text-emerald-400" />
    </div>
    <div>
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="text-xs text-gray-500">{desc}</div>
    </div>
  </div>
));

// --- Main Component ---

export default function Auth() {
  // Consolidated state
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [ui, setUi] = useState({ 
    tab: 'signin', 
    showPw: false, 
    remember: false, 
    terms: false,
    loading: false,
    lastProvider: null as string | null
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Single initialization effect
  useEffect(() => {
    // Load saved preferences synchronously
    const savedEmail = localStorage.getItem(REMEMBER_KEY);
    const lastAuth = localStorage.getItem(LAST_AUTH_KEY);
    
    if (savedEmail || lastAuth) {
      setForm(f => ({ ...f, email: savedEmail || '' }));
      setUi(u => ({ 
        ...u, 
        remember: !!savedEmail, 
        lastProvider: lastAuth 
      }));
    }

    // Check session - use getSession instead of onAuthStateChange to avoid WebSocket
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session) navigate("/", { replace: true });
    });

    // Minimal auth listener - only for OAuth callbacks
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') navigate("/", { replace: true });
    });

    return () => { 
      mounted = false; 
      subscription.unsubscribe(); 
    };
  }, [navigate]);

  // Handlers with useCallback
  const updateForm = useCallback((field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  }, []);

  const saveAuth = useCallback((method: string) => {
    localStorage.setItem(LAST_AUTH_KEY, method);
    if (ui.remember && form.email) {
      localStorage.setItem(REMEMBER_KEY, form.email);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }, [ui.remember, form.email]);

  const handleSubmit = useCallback(async (e: React.FormEvent, isSignUp: boolean) => {
    e.preventDefault();
    
    if (isSignUp) {
      if (!ui.terms) {
        toast({ title: "Accept terms to continue", variant: "destructive" });
        return;
      }
      const strength = getPasswordStrength(form.password);
      if (!strength || strength.score < 50) {
        toast({ title: "Password too weak", variant: "destructive" });
        return;
      }
    }

    setUi(u => ({ ...u, loading: true }));

    try {
      const { error } = isSignUp 
        ? await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: { 
              emailRedirectTo: `${location.origin}/`,
              data: { name: form.name }
            }
          })
        : await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password
          });

      if (error) throw error;
      
      saveAuth('email');
      toast({ 
        title: isSignUp ? "Check your email!" : "Welcome back! 📈" 
      });
      
      if (isSignUp) {
        setForm(f => ({ ...f, password: '' }));
        setUi(u => ({ ...u, terms: false }));
      }
    } catch (err: any) {
      toast({ 
        title: err.message?.includes('already') ? "Account exists" : "Error",
        description: err.message,
        variant: "destructive"
      });
      if (err.message?.includes('already')) {
        setUi(u => ({ ...u, tab: 'signin' }));
      }
    } finally {
      setUi(u => ({ ...u, loading: false }));
    }
  }, [form, ui.terms, saveAuth, toast]);

  const handleSocial = useCallback(async (provider: string) => {
    setUi(u => ({ ...u, loading: true }));
    saveAuth(provider);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: { redirectTo: `${location.origin}/` }
    });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setUi(u => ({ ...u, loading: false }));
    }
  }, [saveAuth, toast]);

  const handleForgot = useCallback(async () => {
    if (!form.email) {
      toast({ title: "Enter email first", variant: "destructive" });
      return;
    }
    
    setUi(u => ({ ...u, loading: true }));
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${location.origin}/reset-password`
    });
    setUi(u => ({ ...u, loading: false }));
    
    toast(error 
      ? { title: "Error", description: error.message, variant: "destructive" }
      : { title: "Check your email ✉️" }
    );
  }, [form.email, toast]);

  const isSignUp = ui.tab === 'signup';

  return (
    <div className="min-h-screen flex bg-[#0a0b0e] text-white">
      {/* Simple gradient background - no JS animations */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, rgba(16,185,129,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.06) 0%, transparent 50%)'
        }}
      />

      {/* Left Panel - Desktop only */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-8 relative border-r border-white/5">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="text-xl font-bold">Tradeville</div>
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider">Trading Journal</div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold">
            Trade smarter with{' '}
            <span className="text-emerald-400">data</span>
          </h1>
          
          <p className="text-gray-400 text-sm">
            Track and analyze your trades to become consistently profitable.
          </p>

          <div className="grid gap-2">
            {FEATURES.map((f, i) => <FeatureItem key={i} {...f} />)}
          </div>

          <div className="p-4 rounded-lg bg-white/5 border-l-2 border-emerald-500">
            <p className="text-sm text-gray-300 italic">
              "Cut my losing days by 40% in the first month."
            </p>
            <p className="text-xs text-gray-500 mt-2">— Alex M., Forex Trader</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-sm bg-[#111318] rounded-xl border border-white/10 overflow-hidden">
          {/* Accent line */}
          <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500" />
          
          <div className="p-6">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-4">
              <Logo />
            </div>

            <h2 className="text-xl font-bold text-center mb-1">
              {isSignUp ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="text-xs text-gray-500 text-center mb-4">
              {isSignUp ? 'Start your trading journey' : 'Sign in to your journal'}
            </p>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-black/40 rounded-lg mb-4">
              {['signin', 'signup'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setUi(u => ({ ...u, tab }))}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium rounded transition-colors",
                    ui.tab === tab ? "bg-white/10 text-white" : "text-gray-500"
                  )}
                >
                  {tab === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => handleSubmit(e, isSignUp)} className="space-y-3">
              {isSignUp && (
                <div>
                  <Label className="text-xs text-gray-400 uppercase">Name</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      value={form.name}
                      onChange={e => updateForm('name', e.target.value)}
                      placeholder="Your name"
                      required
                      className="pl-9 bg-black/40 border-white/10 text-white placeholder:text-gray-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-gray-400 uppercase">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => updateForm('email', e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="pl-9 bg-black/40 border-white/10 text-white placeholder:text-gray-600"
                  />
                  {!isSignUp && ui.lastProvider === 'email' && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Last used
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-gray-400 uppercase">Password</Label>
                  {!isSignUp && (
                    <button 
                      type="button" 
                      onClick={handleForgot}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type={ui.showPw ? "text" : "password"}
                    value={form.password}
                    onChange={e => updateForm('password', e.target.value)}
                    placeholder={isSignUp ? "Create password" : "••••••••"}
                    required
                    minLength={8}
                    className="pl-9 pr-9 bg-black/40 border-white/10 text-white placeholder:text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setUi(u => ({ ...u, showPw: !u.showPw }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {ui.showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isSignUp && <PasswordMeter password={form.password} />}
              </div>

              {isSignUp ? (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={ui.terms}
                    onCheckedChange={c => setUi(u => ({ ...u, terms: !!c }))}
                    className="mt-0.5 border-white/20 data-[state=checked]:bg-emerald-500"
                  />
                  <label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <a href="/terms" className="text-emerald-400 hover:underline">Terms</a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-emerald-400 hover:underline">Privacy</a>
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={ui.remember}
                    onCheckedChange={c => setUi(u => ({ ...u, remember: !!c }))}
                    className="border-white/20 data-[state=checked]:bg-emerald-500"
                  />
                  <label htmlFor="remember" className="text-xs text-gray-400 cursor-pointer">
                    Remember email
                  </label>
                </div>
              )}

              <Button
                type="submit"
                disabled={ui.loading || (isSignUp && !ui.terms)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {ui.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 bg-[#111318] text-[10px] text-gray-500 uppercase">or</span>
              </div>
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-5 gap-2">
              {SOCIAL_PROVIDERS.map(p => (
                <SocialBtn
                  key={p.id}
                  provider={p}
                  onClick={() => handleSocial(p.id)}
                  disabled={ui.loading}
                  isLast={ui.lastProvider === p.id}
                />
              ))}
            </div>

            {isSignUp && (
              <p className="text-center text-[10px] text-gray-500 mt-3">
                <Zap className="w-3 h-3 inline mr-1" />
                14-day free trial • No card required
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-2 bg-black/30 border-t border-white/5 flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
            <Shield className="w-3 h-3 text-emerald-500" />
            256-bit encryption
          </div>
        </div>
      </div>
    </div>
  );
}