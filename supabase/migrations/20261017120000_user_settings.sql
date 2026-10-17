-- Per-user settings (reference number of servings for the quick toggle on recipes).
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY DEFAULT auth.uid(),
  reference_servings INTEGER NOT NULL DEFAULT 9 CHECK (reference_servings BETWEEN 1 AND 99),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
