-- Create encrypted recipes table
CREATE TABLE IF NOT EXISTS public.recipes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT DEFAULT 'Main Dishes',
  image_url TEXT,
  prep_time_minutes INTEGER DEFAULT 30,
  difficulty TEXT DEFAULT 'Easy',
  rating NUMERIC(3,2) DEFAULT 5.0,
  servings_base INTEGER DEFAULT 4,
  spice_level TEXT,
  utensils JSONB DEFAULT '[]'::jsonb,
  nutrition JSONB DEFAULT '{}'::jsonb,
  allergens JSONB DEFAULT '[]'::jsonb,
  ingredients TEXT NOT NULL,
  steps TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Allow read & write access
CREATE POLICY "Allow all operations on recipes"
  ON public.recipes
  FOR ALL
  USING (true)
  WITH CHECK (true);
