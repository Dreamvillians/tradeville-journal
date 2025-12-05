import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Target, Award, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TraderLevelProps {
  winRate: number;
  profitFactor: number | string;
  totalTrades: number;
  netPnL: number;
}

export function TraderLevel({ winRate, profitFactor, totalTrades, netPnL }: TraderLevelProps) {
  
  const calculateLevel = () => {
    const pf = typeof profitFactor === 'string' ? (profitFactor === "∞" ? 999 : parseFloat(profitFactor)) : profitFactor;
    
    if (totalTrades < 10) {
      return {
        title: "Novice",
        icon: Star,
        desc: "Build your track record",
        color: "gray",
        gradient: "from-gray-500 to-slate-500",
        progress: 15,
        next: "Complete 10 trades"
      };
    }

    if (winRate >= 60 && pf >= 2.0 && netPnL > 0) {
      return {
        title: "Elite",
        icon: Trophy,
        desc: "Exceptional performance",
        color: "amber",
        gradient: "from-amber-400 to-orange-500",
        progress: 100,
        next: "Maintain consistency"
      };
    }

    if (winRate >= 50 && pf >= 1.5 && netPnL > 0) {
      return {
        title: "Pro",
        icon: Award,
        desc: "Strong risk management",
        color: "emerald",
        gradient: "from-emerald-400 to-teal-500",
        progress: 75,
        next: "Target 60% WR & 2.0 PF"
      };
    }

    if (winRate >= 40 && pf >= 1.0 && netPnL > 0) {
      return {
        title: "Developing",
        icon: TrendingUp,
        desc: "Profitable foundation",
        color: "blue",
        gradient: "from-blue-400 to-indigo-500",
        progress: 50,
        next: "Target 50% WR & 1.5 PF"
      };
    }

    return {
      title: "Struggling",
      icon: Target,
      desc: "Refine your edge",
      color: "rose",
      gradient: "from-rose-400 to-red-500",
      progress: 25,
      next: "Target profitable P&L"
    };
  };

  const level = calculateLevel();
  const Icon = level.icon;

  return (
    <Card className="relative overflow-hidden border border-white/10 bg-black/20 backdrop-blur-xl shadow-xl">
      
      {/* Ambient Glow */}
      <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-[80px] opacity-20 bg-gradient-to-br", level.gradient)} />

      <CardContent className="p-6 relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl bg-gradient-to-br shadow-lg", level.gradient)}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Current Rank</p>
              <h2 className="text-2xl font-bold text-white tracking-tight">{level.title} Trader</h2>
            </div>
          </div>
          <div className="text-right">
             <span className="text-xs font-mono text-gray-500">EXP</span>
             <p className="text-xl font-bold text-white">{level.progress}%</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-gray-800/50 rounded-full overflow-hidden mb-6">
          <div 
            className={cn("h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r", level.gradient)} 
            style={{ width: `${level.progress}%` }} 
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
           <div>
              <p className="text-[10px] uppercase text-gray-500 font-bold">Next Objective</p>
              <p className="text-sm text-gray-300 font-medium mt-0.5">{level.next}</p>
           </div>
           <div>
              <p className="text-[10px] uppercase text-gray-500 font-bold">Status</p>
              <p className="text-sm text-gray-300 font-medium mt-0.5">{level.desc}</p>
           </div>
        </div>

      </CardContent>
    </Card>
  );
}