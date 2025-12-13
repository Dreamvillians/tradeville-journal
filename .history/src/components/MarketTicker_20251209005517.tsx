// components/MarketTicker.tsx
import { useState, useEffect, memo, useRef, useCallback } from "react";
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// =====================================================================================
// STYLES
// =====================================================================================

export const TICKER_STYLES = `
  .dash-ticker { 
    animation: dash-ticker 60s linear infinite; 
  }
  .dash-ticker:hover {
    animation-play-state: paused;
  }
  @keyframes dash-ticker { 
    0% { transform: translateX(0); } 
    100% { transform: translateX(-33.33%); } 
  }
  
  .dash-flash-green { animation: flash-green 0.6s ease-out; }
  .dash-flash-red { animation: flash-red 0.6s ease-out; }
  
  @keyframes flash-green { 
    0% { background-color: rgba(52, 211, 153, 0.4); transform: scale(1.02); } 
    100% { background-color: transparent; transform: scale(1); } 
  }
  @keyframes flash-red { 
    0% { background-color: rgba(248, 113, 113, 0.4); transform: scale(1.02); } 
    100% { background-color: transparent; transform: scale(1); } 
  }
  
  .price-up { color: #34d399 !important; text-shadow: 0 0 8px rgba(52, 211, 153, 0.5); }
  .price-down { color: #f87171 !important; text-shadow: 0 0 8px rgba(248, 113, 113, 0.5); }
  
  .ticker-pulse {
    animation: ticker-pulse 2s ease-in-out infinite;
  }
  @keyframes ticker-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .dash-ticker, .dash-flash-green, .dash-flash-red, .ticker-pulse { 
      animation: none !important; 
    }
  }
`;

// =====================================================================================
// TYPES
// =====================================================================================

interface MarketData {
  id: string;
  symbol: string;
  displaySymbol: string;
  name: string;
  price: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  isUp: boolean;
  lastUpdated: number;
  source: "crypto" | "forex" | "stock" | "index" | "commodity";
  exchange?: string;
  isLoading: boolean;
}

interface PriceFlash {
  [key: string]: "up" | "down" | null;
}

interface ConnectionStatus {
  binance: boolean;
  finnhub: boolean;
  twelveData: boolean;
  alphaVantage: boolean;
  coingecko: boolean;
}

// =====================================================================================
// CONFIGURATION
// =====================================================================================

const CONFIG = {
  // API Keys from environment
  FINNHUB_API_KEY: import.meta.env.VITE_FINNHUB_API_KEY || "",
  ALPHA_VANTAGE_API_KEY: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || "",
  TWELVE_DATA_API_KEY: import.meta.env.VITE_TWELVE_DATA_API_KEY || "",
  
  // Update intervals
  CRYPTO_WS_RECONNECT: 5000,
  COINGECKO_INTERVAL: 60000,
  FINNHUB_REST_INTERVAL: 15000,
  TWELVE_DATA_INTERVAL: 10000,
  ALPHA_VANTAGE_INTERVAL: 60000, // Limited to 5 calls/min
  
  // WebSocket URLs
  BINANCE_WS: "wss://stream.binance.com:9443/stream",
  FINNHUB_WS: "wss://ws.finnhub.io",
  TWELVE_DATA_WS: "wss://ws.twelvedata.com/v1/quotes/price",
};

// Log API key status on load
if (typeof window !== "undefined") {
  console.log("📊 Market Ticker API Status:");
  console.log(`  • Finnhub: ${CONFIG.FINNHUB_API_KEY ? "✅ Configured" : "❌ Missing"}`);
  console.log(`  • Twelve Data: ${CONFIG.TWELVE_DATA_API_KEY ? "✅ Configured" : "❌ Missing"}`);
  console.log(`  • Alpha Vantage: ${CONFIG.ALPHA_VANTAGE_API_KEY ? "✅ Configured" : "❌ Missing"}`);
  console.log(`  • Binance: ✅ No key required`);
  console.log(`  • CoinGecko: ✅ No key required`);
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

const formatPercent = (value: number): string => {
  if (isNaN(value)) return "0.00%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const formatPrice = (price: number, source: string, symbol: string): string => {
  if (!price || isNaN(price)) return "—";
  
  switch (source) {
    case "forex":
      if (symbol.includes("JPY")) return `¥${price.toFixed(3)}`;
      return price.toFixed(5);
    case "crypto":
      if (price >= 10000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      if (price >= 100) return `$${price.toFixed(2)}`;
      if (price >= 1) return `$${price.toFixed(2)}`;
      if (price >= 0.01) return `$${price.toFixed(4)}`;
      return `$${price.toFixed(6)}`;
    case "commodity":
      return `$${price.toFixed(2)}`;
    default:
      if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return `$${price.toFixed(2)}`;
  }
};

// =====================================================================================
// ASSET CONFIGURATIONS
// =====================================================================================

// Binance symbol mapping
const BINANCE_SYMBOLS: { [key: string]: string } = {
  btcusdt: "bitcoin",
  ethusdt: "ethereum",
  solusdt: "solana",
  bnbusdt: "binancecoin",
  xrpusdt: "ripple",
  adausdt: "cardano",
  dogeusdt: "dogecoin",
  dotusdt: "polkadot",
  avaxusdt: "avalanche",
  maticusdt: "polygon",
};

// Stock symbols for Finnhub
const STOCK_SYMBOLS = [
  { id: "aapl", symbol: "AAPL", name: "Apple", exchange: "NASDAQ" },
  { id: "msft", symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" },
  { id: "googl", symbol: "GOOGL", name: "Alphabet", exchange: "NASDAQ" },
  { id: "amzn", symbol: "AMZN", name: "Amazon", exchange: "NASDAQ" },
  { id: "nvda", symbol: "NVDA", name: "NVIDIA", exchange: "NASDAQ" },
  { id: "tsla", symbol: "TSLA", name: "Tesla", exchange: "NASDAQ" },
  { id: "meta", symbol: "META", name: "Meta", exchange: "NASDAQ" },
  { id: "spy", symbol: "SPY", name: "S&P 500 ETF", exchange: "NYSE" },
  { id: "qqq", symbol: "QQQ", name: "Nasdaq ETF", exchange: "NASDAQ" },
  { id: "dia", symbol: "DIA", name: "Dow Jones ETF", exchange: "NYSE" },
];

// Forex pairs for Twelve Data
const FOREX_PAIRS = [
  { id: "eurusd", symbol: "EUR/USD", name: "Euro / Dollar" },
  { id: "gbpusd", symbol: "GBP/USD", name: "Pound / Dollar" },
  { id: "usdjpy", symbol: "USD/JPY", name: "Dollar / Yen" },
  { id: "audusd", symbol: "AUD/USD", name: "Aussie / Dollar" },
  { id: "usdcad", symbol: "USD/CAD", name: "Dollar / Loonie" },
  { id: "usdchf", symbol: "USD/CHF", name: "Dollar / Franc" },
];

// Commodities
const COMMODITIES = [
  { id: "xauusd", symbol: "XAU/USD", name: "Gold" },
  { id: "xagusd", symbol: "XAG/USD", name: "Silver" },
  { id: "wti", symbol: "CL", name: "Crude Oil WTI" },
];

// Initial data structure
const createInitialData = (): MarketData[] => {
  const cryptos: MarketData[] = Object.entries(BINANCE_SYMBOLS).map(([_, id]) => ({
    id,
    symbol: id.toUpperCase().slice(0, 3) + "/USD",
    displaySymbol: id.toUpperCase().slice(0, 3) + "/USD",
    name: id.charAt(0).toUpperCase() + id.slice(1),
    price: 0,
    previousPrice: 0,
    change: 0,
    changePercent: 0,
    isUp: true,
    lastUpdated: 0,
    source: "crypto" as const,
    exchange: "Binance",
    isLoading: true,
  }));

  const stocks: MarketData[] = STOCK_SYMBOLS.map((s) => ({
    id: s.id,
    symbol: s.symbol,
    displaySymbol: s.symbol,
    name: s.name,
    price: 0,
    previousPrice: 0,
    change: 0,
    changePercent: 0,
    isUp: true,
    lastUpdated: 0,
    source: "stock" as const,
    exchange: s.exchange,
    isLoading: true,
  }));

  const forex: MarketData[] = FOREX_PAIRS.map((f) => ({
    id: f.id,
    symbol: f.symbol,
    displaySymbol: f.symbol,
    name: f.name,
    price: 0,
    previousPrice: 0,
    change: 0,
    changePercent: 0,
    isUp: true,
    lastUpdated: 0,
    source: "forex" as const,
    isLoading: true,
  }));

  const commodities: MarketData[] = COMMODITIES.map((c) => ({
    id: c.id,
    symbol: c.symbol,
    displaySymbol: c.symbol,
    name: c.name,
    price: 0,
    previousPrice: 0,
    change: 0,
    changePercent: 0,
    isUp: true,
    lastUpdated: 0,
    source: "commodity" as const,
    isLoading: true,
  }));

  return [...cryptos, ...stocks, ...forex, ...commodities];
};

// =====================================================================================
// BINANCE WEBSOCKET (Crypto Real-Time)
// =====================================================================================

const useBinanceWebSocket = (
  onPriceUpdate: (id: string, price: number, changePercent: number) => void,
  onConnectionChange: (connected: boolean) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const streams = Object.keys(BINANCE_SYMBOLS).map((s) => `${s}@ticker`).join("/");

    try {
      const ws = new WebSocket(`${CONFIG.BINANCE_WS}?streams=${streams}`);

      ws.onopen = () => {
        console.log("✅ Binance WebSocket connected");
        onConnectionChange(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.data) {
            const { s: symbol, c: price, P: changePercent } = message.data;
            const id = BINANCE_SYMBOLS[symbol.toLowerCase()];
            if (id && price) {
              onPriceUpdate(id, parseFloat(price), parseFloat(changePercent));
            }
          }
        } catch (e) {
          // Silent error
        }
      };

      ws.onerror = () => {
        onConnectionChange(false);
      };

      ws.onclose = () => {
        onConnectionChange(false);
        if (reconnectAttempts.current < 10) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Binance WebSocket error:", error);
      onConnectionChange(false);
    }
  }, [onPriceUpdate, onConnectionChange]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);
};

// =====================================================================================
// FINNHUB (Stocks Real-Time)
// =====================================================================================

const useFinnhubData = (
  onPriceUpdate: (symbol: string, price: number, change: number, changePercent: number) => void,
  onConnectionChange: (connected: boolean) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const lastPrices = useRef<{ [key: string]: number }>({});

  // WebSocket connection
  useEffect(() => {
    if (!CONFIG.FINNHUB_API_KEY) {
      console.warn("⚠️ Finnhub API key not configured");
      return;
    }

    const connect = () => {
      try {
        const ws = new WebSocket(`${CONFIG.FINNHUB_WS}?token=${CONFIG.FINNHUB_API_KEY}`);

        ws.onopen = () => {
          console.log("✅ Finnhub WebSocket connected");
          onConnectionChange(true);
          
          // Subscribe to stock symbols
          STOCK_SYMBOLS.forEach((stock) => {
            ws.send(JSON.stringify({ type: "subscribe", symbol: stock.symbol }));
          });
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "trade" && message.data) {
              message.data.forEach((trade: { s: string; p: number }) => {
                const prevPrice = lastPrices.current[trade.s] || trade.p;
                const change = trade.p - prevPrice;
                const changePercent = (change / prevPrice) * 100;
                lastPrices.current[trade.s] = trade.p;
                onPriceUpdate(trade.s.toLowerCase(), trade.p, change, changePercent);
              });
            }
          } catch (e) {
            // Silent error
          }
        };

        ws.onerror = () => onConnectionChange(false);
        ws.onclose = () => {
          onConnectionChange(false);
          setTimeout(connect, 5000);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("Finnhub connection error:", error);
      }
    };

    connect();

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        STOCK_SYMBOLS.forEach((stock) => {
          wsRef.current?.send(JSON.stringify({ type: "unsubscribe", symbol: stock.symbol }));
        });
      }
      wsRef.current?.close();
    };
  }, [onPriceUpdate, onConnectionChange]);

  // REST API fallback for quotes
  useEffect(() => {
    if (!CONFIG.FINNHUB_API_KEY) return;

    const fetchQuotes = async () => {
      for (const stock of STOCK_SYMBOLS) {
        try {
          const response = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=${CONFIG.FINNHUB_API_KEY}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.c && data.c > 0) {
              onPriceUpdate(stock.id, data.c, data.d || 0, data.dp || 0);
            }
          }
          await new Promise((r) => setTimeout(r, 200)); // Rate limit
        } catch (e) {
          // Silent error
        }
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, CONFIG.FINNHUB_REST_INTERVAL);
    return () => clearInterval(interval);
  }, [onPriceUpdate]);
};

// =====================================================================================
// TWELVE DATA (Forex Real-Time)
// =====================================================================================

const useTwelveDataForex = (
  onPriceUpdate: (id: string, price: number, changePercent: number) => void,
  onConnectionChange: (connected: boolean) => void
) => {
  const previousPrices = useRef<{ [key: string]: { price: number; openPrice: number } }>({});

  useEffect(() => {
    if (!CONFIG.TWELVE_DATA_API_KEY) {
      console.warn("⚠️ Twelve Data API key not configured");
      return;
    }

    const fetchForexPrices = async () => {
      try {
        // Fetch real-time forex prices
        const symbols = FOREX_PAIRS.map((f) => f.symbol.replace("/", "")).join(",");
        
        const response = await fetch(
          `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${CONFIG.TWELVE_DATA_API_KEY}`
        );

        if (response.ok) {
          const data = await response.json();
          onConnectionChange(true);

          FOREX_PAIRS.forEach((pair) => {
            const key = pair.symbol.replace("/", "");
            const priceData = data[key];
            
            if (priceData && priceData.price) {
              const currentPrice = parseFloat(priceData.price);
              const prev = previousPrices.current[pair.id];
              
              let changePercent = 0;
              if (prev) {
                changePercent = ((currentPrice - prev.openPrice) / prev.openPrice) * 100;
              }
              
              previousPrices.current[pair.id] = {
                price: currentPrice,
                openPrice: prev?.openPrice || currentPrice,
              };
              
              onPriceUpdate(pair.id, currentPrice, changePercent);
            }
          });
        }
      } catch (error) {
        console.error("Twelve Data fetch error:", error);
        onConnectionChange(false);
      }
    };

    // Fetch opening prices for change calculation
    const fetchOpeningPrices = async () => {
      try {
        const symbols = FOREX_PAIRS.map((f) => f.symbol.replace("/", "")).join(",");
        
        const response = await fetch(
          `https://api.twelvedata.com/quote?symbol=${symbols}&apikey=${CONFIG.TWELVE_DATA_API_KEY}`
        );

        if (response.ok) {
          const data = await response.json();
          
          FOREX_PAIRS.forEach((pair) => {
            const key = pair.symbol.replace("/", "");
            const quoteData = data[key];
            
            if (quoteData && quoteData.open) {
              previousPrices.current[pair.id] = {
                price: parseFloat(quoteData.close || quoteData.open),
                openPrice: parseFloat(quoteData.open),
              };
            }
          });
        }
      } catch (error) {
        console.error("Twelve Data quote error:", error);
      }
    };

    fetchOpeningPrices();
    fetchForexPrices();
    
    const interval = setInterval(fetchForexPrices, CONFIG.TWELVE_DATA_INTERVAL);
    return () => clearInterval(interval);
  }, [onPriceUpdate, onConnectionChange]);
};

// =====================================================================================
// ALPHA VANTAGE (Commodities)
// =====================================================================================

const useAlphaVantageCommodities = (
  onPriceUpdate: (id: string, price: number, changePercent: number) => void,
  onConnectionChange: (connected: boolean) => void
) => {
  useEffect(() => {
    if (!CONFIG.ALPHA_VANTAGE_API_KEY) {
      console.warn("⚠️ Alpha Vantage API key not configured");
      return;
    }

    const fetchCommodities = async () => {
      try {
        // Gold
        const goldResponse = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=GLD&apikey=${CONFIG.ALPHA_VANTAGE_API_KEY}`
        );
        
        if (goldResponse.ok) {
          const goldData = await goldResponse.json();
          const quote = goldData["Global Quote"];
          if (quote && quote["05. price"]) {
            // GLD ETF price * ~18.5 ≈ Gold spot price (approximate)
            const goldPrice = parseFloat(quote["05. price"]) * 18.5;
            const changePercent = parseFloat(quote["10. change percent"]?.replace("%", "") || "0");
            onPriceUpdate("xauusd", goldPrice, changePercent);
            onConnectionChange(true);
          }
        }

        await new Promise((r) => setTimeout(r, 12000)); // Alpha Vantage rate limit

        // Silver
        const silverResponse = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SLV&apikey=${CONFIG.ALPHA_VANTAGE_API_KEY}`
        );
        
        if (silverResponse.ok) {
          const silverData = await silverResponse.json();
          const quote = silverData["Global Quote"];
          if (quote && quote["05. price"]) {
            // SLV ETF price ≈ Silver spot price
            const silverPrice = parseFloat(quote["05. price"]);
            const changePercent = parseFloat(quote["10. change percent"]?.replace("%", "") || "0");
            onPriceUpdate("xagusd", silverPrice, changePercent);
          }
        }

        await new Promise((r) => setTimeout(r, 12000));

        // Crude Oil
        const oilResponse = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=USO&apikey=${CONFIG.ALPHA_VANTAGE_API_KEY}`
        );
        
        if (oilResponse.ok) {
          const oilData = await oilResponse.json();
          const quote = oilData["Global Quote"];
          if (quote && quote["05. price"]) {
            const oilPrice = parseFloat(quote["05. price"]);
            const changePercent = parseFloat(quote["10. change percent"]?.replace("%", "") || "0");
            onPriceUpdate("wti", oilPrice, changePercent);
          }
        }
      } catch (error) {
        console.error("Alpha Vantage fetch error:", error);
      }
    };

    fetchCommodities();
    const interval = setInterval(fetchCommodities, CONFIG.ALPHA_VANTAGE_INTERVAL);
    return () => clearInterval(interval);
  }, [onPriceUpdate, onConnectionChange]);
};

// =====================================================================================
// COINGECKO (Crypto 24h Data Backup)
// =====================================================================================

const useCoinGeckoData = (
  onDataUpdate: (id: string, price: number, changePercent: number) => void,
  onConnectionChange: (connected: boolean) => void
) => {
  useEffect(() => {
    const fetchData = async () => {
      try {
        const ids = Object.values(BINANCE_SYMBOLS).join(",");
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          onConnectionChange(true);
          
          Object.entries(data).forEach(([id, values]: [string, any]) => {
            if (values.usd) {
              onDataUpdate(id, values.usd, values.usd_24h_change || 0);
            }
          });
        }
      } catch (error) {
        console.error("CoinGecko fetch error:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, CONFIG.COINGECKO_INTERVAL);
    return () => clearInterval(interval);
  }, [onDataUpdate, onConnectionChange]);
};

// =====================================================================================
// MAIN MARKET DATA HOOK
// =====================================================================================

export const useMarketData = () => {
  const [data, setData] = useState<MarketData[]>(createInitialData);
  const [priceFlash, setPriceFlash] = useState<PriceFlash>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    binance: false,
    finnhub: false,
    twelveData: false,
    alphaVantage: false,
    coingecko: false,
  });
  
  const lastPricesRef = useRef<{ [key: string]: number }>({});

  // Universal price update handler
  const updatePrice = useCallback((
    id: string,
    newPrice: number,
    changeOrPercent?: number,
    changePercent?: number
  ) => {
    if (!newPrice || newPrice <= 0) return;

    setData((prev) =>
      prev.map((item) => {
        if (item.id === id || item.symbol.toLowerCase() === id.toLowerCase()) {
          const previousPrice = lastPricesRef.current[item.id] || item.price || newPrice;
          const isUp = newPrice >= previousPrice;
          
          // Determine change percent
          let pctChange = changePercent ?? changeOrPercent ?? 0;
          if (!pctChange && previousPrice > 0) {
            pctChange = ((newPrice - previousPrice) / previousPrice) * 100;
          }

          // Trigger flash animation
          if (previousPrice > 0 && Math.abs(newPrice - previousPrice) / previousPrice > 0.0001) {
            setPriceFlash((f) => ({ ...f, [item.id]: isUp ? "up" : "down" }));
            setTimeout(() => setPriceFlash((f) => ({ ...f, [item.id]: null })), 600);
          }

          lastPricesRef.current[item.id] = newPrice;

          return {
            ...item,
            previousPrice,
            price: newPrice,
            change: newPrice - previousPrice,
            changePercent: pctChange,
            isUp: pctChange >= 0,
            lastUpdated: Date.now(),
            isLoading: false,
          };
        }
        return item;
      })
    );
  }, []);

  // Connect to data sources
  useBinanceWebSocket(
    (id, price, changePercent) => updatePrice(id, price, changePercent),
    (connected) => setConnectionStatus((s) => ({ ...s, binance: connected }))
  );

  useFinnhubData(
    (id, price, change, changePercent) => updatePrice(id, price, change, changePercent),
    (connected) => setConnectionStatus((s) => ({ ...s, finnhub: connected }))
  );

  useTwelveDataForex(
    (id, price, changePercent) => updatePrice(id, price, changePercent),
    (connected) => setConnectionStatus((s) => ({ ...s, twelveData: connected }))
  );

  useAlphaVantageCommodities(
    (id, price, changePercent) => updatePrice(id, price, changePercent),
    (connected) => setConnectionStatus((s) => ({ ...s, alphaVantage: connected }))
  );

  useCoinGeckoData(
    (id, price, changePercent) => {
      // Only use CoinGecko as backup if Binance hasn't provided data
      setData((prev) => {
        const item = prev.find((i) => i.id === id);
        if (item && item.price === 0) {
          updatePrice(id, price, changePercent);
        }
        return prev;
      });
    },
    (connected) => setConnectionStatus((s) => ({ ...s, coingecko: connected }))
  );

  const isConnected = Object.values(connectionStatus).some(Boolean);
  const activeData = data.filter((item) => item.price > 0);

  return { 
    data: activeData.length > 0 ? activeData : data, 
    priceFlash, 
    connectionStatus, 
    isConnected 
  };
};

// =====================================================================================
// TICKER ITEM COMPONENT
// =====================================================================================

const TickerItem = memo(({ item, flash }: { item: MarketData; flash: "up" | "down" | null }) => {
  const hasData = item.price > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-3 mx-3 sm:mx-5 px-2 py-1 rounded-lg group cursor-default transition-all duration-200",
        flash === "up" && "dash-flash-green",
        flash === "down" && "dash-flash-red",
        item.isLoading && "opacity-50"
      )}
    >
      {/* Symbol & Name */}
      <div className="flex flex-col min-w-[50px] sm:min-w-[60px]">
        <span className="text-white text-[11px] sm:text-xs font-bold group-hover:text-emerald-400 transition-colors">
          {item.displaySymbol}
        </span>
        <span className="text-gray-600 text-[8px] sm:text-[9px] hidden sm:block truncate max-w-[70px]">
          {item.name}
        </span>
      </div>

      {/* Price */}
      <span
        className={cn(
          "text-[11px] sm:text-xs font-bold tabular-nums transition-all duration-200 min-w-[60px] sm:min-w-[75px] text-right",
          flash === "up" ? "price-up" : flash === "down" ? "price-down" : "text-white",
          item.isLoading && "ticker-pulse"
        )}
      >
        {hasData ? formatPrice(item.price, item.source, item.symbol) : "—"}
      </span>

      {/* Change */}
      {hasData && (
        <span
          className={cn(
            "text-[9px] sm:text-[10px] font-semibold flex items-center gap-0.5 min-w-[50px] sm:min-w-[55px]",
            item.isUp ? "text-emerald-400" : "text-red-400"
          )}
        >
          {item.isUp ? (
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
          )}
          {formatPercent(item.changePercent)}
        </span>
      )}
    </div>
  );
});

TickerItem.displayName = "TickerItem";

// =====================================================================================
// MARKET TICKER COMPONENT
// =====================================================================================

const MarketTicker = memo(() => {
  const { data, priceFlash, connectionStatus, isConnected } = useMarketData();
  const stylesInjected = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

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

  // Count active connections
  const activeConnections = Object.values(connectionStatus).filter(Boolean).length;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-9 sm:h-10 bg-[#0a0b0f]/95 backdrop-blur-md border-b border-white/10 flex items-center shadow-lg shadow-black/30"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Status Panel */}
      <div className="hidden md:flex items-center px-3 h-full bg-gradient-to-r from-[#0a0b0f] to-transparent border-r border-white/10 z-20 gap-2">
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <Wifi className="w-3 h-3 text-emerald-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-yellow-500 animate-pulse" />
          )}
          <Activity
            className={cn(
              "w-3.5 h-3.5",
              isConnected ? "text-emerald-500 animate-pulse" : "text-yellow-500"
            )}
          />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[9px] font-bold text-white tracking-wider">
            {isConnected ? "LIVE" : "CONNECTING"}
          </span>
          <span className="text-[7px] text-gray-500">
            {activeConnections}/5 sources
          </span>
        </div>

        {/* Connection dots */}
        <div className="hidden lg:flex items-center gap-1 ml-1 pl-2 border-l border-white/10">
          <div
            className={cn("w-1.5 h-1.5 rounded-full", connectionStatus.binance ? "bg-emerald-500" : "bg-gray-600")}
            title="Binance (Crypto)"
          />
          <div
            className={cn("w-1.5 h-1.5 rounded-full", connectionStatus.finnhub ? "bg-emerald-500" : "bg-gray-600")}
            title="Finnhub (Stocks)"
          />
          <div
            className={cn("w-1.5 h-1.5 rounded-full", connectionStatus.twelveData ? "bg-emerald-500" : "bg-gray-600")}
            title="Twelve Data (Forex)"
          />
          <div
            className={cn("w-1.5 h-1.5 rounded-full", connectionStatus.alphaVantage ? "bg-emerald-500" : "bg-gray-600")}
            title="Alpha Vantage (Commodities)"
          />
          <div
            className={cn("w-1.5 h-1.5 rounded-full", connectionStatus.coingecko ? "bg-emerald-500" : "bg-gray-600")}
            title="CoinGecko (Backup)"
          />
        </div>
      </div>

      {/* Ticker */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-12 bg-gradient-to-r from-[#0a0b0f] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-12 bg-gradient-to-l from-[#0a0b0f] to-transparent z-10 pointer-events-none" />

        <div className={cn("flex whitespace-nowrap items-center h-full", !isPaused && "dash-ticker")}>
          {[...data, ...data, ...data].map((item, i) => (
            <TickerItem key={`${item.id}-${i}`} item={item} flash={priceFlash[item.id] || null} />
          ))}
        </div>
      </div>

      {/* Mobile Status */}
      <div className="md:hidden flex items-center px-2 gap-1">
        <div
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            isConnected ? "bg-emerald-500 animate-pulse" : "bg-yellow-500"
          )}
        />
      </div>
    </div>
  );
});

MarketTicker.displayName = "MarketTicker";

export default MarketTicker;