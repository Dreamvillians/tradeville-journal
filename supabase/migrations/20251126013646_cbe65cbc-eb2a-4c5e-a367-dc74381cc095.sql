-- Add image_url columns to goals and habits tables for vision board functionality
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.goals.image_url IS 'URL or path to inspirational image for the goal';
COMMENT ON COLUMN public.habits.image_url IS 'URL or path to image representing the habit';