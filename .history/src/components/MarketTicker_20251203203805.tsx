import { useState, useEffect, memo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Styles for the ticker
export const TICKER_STYLES = `
  .dash-ticker { animation: dash-ticker 30s linear infinite; }
  @keyframes dash-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @media (prefers-reduced-motion: reduce) {
    .dash-ticker { animation: none !important; }
  }
`;

// Types
interface MarketData {
  symbol: string;
  price: string;
  change: number;
  isUp: boolean;
}

// Utility function
const formatPercent = (value: number): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

// Custom hook for market data
export const useMarketData = () => {
  const [data, setData] = useState<MarketData[]>([
    { symbol: "BTC/USD", price: "---", change: 0, isUp: true },
    { symbol: "ETH/USD", price: "---", change: 0, isUp: true },
    { symbol: "SPY", price: "---", change: 0, isUp: true },
    { symbol: "EUR/USD", price: "---", change: 0, isUp: false },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
        );
        const cryptoData = await response.json();

        setData([
          {
            symbol: "BTC/USD",
            price: cryptoData.bitcoin?.usd?.toLocaleString() || "67,234",
            change: cryptoData.bitcoin?.usd_24h_change || 2.3,
            isUp: (cryptoData.bitcoin?.usd_24h_change || 0) >= 0,
          },
          {
            symbol: "ETH/USD",
            price: cryptoData.ethereum?.usd?.toLocaleString() || "3,456",
            change: cryptoData.ethereum?.usd_24h_change || 1.5,
            isUp: (cryptoData.ethereum?.usd_24h_change || 0) >= 0,
          },
          { symbol: "SPY", price: "478.32", change: 0.45, isUp: true },
          { symbol: "EUR/USD", price: "1.0872", change: -0.12, isUp: false },
        ]);
      } catch (error) {
        console.error("Failed to fetch market data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return data;
};

// Market Ticker Component
const MarketTicker = memo(() => {
  const data = useMarketData();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xl border-b border-white/5">
      <div className="dash-ticker flex whitespace-nowrap py-2">
        {[...data, ...data, ...data].map((item, i) => (
          <div key={i} className="flex items-center gap-4 mx-8">
            <span className="text-gray-400 text-sm font-medium">{item.symbol}</span>
            <span className="text-white text-sm font-bold">{item.price}</span>
            <span
              className={cn(
                "text-xs font-semibold flex items-center gap-1",
                item.isUp ? "text-emerald-400" : "text-red-400"
              )}
            >
              {item.isUp ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {formatPercent(item.change)}
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

MarketTicker.displayName = "MarketTicker";

export default MarketTicker;