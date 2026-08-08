-- Add scan_results table to persist AI scanner output (skin profile, detections, score, products)
CREATE TABLE IF NOT EXISTS public.scan_results (
    scan_id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    skin_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    detections JSONB NOT NULL DEFAULT '[]'::jsonb,
    skin_score NUMERIC(4,1),
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'urgent')),
    explanation TEXT,
    treatment TEXT,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    products JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_url TEXT,
    audio_url TEXT,
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_results_user ON public.scan_results(user_id, created_at DESC);

ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scan results"
    ON public.scan_results
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.user_profiles WHERE id = user_id
        )
    );

CREATE POLICY "Users can insert own scan results"
    ON public.scan_results
    FOR INSERT
    WITH CHECK (
        user_id IS NULL OR
        auth.uid() IN (
            SELECT auth_user_id FROM public.user_profiles WHERE id = user_id
        )
    );

GRANT ALL ON public.scan_results TO authenticated;