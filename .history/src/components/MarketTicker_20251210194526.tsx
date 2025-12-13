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
// CONNECTION MANAGER - Prevents resource exhaustion
// =====================================================================================

class ConnectionManager {
  private static instance: ConnectionManager;
  private activeConnections: Map<string, WebSocket> = new Map();
  private connectionQueue: Array<() => void> = [];
  private maxConnections = 2; // Limit concurrent WebSocket connections
  private isProcessing = false;

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  canConnect(): boolean {
    return this.activeConnections.size < this.maxConnections;
  }

  registerConnection(id: string, ws: WebSocket): void {
    this.activeConnections.set(id, ws);
  }

  unregisterConnection(id: string): void {
    const ws = this.activeConnections.get(id);
    if (ws) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      this.activeConnections.delete(id);
    }
    this.processQueue();
  }

  queueConnection(connectFn: () => void): void {
    this.connectionQueue.push(connectFn);
    this.processQueue();
  }

  private processQueue(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.connectionQueue.length > 0 && this.canConnect()) {
      const connectFn = this.connectionQueue.shift();
      if (connectFn) {
        connectFn();
      }
    }

    this.isProcessing = false;
  }

  closeAll(): void {
    this.activeConnections.forEach((ws, id) => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    });
    this.activeConnections.clear();
    this.connectionQueue = [];
  }

  getActiveCount(): number {
    return this.activeConnections.size;
  }
}

// =====================================================================================
// REQUEST THROTTLER - Prevents API rate limiting
// =====================================================================================

class RequestThrottler {
  private static instance: RequestThrottler;
  private requestQueue: Map<string, { fn: () => Promise<any>; resolve: (value: any) => void; reject: (reason?: any) => void }[]> = new Map();
  private lastRequestTime: Map<string, number> = new Map();
  private minInterval: Map<string, number> = new Map();
  private isProcessing: Map<string, boolean> = new Map();

  static getInstance(): RequestThrottler {
    if (!RequestThrottler.instance) {
      RequestThrottler.instance = new RequestThrottler();
    }
    return RequestThrottler.instance;
  }

  setMinInterval(source: string, interval: number): void {
    this.minInterval.set(source, interval);
  }

  async throttle<T>(source: string, fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.requestQueue.has(source)) {
        this.requestQueue.set(source, []);
      }
      this.requestQueue.get(source)!.push({ fn, resolve, reject });
      this.processQueue(source);
    });
  }

  private async processQueue(source: string): Promise<void> {
    if (this.isProcessing.get(source)) return;
    this.isProcessing.set(source, true);

    const queue = this.requestQueue.get(source);
    const minInterval = this.minInterval.get(source) || 1000;

    while (queue && queue.length > 0) {
      const lastTime = this.lastRequestTime.get(source) || 0;
      const now = Date.now();
      const waitTime = Math.max(0, minInterval - (now - lastTime));

      if (waitTime > 0) {
        await new Promise(r => setTimeout(r, waitTime));
      }

      const request = queue.shift();
      if (request) {
        try {
          this.lastRequestTime.set(source, Date.now());
          const result = await request.fn();
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
    }

    this.isProcessing.set(source, false);
  }
}

// =====================================================================================
// CONFIGURATION
// =====================================================================================

const CONFIG = {
  FINNHUB_API_KEY: import.meta.env.VITE_FINNHUB_API_KEY || "",
  ALPHA_VANTAGE_API_KEY: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || "",
  TWELVE_DATA_API_KEY: import.meta.env.VITE_TWELVE_DATA_API_KEY || "",
  
  // Increased intervals to reduce resource usage
  CRYPTO_WS_RECONNECT: 10000,
  COINGECKO_INTERVAL: 120000, // 2 minutes
  FINNHUB_REST_INTERVAL: 30000, // 30 seconds
  TWELVE_DATA_INTERVAL: 30000,
  ALPHA_VANTAGE_INTERVAL: 120000,
  
  BINANCE_WS: "wss://stream.binance.com:9443/stream",
  FINNHUB_WS: "wss://ws.finnhub.io",
  
  // New: Stagger connection delays
  CONNECTION_STAGGER_DELAY: 2000,
  INITIAL_LOAD_DELAY: 1000,
};

// Initialize throttler intervals
const throttler = RequestThrottler.getInstance();
throttler.setMinInterval('finnhub', 500);
throttler.setMinInterval('twelvedata', 1000);
throttler.setMinInterval('alphavantage', 15000);
throttler.setMinInterval('coingecko', 2000);

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
// ASSET CONFIGURATIONS - Reduced for resource efficiency
// =====================================================================================

// Only essential crypto pairs
const BINANCE_SYMBOLS: { [key: string]: string } = {
  btcusdt: "bitcoin",
  ethusdt: "ethereum",
  bnbusdt: "binancecoin",
  xrpusdt: "ripple",
  solusdt: "solana",
};

// Reduced stock list
const STOCK_SYMBOLS = [
  { id: "aapl", symbol: "AAPL", name: "Apple", exchange: "NASDAQ" },
  { id: "msft", symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" },
  { id: "googl", symbol: "GOOGL", name: "Alphabet", exchange: "NASDAQ" },
  { id: "spy", symbol: "SPY", name: "S&P 500 ETF", exchange: "NYSE" },
];

// Reduced forex pairs
const FOREX_PAIRS = [
  { id: "eurusd", symbol: "EUR/USD", name: "Euro / Dollar" },
  { id: "gbpusd", symbol: "GBP/USD", name: "Pound / Dollar" },
  { id: "usdjpy", symbol: "USD/JPY", name: "Dollar / Yen" },
];

// Reduced commodities
const COMMODITIES = [
  { id: "xauusd", symbol: "XAU/USD", name: "Gold" },
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
// BINANCE WEBSOCKET - With connection management
// =====================================================================================

const useBinanceWebSocket = (
  onPriceUpdate: (id: string, price: number, changePercent: number) => void,
  onConnectionChange: (connected: boolean) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const isUnmounted = useRef(false);
  const connectionManager = ConnectionManager.getInstance();

  const connect = useCallback(() => {
    if (isUnmounted.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    // Check if we can connect
    if (!connectionManager.canConnect()) {
      connectionManager.queueConnection(connect);
      return;
    }

    const streams = Object.keys(BINANCE_SYMBOLS).map((s) => `${s}@ticker`).join("/");

    try {
      // Clean up any existing connection first
      if (wsRef.current) {
        connectionManager.unregisterConnection('binance');
        wsRef.current = null;
      }

      const ws = new WebSocket(`${CONFIG.BINANCE_WS}?streams=${streams}`);
      wsRef.current = ws;
      connectionManager.registerConnection('binance', ws);

      ws.onopen = () => {
        if (isUnmounted.current) {
          ws.close();
          return;
        }
        console.log("✅ Binance WebSocket connected");
        onConnectionChange(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        if (isUnmounted.current) return;
        try {
          const message = JSON.parse(event.data);
          if (message.data) {
            const { s: symbol, c: price, P: changePercent } = message.data;
            const id = BINANCE_SYMBOLS[symbol.toLowerCase()];
            if (id && price) {
              onPriceUpdate(id, parseFloat(price), parseFloat(changePercent));
            }
          }
        } catch {
          // Silent error
        }
      };

      ws.onerror = () => {
        if (!isUnmounted.current) {
          onConnectionChange(false);
        }
      };

      ws.onclose = () => {
        connectionManager.unregisterConnection('binance');
        wsRef.current = null;
        
        if (!isUnmounted.current) {
          onConnectionChange(false);
          
          // Exponential backoff with max attempts
          if (reconnectAttempts.current < 5) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectAttempts.current++;
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          }
        }
      };
    } catch (error) {
      console.error("Binance WebSocket error:", error);
      onConnectionChange(false);
    }
  }, [onPriceUpdate, onConnectionChange, connectionManager]);

  useEffect(() => {
    isUnmounted.current = false;
    
    // Delay initial connection to stagger resource usage
    const initialDelay = setTimeout(connect, CONFIG.INITIAL_LOAD_DELAY);
    
    return () => {
      isUnmounted.current = true;
      clearTimeout(initialDelay);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      connectionManager.unregisterConnection('binance');
      wsRef.current = null;
    };
  }, [connect]);
};

// =====================================================================================
// FINNHUB - REST only (WebSocket removed to reduce connections)
// =====================================================================================

const useFinnhubData = (
  onPriceUpdate: (symbol: string, price: number, change: number, changePercent: number) => void,
  onConnectionChange: (connected: boolean) => void
) => {
  const isUnmounted = useRef(false);

  useEffect(() => {
    if (!CONFIG.FINNHUB_API_KEY) {
      console.warn("⚠️ Finnhub API key not configured");
      return;
    }

    isUnmounted.current = false;

    const fetchQuotes = async () => {
      if (isUnmounted.current) return;

      let hasSuccessfulFetch = false;

      for (const stock of STOCK_SYMBOLS) {
        if (isUnmounted.current) break;
        
        try {
          const data = await throttler.throttle('finnhub', async () => {
            const response = await fetch(
              `https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=${CONFIG.FINNHUB_API_KEY}`
            );
            if (!response.ok) throw new Error('API error');
            return response.json();
          });

          if (data.c && data.c > 0 && !isUnmounted.current) {
            onPriceUpdate(stock.id, data.c, data.d || 0, data.dp || 0);
            hasSuccessfulFetch = true;
          }
        } catch {
          // Silent error - continue with other stocks
        }
      }

      if (!isUnmounted.current) {
        onConnectionChange(hasSuccessfulFetch);
      }
    };

    // Stagger initial fetch
    const initialDelay = setTimeout(fetchQuotes, CONFIG.CONNECTION_STAGGER_DELAY);
    const interval = setInterval(fetchQuotes, CONFIG.FINNHUB_REST_INTERVAL);

    return () => {
      isUnmounted.current = true;
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [onPriceUpdate, onConnectionChange]);
};

// =====================================================================================
// TWELVE DATA (Forex) - Throttled REST API
// =====================================================================================

const useTwelveDataForex = (
  onPriceUpdate: (id: string, price: number, changePercent: number) => void,
  onConnectionChange: (connected: boolean) => void
) => {
  const previousPrices = useRef<{ [key: string]: { price: number; openPrice: number } }>({});
  const isUnmounted = useRef(false);

  useEffect(() => {
    if (!CONFIG.TWELVE_DATA_API_KEY) {
      console.warn("⚠️ Twelve Data API key not configured");
      return;
    }

    isUnmounted.current = false;

    const fetchForexPrices = async () => {
      if (isUnmounted.current) return;

      try {
        const symbols = FOREX_PAIRS.map((f) => f.symbol.replace("/", "")).join(",");
        
        const data = await throttler.throttle('twelvedata', async () => {
          const response = await fetch(
            `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${CONFIG.TWELVE_DATA_API_KEY}`
          );
          if (!response.ok) throw new Error('API error');
          return response.json();
        });

        if (isUnmounted.current) return;
        
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
      } catch (error) {
        if (!isUnmounted.current) {
          onConnectionChange(false);
        }
      }
    };

    // Stagger initial fetch
    const initialDelay = setTimeout(fetchForexPrices, CONFIG.CONNECTION_STAGGER_DELAY * 2);
    const interval = setInterval(fetchForexPrices, CONFIG.TWELVE_DATA_INTERVAL);

    return () => {
      isUnmounted.current = true;
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [onPriceUpdate, onConnectionChange]);
};

// =====================================================================================
// ALPHA VANTAGE (Commodities) - Heavily throttled
// =====================================================================================

const useAlphaVantageCommodities = (
  onPriceUpdate: (id: string, price: number, changePercent: number) => void,
  onConnectionChange: (connected: boolean) => void
) => {
  const isUnmounted = useRef(false);

  useEffect(() => {
    if (!CONFIG.ALPHA_VANTAGE_API_KEY) {
      console.warn("⚠️ Alpha Vantage API key not configured");
      return;
    }

    isUnmounted.current = false;

    const fetchCommodities = async () => {
      if (isUnmounted.current) return;

      try {
        const data = await throttler.throttle('alphavantage', async () => {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=GLD&apikey=${CONFIG.ALPHA_VANTAGE_API_KEY}`
          );
          if (!response.ok) throw new Error('API error');
          return response.json();
        });

        if (isUnmounted.current) return;

        const quote = data["Global Quote"];
        if (quote && quote["05. price"]) {
          const goldPrice = parseFloat(quote["05. price"]) * 18.5;
          const changePercent = parseFloat(quote["10. change percent"]?.replace("%", "") || "0");
          onPriceUpdate("xauusd", goldPrice, changePercent);
          onConnectionChange(true);
        }
      } catch {
        if (!isUnmounted.current) {
          onConnectionChange(false);
        }
      }
    };

    // Stagger initial fetch significantly
    const initialDelay = setTimeout(fetchCommodities, CONFIG.CONNECTION_STAGGER_DELAY * 3);
    const interval = setInterval(fetchCommodities, CONFIG.ALPHA_VANTAGE_INTERVAL);

    return () => {
      isUnmounted.current = true;
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [onPriceUpdate, onConnectionChange]);
};

// =====================================================================================
// COINGECKO (Crypto Backup) - Used only as fallback
// =====================================================================================

const useCoinGeckoData = (
  onDataUpdate: (id: string, price: number, changePercent: number) => void,
  onConnectionChange: (connected: boolean) => void,
  shouldFetch: boolean
) => {
  const isUnmounted = useRef(false);

  useEffect(() => {
    // Only fetch if Binance is not connected
    if (!shouldFetch) return;

    isUnmounted.current = false;

    const fetchData = async () => {
      if (isUnmounted.current) return;

      try {
        const ids = Object.values(BINANCE_SYMBOLS).join(",");
        
        const data = await throttler.throttle('coingecko', async () => {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
          );
          if (!response.ok) throw new Error('API error');
          return response.json();
        });

        if (isUnmounted.current) return;
        
        onConnectionChange(true);
        
        Object.entries(data).forEach(([id, values]: [string, any]) => {
          if (values.usd) {
            onDataUpdate(id, values.usd, values.usd_24h_change || 0);
          }
        });
      } catch {
        if (!isUnmounted.current) {
          onConnectionChange(false);
        }
      }
    };

    const initialDelay = setTimeout(fetchData, CONFIG.CONNECTION_STAGGER_DELAY * 4);
    const interval = setInterval(fetchData, CONFIG.COINGECKO_INTERVAL);

    return () => {
      isUnmounted.current = true;
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [onDataUpdate, onConnectionChange, shouldFetch]);
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
  const updateQueueRef = useRef<Map<string, { price: number; change?: number; changePercent?: number }>>(new Map());
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Batched price update handler - reduces re-renders
  const processUpdates = useCallback(() => {
    const updates = updateQueueRef.current;
    if (updates.size === 0) return;

    setData((prev) => {
      const newData = [...prev];
      
      updates.forEach((update, id) => {
        const index = newData.findIndex(item => 
          item.id === id || item.symbol.toLowerCase() === id.toLowerCase()
        );
        
        if (index === -1) return;
        
        const item = newData[index];
        const newPrice = update.price;
        const previousPrice = lastPricesRef.current[item.id] || item.price || newPrice;
        const isUp = newPrice >= previousPrice;
        
        let pctChange = update.changePercent ?? 0;
        if (!pctChange && previousPrice > 0) {
          pctChange = ((newPrice - previousPrice) / previousPrice) * 100;
        }

        // Trigger flash animation
        if (previousPrice > 0 && Math.abs(newPrice - previousPrice) / previousPrice > 0.0001) {
          setPriceFlash((f) => ({ ...f, [item.id]: isUp ? "up" : "down" }));
          setTimeout(() => setPriceFlash((f) => ({ ...f, [item.id]: null })), 600);
        }

        lastPricesRef.current[item.id] = newPrice;

        newData[index] = {
          ...item,
          previousPrice,
          price: newPrice,
          change: newPrice - previousPrice,
          changePercent: pctChange,
          isUp: pctChange >= 0,
          lastUpdated: Date.now(),
          isLoading: false,
        };
      });

      return newData;
    });

    updateQueueRef.current.clear();
  }, []);

  // Queue updates and batch process
  const updatePrice = useCallback((
    id: string,
    newPrice: number,
    changeOrPercent?: number,
    changePercent?: number
  ) => {
    if (!newPrice || newPrice <= 0) return;

    updateQueueRef.current.set(id, {
      price: newPrice,
      change: changeOrPercent,
      changePercent: changePercent ?? changeOrPercent,
    });

    // Debounce updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(processUpdates, 100);
  }, [processUpdates]);

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

  // Only use CoinGecko as backup when Binance is not connected
  useCoinGeckoData(
    (id, price, changePercent) => {
      const item = data.find((i) => i.id === id);
      if (item && item.price === 0) {
        updatePrice(id, price, changePercent);
      }
    },
    (connected) => setConnectionStatus((s) => ({ ...s, coingecko: connected })),
    !connectionStatus.binance
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

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
// MARKET TICKER COMPONENT
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

// Singleton guard with proper cleanup
let marketTickerInstanceId: string | null = null;

const MarketTicker = () => {
  const [shouldRender, setShouldRender] = useState(false);
  const instanceId = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    if (!marketTickerInstanceId) {
      marketTickerInstanceId = instanceId.current;
      setShouldRender(true);

      return () => {
        if (marketTickerInstanceId === instanceId.current) {
          marketTickerInstanceId = null;
          // Cleanup all connections
          ConnectionManager.getInstance().closeAll();
        }
      };
    }
  }, []);

  if (!shouldRender) return null;

  return <MarketTickerContent />;
};

MarketTicker.displayName = "MarketTicker";

export default memo(MarketTicker);