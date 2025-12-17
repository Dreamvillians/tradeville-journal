// components/MarketTicker.tsx
import { useState, useEffect, memo, useRef, useCallback } from "react";
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff, Globe, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// =====================================================================================
// STYLES
// =====================================================================================

export const TICKER_STYLES = `
  .dash-ticker { 
    animation: dash-ticker 90s linear infinite; 
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
  TWELVE_DATA_INTERVAL: 30000, // Increased to avoid rate limits on free tier
  
  BINANCE_WS: "wss://stream.binance.com:9443/stream",
  FINNHUB_WS: "wss://ws.finnhub.io",
  
  MAX_RECONNECT_ATTEMPTS: 5,
  BASE_RECONNECT_DELAY: 1000,
};

// =====================================================================================
// ASSET CONFIGURATIONS (UPDATED: Most Traded / Essential)
// =====================================================================================

// 1. INDICES & MAJOR TECH (The pulse of the market)
const STOCK_SYMBOLS = [
  { id: "spy", symbol: "SPY", name: "S&P 500", exchange: "NYSE" },
  { id: "qqq", symbol: "QQQ", name: "Nasdaq 100", exchange: "NASDAQ" },
  { id: "dia", symbol: "DIA", name: "Dow Jones", exchange: "NYSE" },
  { id: "iwm", symbol: "IWM", name: "Russell 2000", exchange: "NYSE" },
  { id: "nvda", symbol: "NVDA", name: "NVIDIA", exchange: "NASDAQ" },
  { id: "tsla", symbol: "TSLA", name: "Tesla", exchange: "NASDAQ" },
  { id: "aapl", symbol: "AAPL", name: "Apple", exchange: "NASDAQ" },
  { id: "msft", symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" },
  { id: "amd", symbol: "AMD", name: "AMD", exchange: "NASDAQ" },
  { id: "meta", symbol: "META", name: "Meta", exchange: "NASDAQ" },
  { id: "coin", symbol: "COIN", name: "Coinbase", exchange: "NASDAQ" }, // Crypto proxy
  { id: "mstr", symbol: "MSTR", name: "MicroStrategy", exchange: "NASDAQ" }, // BTC proxy
];

// 2. CRYPTO (High Volume Majors)
const BINANCE_SYMBOLS: { [key: string]: string } = {
  btcusdt: "bitcoin",
  ethusdt: "ethereum",
  solusdt: "solana",
  bnbusdt: "binancecoin",
  xrpusdt: "ripple",
  dogeusdt: "dogecoin",
  adausdt: "cardano",
  linkusdt: "chainlink",
  avaxusdt: "avalanche",
  pepeusdt: "pepe", // High volume meme
  wifusdt: "dogwifhat", // Trending meme
};

// 3. FOREX (Major Liquid Pairs)
const FOREX_PAIRS = [
  { id: "eurusd", symbol: "EUR/USD", name: "Euro/Dollar" },
  { id: "usdjpy", symbol: "USD/JPY", name: "Dollar/Yen" },
  { id: "gbpusd", symbol: "GBP/USD", name: "Pound/Dollar" },
  { id: "usdcad", symbol: "USD/CAD", name: "Dollar/Loonie" },
  { id: "audusd", symbol: "AUD/USD", name: "Aussie/Dollar" },
  { id: "usdchf", symbol: "USD/CHF", name: "Dollar/Franc" },
];

// 4. COMMODITIES (Economic Indicators)
const COMMODITIES = [
  { id: "xauusd", symbol: "XAU/USD", name: "Gold" },
  { id: "xagusd", symbol: "XAG/USD", name: "Silver" },
  { id: "wti", symbol: "CL", name: "Crude Oil" }, // WTI
];

// =====================================================================================
// GLOBAL WEBSOCKET MANAGER
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
    callback(Object.fromEntries(this.connectionStatus));
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatusChange() {
    const status = Object.fromEntries(this.connectionStatus);
    this.statusListeners.forEach(cb => cb(status));
  }

  private notify(key: string, data: any) {
    this.subscribers.get(key)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error(`Error in subscriber for ${key}:`, e); }
    });
  }

  connectBinance(): void {
    const key = 'binance';
    if (this.connections.has(key) && (this.connections.get(key)!.readyState === WebSocket.OPEN || this.connections.get(key)!.readyState === WebSocket.CONNECTING)) return;

    // Use a subset of streams if too many, but here we can handle ~20 fine
    const streams = Object.keys(BINANCE_SYMBOLS).map(s => `${s}@ticker`).join("/");
    
    try {
      const ws = new WebSocket(`${CONFIG.BINANCE_WS}?streams=${streams}`);
      
      ws.onopen = () => {
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
              this.notify('crypto', { id, price: parseFloat(price), changePercent: parseFloat(changePercent) });
            }
          }
        } catch {}
      };

      ws.onerror = () => { this.connectionStatus.set(key, false); this.notifyStatusChange(); };
      ws.onclose = () => {
        this.connectionStatus.set(key, false);
        this.connections.delete(key);
        this.notifyStatusChange();
        if (!this.isDestroyed) this.scheduleReconnect(key, () => this.connectBinance());
      };

      this.connections.set(key, ws);
    } catch (error) {
      console.error("Binance WebSocket error:", error);
    }
  }

  connectFinnhub(): void {
    if (!CONFIG.FINNHUB_API_KEY) return;

    const key = 'finnhub';
    if (this.connections.has(key) && (this.connections.get(key)!.readyState === WebSocket.OPEN || this.connections.get(key)!.readyState === WebSocket.CONNECTING)) return;

    try {
      const ws = new WebSocket(`${CONFIG.FINNHUB_WS}?token=${CONFIG.FINNHUB_API_KEY}`);

      ws.onopen = () => {
        this.connectionStatus.set(key, true);
        this.reconnectAttempts.set(key, 0);
        this.notifyStatusChange();
        STOCK_SYMBOLS.forEach(stock => ws.send(JSON.stringify({ type: "subscribe", symbol: stock.symbol })));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "trade" && message.data) {
            message.data.forEach((trade: { s: string; p: number }) => {
              this.notify('stock', { symbol: trade.s.toLowerCase(), price: trade.p });
            });
          }
        } catch {}
      };

      ws.onerror = () => { this.connectionStatus.set(key, false); this.notifyStatusChange(); };
      ws.onclose = () => {
        this.connectionStatus.set(key, false);
        this.connections.delete(key);
        this.notifyStatusChange();
        if (!this.isDestroyed) this.scheduleReconnect(key, () => this.connectFinnhub());
      };

      this.connections.set(key, ws);
    } catch (error) {
      console.error("Finnhub WebSocket error:", error);
    }
  }

  private scheduleReconnect(key: string, connectFn: () => void) {
    const attempts = this.reconnectAttempts.get(key) || 0;
    if (attempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) return;

    const existingTimeout = this.reconnectTimeouts.get(key);
    if (existingTimeout) clearTimeout(existingTimeout);

    const delay = Math.min(CONFIG.BASE_RECONNECT_DELAY * Math.pow(2, attempts), 30000);
    this.reconnectAttempts.set(key, attempts + 1);
    
    const timeout = setTimeout(() => { if (!this.isDestroyed) connectFn(); }, delay);
    this.reconnectTimeouts.set(key, timeout);
  }

  disconnectAll() {
    this.isDestroyed = true;
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
    this.connections.forEach((ws) => { try { ws.close(); } catch {} });
    this.connections.clear();
    this.connectionStatus.clear();
    this.notifyStatusChange();
  }

  reset() {
    this.isDestroyed = false;
    this.reconnectAttempts.clear();
  }
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
  
  if (source === "forex") {
    if (symbol.includes("JPY")) return `¥${price.toFixed(2)}`;
    return price.toFixed(4);
  }
  
  if (source === "crypto") {
    if (price >= 10000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 100) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  }

  // Stocks & Commodities
  if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(2)}`;
};

// =====================================================================================
// INITIAL DATA CREATION
// =====================================================================================

const createInitialData = (): MarketData[] => {
  // Order: Indices/Stocks -> Crypto -> Forex -> Commodities
  
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
    source: s.id === "spy" || s.id === "qqq" || s.id === "dia" || s.id === "iwm" ? "index" : "stock",
    exchange: s.exchange,
    isLoading: true,
  }));

  const cryptos: MarketData[] = Object.entries(BINANCE_SYMBOLS).map(([_, id]) => ({
    id,
    symbol: id.toUpperCase().slice(0, 3) + "/USD", // Simplification
    displaySymbol: id === 'bitcoin' ? 'BTC' : id === 'ethereum' ? 'ETH' : id.toUpperCase().substring(0, 4),
    name: id.charAt(0).toUpperCase() + id.slice(1),
    price: 0,
    previousPrice: 0,
    change: 0,
    changePercent: 0,
    isUp: true,
    lastUpdated: 0,
    source: "crypto",
    exchange: "Binance",
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
    source: "forex",
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
    source: "commodity",
    isLoading: true,
  }));

  return [...stocks, ...cryptos, ...forex, ...commodities];
};

// =====================================================================================
// MARKET DATA HOOK
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

  const updatePrice = useCallback((id: string, newPrice: number, changePercent?: number) => {
    if (!newPrice || newPrice <= 0) return;

    setData((prev) =>
      prev.map((item) => {
        // Match by ID or Symbol
        if (item.id === id || item.symbol.toLowerCase() === id.toLowerCase()) {
          const previousPrice = lastPricesRef.current[item.id] || item.price || newPrice;
          const isUp = newPrice >= previousPrice;
          
          let pctChange = changePercent ?? 0;
          if (!pctChange && previousPrice > 0) {
            pctChange = ((newPrice - previousPrice) / previousPrice) * 100;
          } else if (!pctChange && item.changePercent) {
             pctChange = item.changePercent; // Keep existing change if not provided
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
    wsManager.current = WebSocketManager.getInstance();
    wsManager.current.reset();

    const unsubCrypto = wsManager.current.subscribe('crypto', (d) => updatePrice(d.id, d.price, d.changePercent));
    const unsubStock = wsManager.current.subscribe('stock', (d) => updatePrice(d.symbol, d.price));
    const unsubStatus = wsManager.current.onStatusChange((s) => setConnectionStatus(prev => ({...prev, binance: s.binance || false, finnhub: s.finnhub || false})));

    wsManager.current.connectBinance();
    wsManager.current.connectFinnhub();

    // REST Polling for Forex/Commodities/Crypto Backups
    const fetchThirdPartyData = async () => {
      // 1. Forex via TwelveData (API Key required in .env)
      if (CONFIG.TWELVE_DATA_API_KEY) {
        try {
          const symbols = FOREX_PAIRS.map(f => f.symbol.replace("/", "")).join(",");
          const res = await fetch(`https://api.twelvedata.com/price?symbol=${symbols}&apikey=${CONFIG.TWELVE_DATA_API_KEY}`);
          if (res.ok) {
            const json = await res.json();
            setConnectionStatus(p => ({ ...p, twelveData: true }));
            FOREX_PAIRS.forEach(pair => {
              const key = pair.symbol.replace("/", "");
              if (json[key]?.price) updatePrice(pair.id, parseFloat(json[key].price));
            });
          }
        } catch {}
      }

      // 2. Crypto backup via CoinGecko
      try {
        const ids = Object.values(BINANCE_SYMBOLS).join(",");
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        if (res.ok) {
          const json = await res.json();
          setConnectionStatus(p => ({ ...p, coingecko: true }));
          Object.entries(json).forEach(([id, val]: [string, any]) => {
             // Only update if price is 0 (Binance hasn't connected yet)
             setData(prev => {
                const item = prev.find(i => i.id === id);
                if (item && item.price === 0) updatePrice(id, val.usd, val.usd_24h_change);
                return prev;
             });
          });
        }
      } catch {}
    };

    fetchThirdPartyData();
    const interval = setInterval(fetchThirdPartyData, CONFIG.TWELVE_DATA_INTERVAL);

    return () => {
      unsubCrypto();
      unsubStock();
      unsubStatus();
      clearInterval(interval);
    };
  }, [updatePrice]);

  const activeData = data.filter((item) => item.price > 0);
  return { data: activeData.length > 0 ? activeData : data, priceFlash, connectionStatus };
};

// =====================================================================================
// TICKER ITEM COMPONENT
// =====================================================================================

const TickerItem = memo(({ item, flash }: { item: MarketData; flash: "up" | "down" | null }) => {
  const hasData = item.price > 0;
  
  // Icon based on type
  const TypeIcon = item.source === 'crypto' ? Zap : item.source === 'forex' ? Globe : Activity;

  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-3 mx-4 sm:mx-6 px-2 py-1.5 rounded-lg group cursor-default transition-all duration-200 border border-transparent hover:border-white/5 hover:bg-white/5",
        flash === "up" && "dash-flash-green",
        flash === "down" && "dash-flash-red",
        item.isLoading && "opacity-50"
      )}
    >
      <div className="flex flex-col min-w-[50px] sm:min-w-[60px]">
        <div className="flex items-center gap-1.5">
            {/* <TypeIcon className="w-3 h-3 text-white/40" /> */}
            <span className="text-white text-[11px] sm:text-xs font-bold group-hover:text-emerald-400 transition-colors tracking-wide">
            {item.displaySymbol}
            </span>
        </div>
        <span className="text-gray-500 text-[9px] hidden sm:block truncate max-w-[80px]">
          {item.name}
        </span>
      </div>

      <div className="flex flex-col items-end">
        <span
            className={cn(
            "text-[11px] sm:text-xs font-mono font-bold tabular-nums transition-all duration-200 min-w-[60px] text-right",
            flash === "up" ? "price-up" : flash === "down" ? "price-down" : "text-white",
            item.isLoading && "ticker-pulse"
            )}
        >
            {hasData ? formatPrice(item.price, item.source, item.symbol) : "—"}
        </span>

        {hasData && (
            <span
            className={cn(
                "text-[9px] sm:text-[10px] font-semibold flex items-center gap-0.5",
                item.isUp ? "text-emerald-400" : "text-red-400"
            )}
            >
            {item.isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {formatPercent(item.changePercent)}
            </span>
        )}
      </div>
    </div>
  );
});

TickerItem.displayName = "TickerItem";

// =====================================================================================
// MAIN COMPONENT
// =====================================================================================

const MarketTickerContent = memo(() => {
  const { data, priceFlash, connectionStatus } = useMarketData();
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
  }, []);

  // Use connection data to show a status dot
  const isLive = Object.values(connectionStatus).some(Boolean);

  // Triple data for smooth infinite scroll
  const displayData = [...data, ...data, ...data];

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-10 bg-[#0a0b0f] border-b border-white/5 flex items-center shadow-lg shadow-black/30"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Sidebar Label / Status */}
      <div className="hidden md:flex items-center px-4 h-full bg-[#0a0b0f] border-r border-white/5 z-20 gap-3 min-w-[180px]">
        <div className="flex items-center gap-2">
           <div className={cn("w-2 h-2 rounded-full", isLive ? "bg-emerald-500 animate-pulse" : "bg-yellow-500")} />
           <span className="text-[10px] font-bold text-white tracking-widest uppercase">
             Market Data
           </span>
        </div>
        
        {/* Connection Micro-indicators */}
        <div className="flex gap-0.5 ml-auto">
            <div className={cn("w-1 h-1 rounded-full", connectionStatus.binance ? "bg-emerald-500" : "bg-white/10")} title="Crypto" />
            <div className={cn("w-1 h-1 rounded-full", connectionStatus.finnhub ? "bg-emerald-500" : "bg-white/10")} title="Stocks" />
            <div className={cn("w-1 h-1 rounded-full", connectionStatus.twelveData ? "bg-emerald-500" : "bg-white/10")} title="Forex" />
        </div>
      </div>

      {/* Marquee Container */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        {/* Fade Masks */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0a0b0f] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0a0b0f] to-transparent z-10 pointer-events-none" />

        <div className={cn("flex whitespace-nowrap items-center h-full will-change-transform", !isPaused && "dash-ticker")}>
          {displayData.map((item, i) => (
            <TickerItem key={`${item.id}-${i}`} item={item} flash={priceFlash[item.id] || null} />
          ))}
        </div>
      </div>
      
      {/* Mobile Status Dot */}
      <div className="md:hidden flex items-center px-3 z-20 bg-[#0a0b0f] h-full border-l border-white/5">
        <div className={cn("w-2 h-2 rounded-full", isLive ? "bg-emerald-500 animate-pulse" : "bg-yellow-500")} />
      </div>
    </div>
  );
});

MarketTickerContent.displayName = "MarketTickerContent";

let marketTickerMounted = false;
const MarketTicker = memo(() => {
  const [shouldRender, setShouldRender] = useState(false);
  useEffect(() => {
    if (!marketTickerMounted) {
      marketTickerMounted = true;
      setShouldRender(true);
      return () => {
        marketTickerMounted = false;
        WebSocketManager.getInstance().disconnectAll();
      };
    }
  }, []);
  if (!shouldRender) return null;
  return <MarketTickerContent />;
});

MarketTicker.displayName = "MarketTicker";
export default MarketTicker;