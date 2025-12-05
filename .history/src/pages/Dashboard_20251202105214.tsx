import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Flame, BookOpen, PlusCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WelcomeCard } from "@/components/WelcomeCard";
import { QuickStatCard } from "@/components/QuickStatCard";
import { RecentActivityCard } from "@/components/RecentActivityCard";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  
  const { data: trades } = useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("opened_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    totalTrades: trades?.length || 0,
    wins: trades?.filter((t) => (t.profit_loss_currency || 0) > 0).length || 0,
    losses: trades?.filter((t) => (t.profit_loss_currency || 0) < 0).length || 0,
    totalPnL: trades?.reduce((sum, t) => sum + (t.profit_loss_currency || 0), 0) || 0,
  };

  const winRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
  
  // Dummy data for profit factor and streak
  const profitFactor = 1.85;
  const currentStreak = 5;

  return (
    <div className="space-y-6">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Welcome Card - spans 2 columns on large screens */}
        <div className="lg:col-span-2">
          <WelcomeCard />
        </div>

        {/* Quick Stats - Win Rate */}
        <QuickStatCard
          title="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          icon={Target}
          trend={winRate >= 50 ? "up" : "down"}
          subtitle={`${stats.wins}W / ${stats.losses}L`}
        />

        {/* Quick Stats - Profit Factor */}
        <QuickStatCard
          title="Profit Factor"
          value={profitFactor.toFixed(2)}
          icon={TrendingUp}
          trend={profitFactor >= 1.5 ? "up" : profitFactor >= 1 ? "neutral" : "down"}
          subtitle="Avg wins vs losses"
        />

        {/* Quick Stats - Current Streak */}
        <QuickStatCard
          title="Current Streak"
          value={currentStreak}
          icon={Flame}
          trend="up"
          subtitle="Consecutive wins"
        />

        {/* Navigation Shortcuts - spans 1 column */}
        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full h-24 text-lg font-semibold gap-3"
            onClick={() => navigate("/journal")}
          >
            <PlusCircle className="h-6 w-6" />
            Log New Trade
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="w-full h-24 text-lg font-semibold gap-3"
            onClick={() => navigate("/playbook")}
          >
            <BookOpen className="h-6 w-6" />
            Review Playbook
          </Button>
        </div>

        {/* Recent Activity - spans 2 columns on large screens */}
        <div className="lg:col-span-2">
          <RecentActivityCard />
        </div>

        {/* Equity Curve Chart - spans full width */}
        <div className="lg:col-span-3">
          <EquityCurveChart />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
