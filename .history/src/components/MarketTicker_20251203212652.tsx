import { useState, useEffect, memo, useRef } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

// Styles for the ticker
export const TICKER_STYLES = `
  .dash-ticker { animation: dash-ticker 40s linear infinite; }
  @keyframes dash-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  .dash-flash-green { animation: flash-green 1s ease-out; }
  .dash-flash-red { animation: flash-red 1s ease-out; }
  
  @keyframes flash-green { 0% { color: #34d399; text-shadow: 0 0 10px rgba(52, 211, 153, 0.5); } 100% { color: white; } }
  @keyframes flash-red { 0% { color: #f87171; text-shadow: 0 0 10px rgba(248, 113, 113, 0.5); } 100% { color: white; } }
  
  @media (prefers-reduced-motion: reduce) {
    .dash-ticker { animation: none !important; }
  }
`;

// Types
interface MarketData {
  id: string;
  symbol: string;
  price: number; // Changed to number for math operations
  change: number;
  isUp: boolean;
}

// Utility function
const formatPercent = (value: number): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const formatPrice = (price: number, symbol: string): string => {
  if (symbol.includes("EUR")) return `€${price.toFixed(4)}`;
  if (price < 1.5) return `$${price.toFixed(4)}`;
  if (price > 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Custom hook for market data
export const useMarketData = () => {
  // Initial realistic baselines (updated to approx current market values)
  const [data, setData] = useState<MarketData[]>([
    { id: "bitcoin", symbol: "BTC/USD", price: 67500.00, change: 2.4, isUp: true },
    { id: "ethereum", symbol: "ETH/USD", price: 3500.00, change: 1.2, isUp: true },
    { id: "solana", symbol: "SOL/USD", price: 145.50, change: -0.5, isUp: false },
    { id: "spy", symbol: "SPY", price: 520.45, change: 0.15, isUp: true }, // Updated baseline
    { id: "qqq", symbol: "QQQ", price: 445.20, change: 0.45, isUp: true }, // Added Tech
    { id: "eurusd", symbol: "EUR/USD", price: 1.0850, change: -0.05, isUp: false },
  ]);

  // 1. Fetch Real Crypto Data (CoinGecko)
  useEffect(() => {
    const fetchCrypto = async () => {
      try {
        // Fetching specific coins with market data
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc&sparkline=false"
        );
        const cryptoData = await response.json();

        setData((prevData) => {
          return prevData.map((item) => {
            const liveCoin = cryptoData.find((c: any) => c.id === item.id);
            if (liveCoin) {
              return {
                ...item,
                price: liveCoin.current_price,
                change: liveCoin.price_change_percentage_24h,
                isUp: liveCoin.price_change_percentage_24h >= 0,
              };
            }
            return item;
          });
        });
      } catch (error) {
        console.error("Failed to fetch crypto data:", error);
      }
    };

    fetchCrypto();
    // CoinGecko Free API Rate limit is ~30 calls/min. We poll every 60s safely.
    const interval = setInterval(fetchCrypto, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. Simulate "Live Ticks" (Micro-movements)
  // This makes the dashboard feel "alive" by slightly jittering prices every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) =>
        prev.map((item) => {
          // Fluctuation amount: 0.02% volatility
          const volatility = 0.0002; 
          const randomMove = 1 + (Math.random() * volatility * 2 - volatility);
          
          // Randomly decide if this asset "ticks" this frame (70% chance)
          if (Math.random() > 0.3) {
            const newPrice = item.price * randomMove;
            return {
              ...item,
              price: newPrice,
            };
          }
          return item;
        })
      );
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return data;
};

// Market Ticker Component
const MarketTicker = memo(() => {
  const data = useMarketData();
  const stylesInjected = useRef(false);

  // Inject styles locally if not already injected
  useEffect(() => {
    if (!stylesInjected.current) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "market-ticker-styles";
      styleSheet.textContent = TICKER_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-10 bg-[#0a0b0f] border-b border-white/10 flex items-center shadow-lg shadow-black/20">
      {/* Left Label */}
      <div className="hidden md:flex items-center px-4 h-full bg-[#0a0b0f] border-r border-white/10 z-10 relative">
        <Activity className="w-4 h-4 text-emerald-500 mr-2 animate-pulse" />
        <span className="text-xs font-bold text-white tracking-wider">LIVE MARKET</span>
      </div>

      <div className="w-full overflow-hidden relative">
        {/* Gradient fade on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a0b0f] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0b0f] to-transparent z-10" />

        <div className="dash-ticker flex whitespace-nowrap items-center h-full">
          {/* Tripled data for seamless loop */}
          {[...data, ...data, ...data].map((item, i) => (
            <div key={`${item.id}-${i}`} className="flex items-center gap-3 mx-6 group cursor-default">
              <span className="text-gray-400 text-xs font-medium group-hover:text-white transition-colors">
                {item.symbol}
              </span>
              
              {/* Price with flash effect capability */}
              <span className={cn(
                "text-white text-xs font-bold tabular-nums transition-colors duration-300",
                // We can add logic here to flash colors if price changed significantly, 
                // but simplistic white is cleaner for the ticker
              )}>
                {formatPrice(item.price, item.symbol)}
              </span>

              <span
                className={cn(
                  "text-[10px] font-semibold flex items-center gap-0.5",
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

MarketTicker.displayName = "MarketTicker";

export default MarketTicker;