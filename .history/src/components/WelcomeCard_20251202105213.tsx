import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function WelcomeCard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card className="border-border bg-gradient-to-br from-card to-card/50 hover:border-primary/50 transition-all">
      <CardContent className="p-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-serif font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome Back, Trader
          </h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{formatDate(currentTime)}</span>
          </div>
          <div className="text-2xl font-mono font-semibold text-foreground">
            {formatTime(currentTime)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
