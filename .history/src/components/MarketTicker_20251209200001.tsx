import { useState, useEffect, memo, useRef, useCallback } from "react";
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Styles for the ticker
export const TICKER_STYLES = `
  .dash-ticker { animation: dash-ticker 45s linear infinite; }
  @keyframes dash-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
  
  .dash-flash-green { animation: flash-green 0.5s ease-out; }
  .dash-flash-red { animation: flash-red 0.5s ease-out; }
  
  @keyframes flash-green { 
    0% { background-color: rgba(52, 211, 153, 0.3); } 
    100% { background-color: transparent; } 
  }
  @keyframes flash-red { 
    0% { background-color: rgba(248, 113, 113, 0.3); } 
    100% { background-color: transparent; } 
  }
  
  .price-up { color: #34d399 !important; }
  .price-down { color: #f87171 !important; }
  
  @media (prefers-reduced-motion: reduce) {
    .dash-ticker { animation: none !important; }
    .dash-flash-green, .dash-flash-red { animation: none !important; }
  }
`;

// Types
interface MarketData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  isUp: boolean;
  lastUpdated: number;
  source: "crypto" | "forex" | "stock" | "index";
}

interface PriceFlash {
  [key: string]: "up" | "down" | null;
}

// Utility functions
const formatPercent = (value: number): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const formatPrice = (price: number, source: string, symbol: string): string => {
  if (source === "forex") {
    if (symbol.includes("JPY")) return `¥${price.toFixed(3)}`;
    return price.toFixed(5);
  }
  if (source === "crypto") {
    if (price > 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price > 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  }
  if (price > 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(2)}`;
};

// API Endpoints
const CRYPTO_API = "https://api.coingecko.com/api/v3/simple/price";
const CRYPTO_IDS = "bitcoin,ethereum,solana,cardano,ripple,dogecoin,polkadot,avalanche-2";

// Fallback/Initial data with realistic values
const INITIAL_DATA: MarketData[] = [
  { id: "bitcoin", symbol: "BTC/USD", name: "Bitcoin", price: 67500, previousPrice: 67500, change: 0, changePercent: 2.4, isUp: true, lastUpdated: Date.now(), source: "crypto" },
  { id: "ethereum", symbol: "ETH/USD", name: "Ethereum", price: 3500, previousPrice: 3500, change: 0, changePercent: 1.2, isUp: true, lastUpdated: Date.now(), source: "crypto" },
  { id: "solana", symbol: "SOL/USD", name: "Solana", price: 145.50, previousPrice: 145.50, change: 0, changePercent: -0.5, isUp: false, lastUpdated: Date.now(), source: "crypto" },
  { id: "cardano", symbol: "ADA/USD", name: "Cardano", price: 0.45, previousPrice: 0.45, change: 0, changePercent: 1.8, isUp: true, lastUpdated: Date.now(), source: "crypto" },
  { id: "ripple", symbol: "XRP/USD", name: "Ripple", price: 0.52, previousPrice: 0.52, change: 0, changePercent: -1.2, isUp: false, lastUpdated: Date.now(), source: "crypto" },
  { id: "dogecoin", symbol: "DOGE/USD", name: "Dogecoin", price: 0.12, previousPrice: 0.12, change: 0, changePercent: 3.5, isUp: true, lastUpdated: Date.now(), source: "crypto" },
  { id: "polkadot", symbol: "DOT/USD", name: "Polkadot", price: 7.20, previousPrice: 7.20, change: 0, changePercent: 0.8, isUp: true, lastUpdated: Date.now(), source: "crypto" },
  { id: "avalanche-2", symbol: "AVAX/USD", name: "Avalanche", price: 35.50, previousPrice: 35.50, change: 0, changePercent: -0.3, isUp: false, lastUpdated: Date.now(), source: "crypto" },
  // Forex pairs (simulated with realistic rates)
  { id: "eurusd", symbol: "EUR/USD", name: "Euro", price: 1.0850, previousPrice: 1.0850, change: 0, changePercent: -0.05, isUp: false, lastUpdated: Date.now(), source: "forex" },
  { id: "gbpusd", symbol: "GBP/USD", name: "British Pound", price: 1.2650, previousPrice: 1.2650, change: 0, changePercent: 0.12, isUp: true, lastUpdated: Date.now(), source: "forex" },
  { id: "usdjpy", symbol: "USD/JPY", name: "Japanese Yen", price: 154.50, previousPrice: 154.50, change: 0, changePercent: 0.08, isUp: true, lastUpdated: Date.now(), source: "forex" },
  { id: "audusd", symbol: "AUD/USD", name: "Australian Dollar", price: 0.6520, previousPrice: 0.6520, change: 0, changePercent: -0.15, isUp: false, lastUpdated: Date.now(), source: "forex" },
  // Major Indices (simulated)
  { id: "spy", symbol: "SPY", name: "S&P 500 ETF", price: 520.45, previousPrice: 520.45, change: 0, changePercent: 0.15, isUp: true, lastUpdated: Date.now(), source: "index" },
  { id: "qqq", symbol: "QQQ", name: "Nasdaq 100 ETF", price: 445.20, previousPrice: 445.20, change: 0, changePercent: 0.45, isUp: true, lastUpdated: Date.now(), source: "index" },
  { id: "dia", symbol: "DIA", name: "Dow Jones ETF", price: 390.80, previousPrice: 390.80, change: 0, changePercent: 0.08, isUp: true, lastUpdated: Date.now(), source: "index" },
  { id: "vix", symbol: "VIX", name: "Volatility Index", price: 14.50, previousPrice: 14.50, change: 0, changePercent: -2.5, isUp: false, lastUpdated: Date.now(), source: "index" },
];

// WebSocket for Binance (Real-time crypto)
const useBinanceWebSocket = (
  onPriceUpdate: (symbol: string, price: number) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    // Binance WebSocket streams for major pairs
    const streams = [
      "btcusdt@trade",
      "ethusdt@trade",
      "solusdt@trade",
      "adausdt@trade",
      "xrpusdt@trade",
      "dogeusdt@trade",
      "dotusdt@trade",
      "avaxusdt@trade",
    ].join("/");

    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.onopen = () => {
      console.log("Binance WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.data && data.data.s && data.data.p) {
          const symbol = data.data.s.replace("USDT", "").toLowerCase();
          const price = parseFloat(data.data.p);
          
          // Map Binance symbols to our IDs
          const symbolMap: { [key: string]: string } = {
            btc: "bitcoin",
            eth: "ethereum",
            sol: "solana",
            ada: "cardano",
            xrp: "ripple",
            doge: "dogecoin",
            dot: "polkadot",
            avax: "avalanche-2",
          };

          const id = symbolMap[symbol];
          if (id) {
            onPriceUpdate(id, price);
          }
        }
      } catch (error) {
        // Silently handle parse errors
      }
    };

    ws.onerror = (error) => {
      console.error("Binance WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("Binance WebSocket disconnected, reconnecting...");
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };

    wsRef.current = ws;
  }, [onPriceUpdate]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return wsRef.current?.readyState === WebSocket.OPEN;
};

// Custom hook for market data
export const useMarketData = () => {
  const [data, setData] = useState<MarketData[]>(INITIAL_DATA);
  const [priceFlash, setPriceFlash] = useState<PriceFlash>({});
  const [isConnected, setIsConnected] = useState(false);
  const lastPricesRef = useRef<{ [key: string]: number }>({});

  // Handle real-time price updates
  const handlePriceUpdate = useCallback((id: string, newPrice: number) => {
    setData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const previousPrice = lastPricesRef.current[id] || item.price;
          const change = newPrice - previousPrice;
          const changePercent = ((newPrice - previousPrice) / previousPrice) * 100;
          const isUp = newPrice >= previousPrice;

          // Trigger flash animation
          if (Math.abs(change) > 0) {
            setPriceFlash((f) => ({ ...f, [id]: isUp ? "up" : "down" }));
            setTimeout(() => {
              setPriceFlash((f) => ({ ...f, [id]: null }));
            }, 500);
          }

          lastPricesRef.current[id] = newPrice;

          return {
            ...item,
            previousPrice: previousPrice,
            price: newPrice,
            change,
            changePercent: Math.abs(changePercent) > 0.01 ? changePercent : item.changePercent,
            isUp: Math.abs(changePercent) > 0.01 ? isUp : item.isUp,
            lastUpdated: Date.now(),
          };
        }
        return item;
      })
    );
  }, []);

  // Use Binance WebSocket for real-time crypto prices
  const wsConnected = useBinanceWebSocket(handlePriceUpdate);

  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  // Fetch initial crypto data from CoinGecko (for 24h change)
  useEffect(() => {
    const fetchCryptoData = async () => {
      try {
        const response = await fetch(
          `${CRYPTO_API}?ids=${CRYPTO_IDS}&vs_currencies=usd&include_24hr_change=true`
        );
        const cryptoData = await response.json();

        setData((prev) =>
          prev.map((item) => {
            if (item.source === "crypto" && cryptoData[item.id]) {
              const coinData = cryptoData[item.id];
              return {
                ...item,
                price: coinData.usd || item.price,
                changePercent: coinData.usd_24h_change || item.changePercent,
                isUp: (coinData.usd_24h_change || 0) >= 0,
                lastUpdated: Date.now(),
              };
            }
            return item;
          })
        );
      } catch (error) {
        console.error("Failed to fetch crypto data:", error);
      }
    };

    fetchCryptoData();
    // Refresh 24h change data every 5 minutes
    const interval = setInterval(fetchCryptoData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Simulate forex and index micro-movements (since we don't have free real-time forex APIs)
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) =>
        prev.map((item) => {
          if (item.source === "forex" || item.source === "index") {
            // More realistic volatility based on asset type
            const volatility = item.source === "forex" ? 0.0001 : 0.0003;
            const randomMove = 1 + (Math.random() * volatility * 2 - volatility);
            
            // 60% chance to move
            if (Math.random() > 0.4) {
              const newPrice = item.price * randomMove;
              const change = newPrice - item.previousPrice;
              const isUp = newPrice >= item.price;

              // Trigger flash for significant moves
              if (Math.abs(((newPrice - item.price) / item.price) * 100) > 0.005) {
                setPriceFlash((f) => ({ ...f, [item.id]: isUp ? "up" : "down" }));
                setTimeout(() => {
                  setPriceFlash((f) => ({ ...f, [item.id]: null }));
                }, 500);
              }

              return {
                ...item,
                previousPrice: item.price,
                price: newPrice,
                change,
                isUp,
                lastUpdated: Date.now(),
              };
            }
          }
          return item;
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return { data, priceFlash, isConnected };
};

// Individual Ticker Item Component
const TickerItem = memo(({ 
  item, 
  flash 
}: { 
  item: MarketData; 
  flash: "up" | "down" | null;
}) => {
  return (
    <div 
      className={cn(
        "flex items-center gap-3 mx-6 px-2 py-1 rounded group cursor-default transition-all",
        flash === "up" && "dash-flash-green",
        flash === "down" && "dash-flash-red"
      )}
    >
      {/* Symbol */}
      <div className="flex flex-col">
        <span className="text-white text-xs font-bold group-hover:text-emerald-400 transition-colors">
          {item.symbol}
        </span>
        <span className="text-gray-600 text-[9px] hidden sm:block">
          {item.name}
        </span>
      </div>
      
      {/* Price */}
      <span 
        className={cn(
          "text-xs font-bold tabular-nums transition-colors duration-150",
          flash === "up" ? "price-up" : flash === "down" ? "price-down" : "text-white"
        )}
      >
        {formatPrice(item.price, item.source, item.symbol)}
      </span>

      {/* Change */}
      <span
        className={cn(
          "text-[10px] font-semibold flex items-center gap-0.5 min-w-[60px]",
          item.isUp ? "text-emerald-400" : "text-red-400"
        )}
      >
        {item.isUp ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {formatPercent(item.changePercent)}
      </span>
    </div>
  );
});

TickerItem.displayName = "TickerItem";

// Market Ticker Component
const MarketTicker = memo(() => {
  const { data, priceFlash, isConnected } = useMarketData();
  const stylesInjected = useRef(false);

  // Inject styles
  useEffect(() => {
    if (!stylesInjected.current) {
      const existingStyle = document.getElementById("market-ticker-styles");
      if (existingStyle) existingStyle.remove();
      
      const styleSheet = document.createElement("style");
      styleSheet.id = "market-ticker-styles";
      styleSheet.textContent = TICKER_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }

    return () => {
      const style = document.getElementById("market-ticker-styles");
      if (style) style.remove();
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-10 bg-[#0a0b0f]/95 backdrop-blur-sm border-b border-white/10 flex items-center shadow-lg shadow-black/20">
      {/* Left Label with Connection Status */}
      <div className="hidden md:flex items-center px-4 h-full bg-[#0a0b0f] border-r border-white/10 z-10 relative gap-2">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-3 h-3 text-emerald-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-yellow-500" />
          )}
          <Activity className={cn(
            "w-4 h-4 mr-1",
            isConnected ? "text-emerald-500 animate-pulse" : "text-yellow-500"
          )} />
        </div>
        <span className="text-xs font-bold text-white tracking-wider">
          {isConnected ? "LIVE" : "DELAYED"}
        </span>
      </div>

      <div className="w-full overflow-hidden relative">
        {/* Gradient fades */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0a0b0f] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0a0b0f] to-transparent z-10 pointer-events-none" />

        <div className="dash-ticker flex whitespace-nowrap items-center h-full">
          {/* Triple the data for seamless looping */}
          {[...data, ...data, ...data].map((item, i) => (
            <TickerItem
              key={`${item.id}-${i}`}
              item={item}
              flash={priceFlash[item.id] || null}
            />
          ))}
        </div>
      </div>

      {/* Mobile connection indicator */}
      <div className="md:hidden flex items-center px-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-emerald-500 animate-pulse" : "bg-yellow-500"
        )} />
      </div>
    </div>
  );
});

MarketTicker.displayName = "MarketTicker";

export default MarketTicker;