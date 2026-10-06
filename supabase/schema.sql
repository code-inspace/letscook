-- =========================================================================
-- Schéma Base de Données Supabase (PostgreSQL) pour Let's Cook
-- =========================================================================

-- 1. Table des Recettes Chiffrées (AES-256)
CREATE TABLE IF NOT EXISTS public.recipes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT DEFAULT 'Main Dishes',
  image_url TEXT,
  prep_time_minutes INTEGER DEFAULT 30,
  difficulty TEXT DEFAULT 'Easy',
  rating NUMERIC(3,1) DEFAULT 5.0,
  servings_base INTEGER DEFAULT 2,
  spice_level TEXT,
  utensils JSONB DEFAULT '[]'::jsonb,
  nutrition JSONB,
  allergens JSONB DEFAULT '[]'::jsonb,
  ingredients TEXT NOT NULL, -- JSON chiffré AES-256
  steps TEXT NOT NULL,       -- JSON chiffré AES-256
  source_url TEXT,           -- Lien d'origine (Marmiton, 750g, etc.)
  video_url TEXT,            -- Lien de la vidéo (Instagram Reel, TikTok, YouTube Shorts...)
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);

-- 2. Table du Planning de Repas (Calendrier)
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id TEXT NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  recipe_title TEXT NOT NULL,
  recipe_image_url TEXT,
  date TEXT NOT NULL, -- Format: YYYY-MM-DD
  meal_type TEXT DEFAULT 'dinner' NOT NULL, -- lunch, dinner, breakfast, snack
  servings INTEGER DEFAULT 2,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON public.meal_plans(user_id, date);

-- 3. Table de la Liste de Courses
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(8,2),
  unit TEXT,
  checked BOOLEAN DEFAULT false NOT NULL,
  is_custom BOOLEAN DEFAULT false NOT NULL,
  recipe_id TEXT,
  recipe_title TEXT,
  meal_plan_id TEXT REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_plan_date TEXT,
  category TEXT DEFAULT 'Articles divers',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_user ON public.shopping_items(user_id, checked);

-- 4. Table des Ingrédients Génériques
CREATE TABLE IF NOT EXISTS public.ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'Articles divers',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Table de Jonction Recettes - Ingrédients
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  recipe_id TEXT NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (recipe_id, ingredient_id)
);

-- 6. Activer le Row Level Security (RLS) pour la sécurité des données
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité (Chaque utilisateur ne peut accéder qu'à ses propres données)
CREATE POLICY "Users can manage own recipes" ON public.recipes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own meal plans" ON public.meal_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own shopping items" ON public.shopping_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public ingredients read access" ON public.ingredients
  FOR SELECT USING (true);

CREATE POLICY "Public recipe ingredients read access" ON public.recipe_ingredients
  FOR SELECT USING (true);

