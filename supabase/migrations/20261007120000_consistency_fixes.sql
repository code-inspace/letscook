-- Consistency fixes (servings defaults, rating, shared ingredient catalog,
-- cross-device shopping exclusions, unused table).

-- 1. One default number of servings everywhere (the app uses 6)
ALTER TABLE public.recipes ALTER COLUMN servings_base SET DEFAULT 6;
ALTER TABLE public.meal_plans ALTER COLUMN servings SET DEFAULT 6;

-- 2. Rating is the user's own rating: 0 = not rated yet
ALTER TABLE public.recipes ALTER COLUMN rating SET DEFAULT 0;

-- 3. The shared ingredient catalog was read-only for everyone, so every upsert
--    from the app (recipe save, custom shopping item) was silently rejected.
DROP POLICY IF EXISTS "Authenticated users can add ingredients" ON public.ingredients;
CREATE POLICY "Authenticated users can add ingredients" ON public.ingredients
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update ingredients" ON public.ingredients;
CREATE POLICY "Authenticated users can update ingredients" ON public.ingredients
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 4. Ingredients removed from the shopping list ("<meal_plan_id>_<ingredient>")
--    were only stored in the browser and came back on other devices.
CREATE TABLE IF NOT EXISTS public.shopping_exclusions (
  user_id UUID NOT NULL DEFAULT auth.uid(),
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, key)
);

ALTER TABLE public.shopping_exclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own shopping exclusions" ON public.shopping_exclusions;
CREATE POLICY "Users can manage own shopping exclusions" ON public.shopping_exclusions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Never written by the app (ingredients live encrypted inside each recipe)
DROP TABLE IF EXISTS public.recipe_ingredients;
