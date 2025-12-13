// components/MarketTicker.tsx
import { useState, useEffect, memo, useRef, useCallback } from "react";
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff } from "lucide-react";
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
  FINNHUB_API_KEY: import.meta.env.VITE_FINNHUB_API_KEY || "",
  ALPHA_VANTAGE_API_KEY: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || "",
  TWELVE_DATA_API_KEY: import.meta.env.VITE_TWELVE_DATA_API_KEY || "",
  
  CRYPTO_WS_RECONNECT: 5000,
  COINGECKO_INTERVAL: 60000,
  FINNHUB_REST_INTERVAL: 15000,
  TWELVE_DATA_INTERVAL: 10000,
  ALPHA_VANTAGE_INTERVAL: 60000,
  
  BINANCE_WS: "wss://stream.binance.com:9443/stream",
  FINNHUB_WS: "wss://ws.finnhub.io",
  
  // Maximum reconnect attempts before giving up
  MAX_RECONNECT_ATTEMPTS: 5,
  // Base delay for exponential backoff
  BASE_RECONNECT_DELAY: 1000,
};

// =====================================================================================
// GLOBAL WEBSOCKET MANAGER (Singleton Pattern)
// =====================================================================================

class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocket> = new Map();
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private connectionStatus: Map<string, boolean> = new Map();
  private statusListeners: Set<(status: Record<string, boolean>) => void> = new Set();
  private isDestroyed = false;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);
    
    return () => {
      this.subscribers.get(key)?.delete(callback);
      if (this.subscribers.get(key)?.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  onStatusChange(callback: (status: Record<string, boolean>) => void): () => void {
    this.statusListeners.add(callback);
    // Immediately send current status
    callback(Object.fromEntries(this.connectionStatus));
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatusChange() {
    const status = Object.fromEntries(this.connectionStatus);
    this.statusListeners.forEach(cb => cb(status));
  }

  private notify(key: string, data: any) {
    this.subscribers.get(key)?.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error(`Error in subscriber for ${key}:`, e);
      }
    });
  }

  connectBinance(): void {
    const key = 'binance';
    
    // Prevent duplicate connections
    if (this.connections.has(key)) {
      const existing = this.connections.get(key)!;
      if (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    const streams = Object.keys(BINANCE_SYMBOLS).map(s => `${s}@ticker`).join("/");
    
    try {
      const ws = new WebSocket(`${CONFIG.BINANCE_WS}?streams=${streams}`);
      
      ws.onopen = () => {
        console.log("✅ Binance WebSocket connected");
        this.connectionStatus.set(key, true);
        this.reconnectAttempts.set(key, 0);
        this.notifyStatusChange();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.data) {
            const { s: symbol, c: price, P: changePercent } = message.data;
            const id = BINANCE_SYMBOLS[symbol.toLowerCase()];
            if (id && price) {
              this.notify('crypto', {
                id,
                price: parseFloat(price),
                changePercent: parseFloat(changePercent)
              });
            }
          }
        } catch {
          // Silent error
        }
      };

      ws.onerror = () => {
        this.connectionStatus.set(key, false);
        this.notifyStatusChange();
      };

      ws.onclose = () => {
        this.connectionStatus.set(key, false);
        this.connections.delete(key);
        this.notifyStatusChange();
        
        if (!this.isDestroyed) {
          this.scheduleReconnect(key, () => this.connectBinance());
        }
      };

      this.connections.set(key, ws);
    } catch (error) {
      console.error("Binance WebSocket error:", error);
      this.connectionStatus.set(key, false);
      this.notifyStatusChange();
    }
  }

  connectFinnhub(): void {
    if (!CONFIG.FINNHUB_API_KEY) {
      console.warn("⚠️ Finnhub API key not configured");
      return;
    }

    const key = 'finnhub';
    
    if (this.connections.has(key)) {
      const existing = this.connections.get(key)!;
      if (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    try {
      const ws = new WebSocket(`${CONFIG.FINNHUB_WS}?token=${CONFIG.FINNHUB_API_KEY}`);

      ws.onopen = () => {
        console.log("✅ Finnhub WebSocket connected");
        this.connectionStatus.set(key, true);
        this.reconnectAttempts.set(key, 0);
        this.notifyStatusChange();
        
        STOCK_SYMBOLS.forEach(stock => {
          ws.send(JSON.stringify({ type: "subscribe", symbol: stock.symbol }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "trade" && message.data) {
            message.data.forEach((trade: { s: string; p: number }) => {
              this.notify('stock', {
                symbol: trade.s.toLowerCase(),
                price: trade.p
              });
            });
          }
        } catch {
          // Silent error
        }
      };

      ws.onerror = () => {
        this.connectionStatus.set(key, false);
        this.notifyStatusChange();
      };

      ws.onclose = () => {
        this.connectionStatus.set(key, false);
        this.connections.delete(key);
        this.notifyStatusChange();
        
        if (!this.isDestroyed) {
          this.scheduleReconnect(key, () => this.connectFinnhub());
        }
      };

      this.connections.set(key, ws);
    } catch (error) {
      console.error("Finnhub WebSocket error:", error);
      this.connectionStatus.set(key, false);
      this.notifyStatusChange();
    }
  }

  private scheduleReconnect(key: string, connectFn: () => void) {
    const attempts = this.reconnectAttempts.get(key) || 0;
    
    if (attempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.warn(`Max reconnect attempts reached for ${key}`);
      return;
    }

    // Clear any existing timeout
    const existingTimeout = this.reconnectTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const delay = Math.min(
      CONFIG.BASE_RECONNECT_DELAY * Math.pow(2, attempts),
      30000
    );

    this.reconnectAttempts.set(key, attempts + 1);
    
    const timeout = setTimeout(() => {
      if (!this.isDestroyed) {
        connectFn();
      }
    }, delay);

    this.reconnectTimeouts.set(key, timeout);
  }

  disconnect(key: string) {
    const ws = this.connections.get(key);
    if (ws) {
      ws.close();
      this.connections.delete(key);
    }
    
    const timeout = this.reconnectTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(key);
    }
    
    this.connectionStatus.set(key, false);
    this.notifyStatusChange();
  }

  disconnectAll() {
    this.isDestroyed = true;
    
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
    
    this.connections.forEach((ws, key) => {
      try {
        ws.close();
      } catch {
        // Ignore close errors
      }
    });
    this.connections.clear();
    
    this.connectionStatus.clear();
    this.notifyStatusChange();
  }

  // Reset for testing or manual reconnection
  reset() {
    this.isDestroyed = false;
    this.reconnectAttempts.clear();
  }
}

// =====================================================================================
// ASSET CONFIGURATIONS
// =====================================================================================

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

const FOREX_PAIRS = [
  { id: "eurusd", symbol: "EUR/USD", name: "Euro / Dollar" },
  { id: "gbpusd", symbol: "GBP/USD", name: "Pound / Dollar" },
  { id: "usdjpy", symbol: "USD/JPY", name: "Dollar / Yen" },
  { id: "audusd", symbol: "AUD/USD", name: "Aussie / Dollar" },
  { id: "usdcad", symbol: "USD/CAD", name: "Dollar / Loonie" },
  { id: "usdchf", symbol: "USD/CHF", name: "Dollar / Franc" },
];

const COMMODITIES = [
  { id: "xauusd", symbol: "XAU/USD", name: "Gold" },
  { id: "xagusd", symbol: "XAG/USD", name: "Silver" },
  { id: "wti", symbol: "CL", name: "Crude Oil WTI" },
];

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
// INITIAL DATA
// =====================================================================================

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
// MAIN MARKET DATA HOOK (Uses Singleton WebSocket Manager)
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
  const wsManager = useRef<WebSocketManager | null>(null);

  // Price update handler
  const updatePrice = useCallback((
    id: string,
    newPrice: number,
    changePercent?: number
  ) => {
    if (!newPrice || newPrice <= 0) return;

    setData((prev) =>
      prev.map((item) => {
        if (item.id === id || item.symbol.toLowerCase() === id.toLowerCase()) {
          const previousPrice = lastPricesRef.current[item.id] || item.price || newPrice;
          const isUp = newPrice >= previousPrice;
          
          let pctChange = changePercent ?? 0;
          if (!pctChange && previousPrice > 0) {
            pctChange = ((newPrice - previousPrice) / previousPrice) * 100;
          }

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

  useEffect(() => {
    // Get singleton instance
    wsManager.current = WebSocketManager.getInstance();
    wsManager.current.reset(); // Reset in case of previous destruction

    // Subscribe to crypto updates
    const unsubCrypto = wsManager.current.subscribe('crypto', (data) => {
      updatePrice(data.id, data.price, data.changePercent);
    });

    // Subscribe to stock updates
    const unsubStock = wsManager.current.subscribe('stock', (data) => {
      updatePrice(data.symbol, data.price);
    });

    // Subscribe to status changes
    const unsubStatus = wsManager.current.onStatusChange((status) => {
      setConnectionStatus(prev => ({
        ...prev,
        binance: status.binance || false,
        finnhub: status.finnhub || false,
      }));
    });

    // Connect WebSockets
    wsManager.current.connectBinance();
    wsManager.current.connectFinnhub();

    // Fetch REST data for forex/commodities
    const fetchForexData = async () => {
      if (!CONFIG.TWELVE_DATA_API_KEY) return;
      
      try {
        const symbols = FOREX_PAIRS.map(f => f.symbol.replace("/", "")).join(",");
        const response = await fetch(
          `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${CONFIG.TWELVE_DATA_API_KEY}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(prev => ({ ...prev, twelveData: true }));
          
          FOREX_PAIRS.forEach(pair => {
            const key = pair.symbol.replace("/", "");
            if (data[key]?.price) {
              updatePrice(pair.id, parseFloat(data[key].price));
            }
          });
        }
      } catch {
        // Silent error
      }
    };

    const fetchCoinGeckoData = async () => {
      try {
        const ids = Object.values(BINANCE_SYMBOLS).join(",");
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(prev => ({ ...prev, coingecko: true }));
          
          // Only update if we don't have data from Binance
          Object.entries(data).forEach(([id, values]: [string, any]) => {
            setData(prev => {
              const item = prev.find(i => i.id === id);
              if (item && item.price === 0 && values.usd) {
                updatePrice(id, values.usd, values.usd_24h_change || 0);
              }
              return prev;
            });
          });
        }
      } catch {
        // Silent error
      }
    };

    // Initial fetches
    fetchForexData();
    fetchCoinGeckoData();

    // Set up intervals
    const forexInterval = setInterval(fetchForexData, CONFIG.TWELVE_DATA_INTERVAL);
    const coingeckoInterval = setInterval(fetchCoinGeckoData, CONFIG.COINGECKO_INTERVAL);

    return () => {
      unsubCrypto();
      unsubStock();
      unsubStatus();
      clearInterval(forexInterval);
      clearInterval(coingeckoInterval);
      // Don't disconnect WebSockets on unmount - they're managed by the singleton
    };
  }, [updatePrice]);

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
      <div className="flex flex-col min-w-[50px] sm:min-w-[60px]">
        <span className="text-white text-[11px] sm:text-xs font-bold group-hover:text-emerald-400 transition-colors">
          {item.displaySymbol}
        </span>
        <span className="text-gray-600 text-[8px] sm:text-[9px] hidden sm:block truncate max-w-[70px]">
          {item.name}
        </span>
      </div>

      <span
        className={cn(
          "text-[11px] sm:text-xs font-bold tabular-nums transition-all duration-200 min-w-[60px] sm:min-w-[75px] text-right",
          flash === "up" ? "price-up" : flash === "down" ? "price-down" : "text-white",
          item.isLoading && "ticker-pulse"
        )}
      >
        {hasData ? formatPrice(item.price, item.source, item.symbol) : "—"}
      </span>

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
// MARKET TICKER CONTENT
// =====================================================================================

const MarketTickerContent = memo(() => {
  const { data, priceFlash, connectionStatus, isConnected } = useMarketData();
  const stylesInjected = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

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

  const activeConnections = Object.values(connectionStatus).filter(Boolean).length;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-9 sm:h-10 bg-[#0a0b0f]/95 backdrop-blur-md border-b border-white/10 flex items-center shadow-lg shadow-black/30"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
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

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-12 bg-gradient-to-r from-[#0a0b0f] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-12 bg-gradient-to-l from-[#0a0b0f] to-transparent z-10 pointer-events-none" />

        <div className={cn("flex whitespace-nowrap items-center h-full", !isPaused && "dash-ticker")}>
          {[...data, ...data, ...data].map((item, i) => (
            <TickerItem key={`${item.id}-${i}`} item={item} flash={priceFlash[item.id] || null} />
          ))}
        </div>
      </div>

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

MarketTickerContent.displayName = "MarketTickerContent";

// =====================================================================================
// SINGLETON GUARD - Prevents Multiple Instances
// =====================================================================================

let marketTickerMounted = false;

const MarketTicker = memo(() => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!marketTickerMounted) {
      marketTickerMounted = true;
      setShouldRender(true);

      return () => {
        marketTickerMounted = false;
        // Clean up WebSocket manager when component is permanently unmounted
        WebSocketManager.getInstance().disconnectAll();
      };
    }
  }, []);

  if (!shouldRender) return null;

  return <MarketTickerContent />;
});

MarketTicker.displayName = "MarketTicker";

export default MarketTicker;