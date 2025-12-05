-- Enable Row Level Security on all tables
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for now
-- (These will be updated when authentication is added)

-- Strategies policies
CREATE POLICY "Allow public read access to strategies"
  ON public.strategies FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to strategies"
  ON public.strategies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to strategies"
  ON public.strategies FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete from strategies"
  ON public.strategies FOR DELETE
  USING (true);

-- Trades policies
CREATE POLICY "Allow public read access to trades"
  ON public.trades FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to trades"
  ON public.trades FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to trades"
  ON public.trades FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete from trades"
  ON public.trades FOR DELETE
  USING (true);

-- Habits policies
CREATE POLICY "Allow public read access to habits"
  ON public.habits FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to habits"
  ON public.habits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to habits"
  ON public.habits FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete from habits"
  ON public.habits FOR DELETE
  USING (true);