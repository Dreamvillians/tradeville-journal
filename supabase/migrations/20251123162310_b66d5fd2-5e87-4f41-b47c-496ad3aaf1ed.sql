-- Fix the update function to have proper search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Enable Row Level Security on all new tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies for users table (users can read/update their own profile)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for subscriptions table
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for accounts table
CREATE POLICY "Users can view own accounts" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own accounts" ON public.accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON public.accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts" ON public.accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for strategies table
CREATE POLICY "Users can view own strategies" ON public.strategies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own strategies" ON public.strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies" ON public.strategies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies" ON public.strategies
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for trades table
CREATE POLICY "Users can view own trades" ON public.trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON public.trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON public.trades
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for trade_images table
CREATE POLICY "Users can view own trade images" ON public.trade_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trade images" ON public.trade_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trade images" ON public.trade_images
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for tags table
CREATE POLICY "Users can view own tags" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tags" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON public.tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON public.tags
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for trade_tags table (through trade ownership)
CREATE POLICY "Users can view own trade tags" ON public.trade_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trades 
      WHERE trades.id = trade_tags.trade_id 
      AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own trade tags" ON public.trade_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trades 
      WHERE trades.id = trade_tags.trade_id 
      AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own trade tags" ON public.trade_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.trades 
      WHERE trades.id = trade_tags.trade_id 
      AND trades.user_id = auth.uid()
    )
  );

-- Create policies for goals table
CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for habits table
CREATE POLICY "Users can view own habits" ON public.habits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own habits" ON public.habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits" ON public.habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits" ON public.habits
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for habit_logs table (through habit ownership)
CREATE POLICY "Users can view own habit logs" ON public.habit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.habits 
      WHERE habits.id = habit_logs.habit_id 
      AND habits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own habit logs" ON public.habit_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.habits 
      WHERE habits.id = habit_logs.habit_id 
      AND habits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own habit logs" ON public.habit_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.habits 
      WHERE habits.id = habit_logs.habit_id 
      AND habits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own habit logs" ON public.habit_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.habits 
      WHERE habits.id = habit_logs.habit_id 
      AND habits.user_id = auth.uid()
    )
  );

-- Create policies for notes table
CREATE POLICY "Users can view own notes" ON public.notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON public.notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON public.notes
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for weekly_reviews table
CREATE POLICY "Users can view own weekly reviews" ON public.weekly_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own weekly reviews" ON public.weekly_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly reviews" ON public.weekly_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly reviews" ON public.weekly_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for import_jobs table
CREATE POLICY "Users can view own import jobs" ON public.import_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own import jobs" ON public.import_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own import jobs" ON public.import_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for ai_summaries table
CREATE POLICY "Users can view own ai summaries" ON public.ai_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ai summaries" ON public.ai_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);