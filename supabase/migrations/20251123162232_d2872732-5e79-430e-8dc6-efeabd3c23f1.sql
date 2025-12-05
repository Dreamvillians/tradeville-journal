-- Create enums for the trading journal system
CREATE TYPE subscription_plan AS ENUM ('FREE', 'PRO');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'TRIALING', 'CANCELED', 'PAST_DUE');
CREATE TYPE trade_direction AS ENUM ('LONG', 'SHORT');
CREATE TYPE trade_source AS ENUM ('MANUAL', 'IMPORT');
CREATE TYPE trade_image_type AS ENUM ('BEFORE', 'AFTER', 'OTHER');
CREATE TYPE tag_type AS ENUM ('EMOTION', 'CONDITION', 'OTHER');
CREATE TYPE goal_category AS ENUM ('TRADING', 'HEALTH', 'PERSONAL', 'OTHER');
CREATE TYPE goal_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE import_source AS ENUM ('MT4', 'MT5', 'CTRADER', 'TRADINGVIEW', 'GENERIC');
CREATE TYPE import_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE ai_summary_type AS ENUM ('WEEKLY', 'TRADE');

-- Create users table (extends auth.users with additional profile data)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  timezone TEXT DEFAULT 'UTC',
  base_currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan subscription_plan DEFAULT 'FREE',
  status subscription_status DEFAULT 'ACTIVE',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  broker_name TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update strategies table to include user_id
ALTER TABLE public.strategies 
  ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN markets JSONB,
  ADD COLUMN timeframes JSONB,
  ADD COLUMN checklist JSONB,
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Drop existing trades table and recreate with full schema
DROP TABLE IF EXISTS public.trades CASCADE;
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  instrument TEXT NOT NULL,
  direction trade_direction NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  stop_loss DECIMAL(20, 8),
  take_profit DECIMAL(20, 8),
  exit_price DECIMAL(20, 8),
  position_size DECIMAL(20, 8),
  risk_amount DECIMAL(20, 2),
  reward_amount DECIMAL(20, 2),
  profit_loss_currency DECIMAL(20, 2),
  profit_loss_r DECIMAL(10, 2),
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  holding_minutes INTEGER,
  session TEXT,
  market_condition TEXT,
  execution_rating INTEGER CHECK (execution_rating >= 0 AND execution_rating <= 5),
  follow_plan BOOLEAN DEFAULT true,
  notes TEXT,
  source trade_source DEFAULT 'MANUAL',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trade_images table
CREATE TABLE public.trade_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type trade_image_type DEFAULT 'OTHER',
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type tag_type,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create trade_tags junction table
CREATE TABLE public.trade_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trade_id, tag_id)
);

-- Create goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category goal_category DEFAULT 'OTHER',
  description TEXT,
  target_metric TEXT,
  due_date TIMESTAMPTZ,
  status goal_status DEFAULT 'NOT_STARTED',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update habits table to include user_id and more fields
ALTER TABLE public.habits
  ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN name TEXT,
  ADD COLUMN description TEXT,
  ADD COLUMN schedule JSONB,
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Create habit_logs table
CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, date)
);

-- Create notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create weekly_reviews table
CREATE TABLE public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  went_well TEXT,
  didnt_go_well TEXT,
  lessons TEXT,
  focus_next_week TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Create import_jobs table
CREATE TABLE public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  source import_source NOT NULL,
  status import_status DEFAULT 'PENDING',
  raw_file_url TEXT,
  logs TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ai_summaries table
CREATE TABLE public.ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type ai_summary_type NOT NULL,
  target_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_strategies_user_id ON public.strategies(user_id);
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_account_id ON public.trades(account_id);
CREATE INDEX idx_trades_strategy_id ON public.trades(strategy_id);
CREATE INDEX idx_trades_opened_at ON public.trades(opened_at DESC);
CREATE INDEX idx_trade_images_trade_id ON public.trade_images(trade_id);
CREATE INDEX idx_trade_images_user_id ON public.trade_images(user_id);
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_trade_tags_trade_id ON public.trade_tags(trade_id);
CREATE INDEX idx_trade_tags_tag_id ON public.trade_tags(tag_id);
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX idx_habit_logs_date ON public.habit_logs(date DESC);
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_weekly_reviews_user_id ON public.weekly_reviews(user_id);
CREATE INDEX idx_weekly_reviews_week_start ON public.weekly_reviews(week_start_date DESC);
CREATE INDEX idx_import_jobs_user_id ON public.import_jobs(user_id);
CREATE INDEX idx_ai_summaries_user_id ON public.ai_summaries(user_id);

-- Create trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_reviews_updated_at BEFORE UPDATE ON public.weekly_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_jobs_updated_at BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();