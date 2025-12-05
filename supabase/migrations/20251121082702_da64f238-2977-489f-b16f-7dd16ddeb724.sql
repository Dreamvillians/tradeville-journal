-- Create strategies table
CREATE TABLE public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create trades table
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('Long', 'Short')),
  status TEXT NOT NULL CHECK (status IN ('Win', 'Loss', 'BreakEven')),
  entry_price FLOAT NOT NULL,
  exit_price FLOAT,
  pnl FLOAT,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  image_before_url TEXT,
  image_after_url TEXT,
  emotion_rating INTEGER CHECK (emotion_rating >= 1 AND emotion_rating <= 10),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create habits table
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  meditated BOOLEAN DEFAULT false,
  exercised BOOLEAN DEFAULT false,
  journaled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_trades_date ON public.trades(date DESC);
CREATE INDEX idx_trades_strategy ON public.trades(strategy_id);
CREATE INDEX idx_habits_date ON public.habits(date DESC);