// src/components/MarketTicker.tsx
import { useState, useEffect, useCallback, memo, useRef } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

// =====================================================================================
// TYPES
// =====================================================================================

interface TickerData {
  symbol: string;
  price: string;
  change: string;
  isUp: boolean;
  prevPrice?: number;
}

interface CandleData {
  id: number;
  height: number;
  isGreen: boolean;
  delay: number;
  wickTop: number;
  wickBottom: number;
  open?: number;
  close?: number;
  high?: number;
  low?: number;
}

// =====================================================================================
// CONSTANTS
// =====================================================================================

const DEFAULT_TICKERS: TickerData[] = [
  { symbol: "BTC/USD", price: "67,234", change: "+2.3%", isUp: true },
  { symbol: "ETH/USD", price: "3,456", change: "+1.5%", isUp: true },
  { symbol: "EUR/USD", price: "1.087", change: "-0.1%", isUp: false },
  { symbol: "SOL/USD", price: "147.82", change: "+3.2%", isUp: true },
];

const DEFAULT_CANDLES: CandleData[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  height: 20 + (i * 6) % 50,
  isGreen: i % 3 !== 0,
  delay: i * 0.2,
  wickTop: 5 + (i % 3) * 4,
  wickBottom: 5 + ((i + 1) % 3) * 4,
}));

// =====================================================================================
// STYLES
// =====================================================================================

const TICKER_STYLES = `
  .ticker-scroll { animation: ticker-scroll 25s linear infinite; }
  .ticker-candle { animation: ticker-candle-pulse 3s ease-in-out infinite; }
  .ticker-price-flash { animation: ticker-price-flash 0.5s ease-out; }
  
  @keyframes ticker-scroll { 
    0% { transform: translateX(0); } 
    100% { transform: translateX(-50%); } 
  }
  @keyframes ticker-candle-pulse { 
    0%, 100% { transform: scaleY(1); opacity: 0.6; } 
    50% { transform: scaleY(1.15); opacity: 0.9; } 
  }
  @keyframes ticker-price-flash { 
    0% { background-color: rgba(16, 185, 129, 0.3); } 
    100% { background-color: transparent; } 
  }
  
  @media (prefers-reduced-motion: reduce) {
    .ticker-scroll, .ticker-candle { animation: none !important; }
  }
`;

// =====================================================================================
// CUSTOM HOOK: useLiveMarketData
// =====================================================================================

export const useLiveMarketData = (refreshInterval: number = 30000) => {
  const [tickers, setTickers] = useState<TickerData[]>(DEFAULT_TICKERS);
  const [candles, setCandles] = useState<CandleData[]>(DEFAULT_CANDLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const previousPrices = useRef<Map<string, number>>(new Map());
  const priceHistory = useRef<number[]>([]);
  const isUnmounted = useRef(false);

  const fetchMarketData = useCallback(async () => {
    if (isUnmounted.current) return;

    try {
      setLoading(true);

      const promises: Promise<Response>[] = [
        // CoinGecko - Crypto prices
        fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true',
          { signal: AbortSignal.timeout(10000) }
        ),
        // ExchangeRate API - Forex
        fetch(
          'https://api.exchangerate-api.com/v4/latest/EUR',
          { signal: AbortSignal.timeout(10000) }
        ),
        // Binance - Candlestick data
        fetch(
          'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=8',
          { signal: AbortSignal.timeout(10000) }
        ),
      ];

      const [cryptoResponse, forexResponse, candleResponse] = await Promise.allSettled(promises);

      if (isUnmounted.current) return;

      // Parse crypto data
      let btcPrice = 67234, ethPrice = 3456, solPrice = 147.82;
      let btcChange = 2.3, ethChange = 1.5, solChange = 3.2;

      if (cryptoResponse.status === 'fulfilled' && cryptoResponse.value.ok) {
        try {
          const data = await cryptoResponse.value.json();
          btcPrice = data.bitcoin?.usd || btcPrice;
          ethPrice = data.ethereum?.usd || ethPrice;
          solPrice = data.solana?.usd || solPrice;
          btcChange = data.bitcoin?.usd_24h_change || btcChange;
          ethChange = data.ethereum?.usd_24h_change || ethChange;
          solChange = data.solana?.usd_24h_change || solChange;
        } catch (e) {
          console.warn('Failed to parse crypto data');
        }
      }

      // Parse forex data
      let eurUsd = 1.087;
      if (forexResponse.status === 'fulfilled' && forexResponse.value.ok) {
        try {
          const data = await forexResponse.value.json();
          eurUsd = data.rates?.USD || eurUsd;
        } catch (e) {
          console.warn('Failed to parse forex data');
        }
      }

      // Calculate EUR/USD change
      const prevEurUsd = previousPrices.current.get('EUR/USD') || eurUsd;
      const eurChange = previousPrices.current.has('EUR/USD')
        ? ((eurUsd - prevEurUsd) / prevEurUsd * 100)
        : 0.05;

      // Update previous prices
      previousPrices.current.set('BTC/USD', btcPrice);
      previousPrices.current.set('ETH/USD', ethPrice);
      previousPrices.current.set('SOL/USD', solPrice);
      previousPrices.current.set('EUR/USD', eurUsd);

      const newTickers: TickerData[] = [
        {
          symbol: "BTC/USD",
          price: btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          change: `${btcChange >= 0 ? '+' : ''}${btcChange.toFixed(1)}%`,
          isUp: btcChange >= 0,
          prevPrice: previousPrices.current.get('BTC/USD')
        },
        {
          symbol: "ETH/USD",
          price: ethPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          change: `${ethChange >= 0 ? '+' : ''}${ethChange.toFixed(1)}%`,
          isUp: ethChange >= 0,
          prevPrice: previousPrices.current.get('ETH/USD')
        },
        {
          symbol: "EUR/USD",
          price: eurUsd.toFixed(4),
          change: `${eurChange >= 0 ? '+' : ''}${eurChange.toFixed(2)}%`,
          isUp: eurChange >= 0,
          prevPrice: prevEurUsd
        },
        {
          symbol: "SOL/USD",
          price: solPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }),
          change: `${solChange >= 0 ? '+' : ''}${solChange.toFixed(1)}%`,
          isUp: solChange >= 0,
          prevPrice: previousPrices.current.get('SOL/USD')
        }
      ];

      if (!isUnmounted.current) {
        setTickers(newTickers);
      }

      // Parse Binance candle data
      if (candleResponse.status === 'fulfilled' && candleResponse.value.ok) {
        try {
          const klines = await candleResponse.value.json();
          
          if (Array.isArray(klines) && klines.length >= 8) {
            const newCandles: CandleData[] = klines.map((kline: any[], index: number) => {
              const open = parseFloat(kline[1]);
              const high = parseFloat(kline[2]);
              const low = parseFloat(kline[3]);
              const close = parseFloat(kline[4]);
              const isGreen = close >= open;
              
              const priceRange = high - low;
              const bodySize = Math.abs(close - open);
              const baseHeight = 25;
              const dynamicHeight = (bodySize / priceRange) * 50;
              
              const wickTopSize = isGreen
                ? (high - close) / priceRange * 15
                : (high - open) / priceRange * 15;
              const wickBottomSize = isGreen
                ? (open - low) / priceRange * 15
                : (close - low) / priceRange * 15;
              
              return {
                id: index,
                height: Math.max(20, Math.min(70, baseHeight + dynamicHeight)),
                isGreen,
                delay: index * 0.15,
                wickTop: Math.max(3, Math.min(15, wickTopSize + 3)),
                wickBottom: Math.max(3, Math.min(15, wickBottomSize + 3)),
                open, close, high, low
              };
            });
            
            if (!isUnmounted.current) {
              setCandles(newCandles);
            }
          }
        } catch (e) {
          console.warn('Failed to parse candle data');
        }
      }

      if (!isUnmounted.current) {
        setLastUpdate(new Date());
        setLoading(false);
        setError(null);
      }
    } catch (err) {
      console.error('Market data fetch error:', err);
      if (!isUnmounted.current) {
        setError('Failed to fetch live data');
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isUnmounted.current = false;
    
    const initialTimeout = setTimeout(fetchMarketData, 500);
    const interval = setInterval(fetchMarketData, refreshInterval);
    
    return () => {
      isUnmounted.current = true;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [fetchMarketData, refreshInterval]);

  return { tickers, candles, loading, error, lastUpdate, refresh: fetchMarketData };
};

// =====================================================================================
// TICKER TAPE COMPONENT
// =====================================================================================

const TickerTape = memo(({ tickers, loading }: { tickers: TickerData[]; loading: boolean }) => {
  // Double the tickers for seamless infinite scroll
  const duplicatedTickers = [...tickers, ...tickers];

  return (
    <div className="relative overflow-hidden bg-black/40 backdrop-blur-sm border-b border-white/10">
      <div className="ticker-scroll flex items-center gap-8 py-2 px-4 whitespace-nowrap">
        {duplicatedTickers.map((ticker, index) => (
          <div
            key={`${ticker.symbol}-${index}`}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full transition-all",
              loading && "opacity-50"
            )}
          >
            <span className="text-xs font-semibold text-white/80">
              {ticker.symbol}
            </span>
            <span className="text-xs font-bold text-white">
              ${ticker.price}
            </span>
            <span
              className={cn(
                "text-xs font-semibold flex items-center gap-0.5",
                ticker.isUp ? "text-emerald-400" : "text-red-400"
              )}
            >
              {ticker.isUp ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {ticker.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
TickerTape.displayName = 'TickerTape';

// =====================================================================================
// CANDLESTICK BACKGROUND COMPONENT
// =====================================================================================

const CandlestickBackground = memo(({ 
  candles, 
  loading,
  position = "bottom"
}: { 
  candles: CandleData[]; 
  loading: boolean;
  position?: "bottom" | "right";
}) => {
  if (position === "right") {
    return (
      <div className="absolute top-0 right-0 bottom-0 w-24 hidden lg:flex flex-col items-center justify-center gap-2 opacity-20">
        {loading && (
          <div className="absolute inset-0 bg-gradient-to-l from-white/5 to-transparent animate-pulse" />
        )}
        {candles.slice(0, 6).map((candle) => (
          <div
            key={candle.id}
            className={cn(
              "flex items-center gap-0.5 ticker-candle transition-all duration-500",
              loading && "opacity-50"
            )}
            style={{ animationDelay: `${candle.delay}s` }}
          >
            {/* Horizontal candle */}
            <div
              className={cn(
                "h-0.5 rounded-full",
                candle.isGreen ? "bg-emerald-500" : "bg-red-500"
              )}
              style={{ width: candle.wickBottom }}
            />
            <div
              className={cn(
                "h-2 md:h-3 rounded-sm",
                candle.isGreen
                  ? "bg-emerald-500 shadow-emerald-500/50"
                  : "bg-red-500 shadow-red-500/50"
              )}
              style={{ width: candle.height / 2 }}
            />
            <div
              className={cn(
                "h-0.5 rounded-full",
                candle.isGreen ? "bg-emerald-500" : "bg-red-500"
              )}
              style={{ width: candle.wickTop }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 md:h-40 hidden sm:flex items-end justify-center gap-2 md:gap-3 opacity-15 sm:opacity-20 overflow-hidden pointer-events-none">
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      )}
      {candles.map((candle) => (
        <div
          key={candle.id}
          className={cn(
            "relative flex flex-col items-center ticker-candle transition-all duration-500",
            loading && "opacity-50"
          )}
          style={{ animationDelay: `${candle.delay}s` }}
        >
          <div
            className={cn(
              "w-0.5 rounded-full",
              candle.isGreen ? "bg-emerald-500" : "bg-red-500"
            )}
            style={{ height: candle.wickTop }}
          />
          <div
            className={cn(
              "w-2 md:w-3 rounded-sm shadow-lg",
              candle.isGreen
                ? "bg-emerald-500 shadow-emerald-500/50"
                : "bg-red-500 shadow-red-500/50"
            )}
            style={{ height: candle.height }}
          />
          <div
            className={cn(
              "w-0.5 rounded-full",
              candle.isGreen ? "bg-emerald-500" : "bg-red-500"
            )}
            style={{ height: candle.wickBottom }}
          />
        </div>
      ))}
      <div className="absolute bottom-4 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
});
CandlestickBackground.displayName = 'CandlestickBackground';

// =====================================================================================
// MAIN MARKET TICKER COMPONENT
// =====================================================================================

interface MarketTickerProps {
  showTape?: boolean;
  showCandles?: boolean;
  candlePosition?: "bottom" | "right";
  refreshInterval?: number;
  className?: string;
}

const MarketTicker = memo(({
  showTape = true,
  showCandles = true,
  candlePosition = "bottom",
  refreshInterval = 30000,
  className
}: MarketTickerProps) => {
  const { tickers, candles, loading, refresh } = useLiveMarketData(refreshInterval);
  const stylesInjected = useRef(false);

  // Inject styles once
  useEffect(() => {
    if (!stylesInjected.current) {
      const existingStyle = document.getElementById("ticker-animations");
      if (existingStyle) existingStyle.remove();

      const styleSheet = document.createElement("style");
      styleSheet.id = "ticker-animations";
      styleSheet.textContent = TICKER_STYLES;
      document.head.appendChild(styleSheet);
      stylesInjected.current = true;
    }

    return () => {
      const existingStyle = document.getElementById("ticker-animations");
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      {/* Ticker Tape - Fixed at top */}
      {showTape && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <TickerTape tickers={tickers} loading={loading} />
        </div>
      )}

      {/* Candlestick Background */}
      {showCandles && (
        <CandlestickBackground
          candles={candles}
          loading={loading}
          position={candlePosition}
        />
      )}
    </div>
  );
});
MarketTicker.displayName = 'MarketTicker';

export default MarketTicker;

// Also export sub-components for granular usage
export { TickerTape, CandlestickBackground };