-- Create consultations table
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    patient_text TEXT NOT NULL,
    doctor_response TEXT,
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'urgent')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create consultation_images table
CREATE TABLE IF NOT EXISTS public.consultation_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image/jpeg',
    original_filename TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create consultation_audios table
CREATE TABLE IF NOT EXISTS public.consultation_audios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'audio/mp3',
    original_filename TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create consultation_reports table
CREATE TABLE IF NOT EXISTS public.consultation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    storage_key TEXT,
    storage_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON public.consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON public.consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_severity ON public.consultations(severity);
CREATE INDEX IF NOT EXISTS idx_consultation_images_consultation_id ON public.consultation_images(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_audios_consultation_id ON public.consultation_audios(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_reports_consultation_id ON public.consultation_reports(consultation_id);

-- Enable RLS
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_audios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_reports ENABLE ROW LEVEL SECURITY;

-- RLS: consultations - users can only see their own
CREATE POLICY "Users can view own consultations"
    ON public.consultations
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.user_profiles WHERE id = user_id
        )
    );

CREATE POLICY "Users can insert own consultations"
    ON public.consultations
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_user_id FROM public.user_profiles WHERE id = user_id
        )
    );

CREATE POLICY "Users can update own consultations"
    ON public.consultations
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.user_profiles WHERE id = user_id
        )
    );

CREATE POLICY "Users can delete own consultations"
    ON public.consultations
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.user_profiles WHERE id = user_id
        )
    );

-- RLS: consultation_images (same pattern)
CREATE POLICY "Users can view own consultation images"
    ON public.consultation_images
    FOR SELECT
    USING (
        consultation_id IN (
            SELECT c.id FROM public.consultations c
            JOIN public.user_profiles up ON up.id = c.user_id
            WHERE up.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own consultation images"
    ON public.consultation_images
    FOR INSERT
    WITH CHECK (
        consultation_id IN (
            SELECT c.id FROM public.consultations c
            JOIN public.user_profiles up ON up.id = c.user_id
            WHERE up.auth_user_id = auth.uid()
        )
    );

-- RLS: consultation_audios (same pattern)
CREATE POLICY "Users can view own consultation audios"
    ON public.consultation_audios
    FOR SELECT
    USING (
        consultation_id IN (
            SELECT c.id FROM public.consultations c
            JOIN public.user_profiles up ON up.id = c.user_id
            WHERE up.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own consultation audios"
    ON public.consultation_audios
    FOR INSERT
    WITH CHECK (
        consultation_id IN (
            SELECT c.id FROM public.consultations c
            JOIN public.user_profiles up ON up.id = c.user_id
            WHERE up.auth_user_id = auth.uid()
        )
    );

-- RLS: consultation_reports (same pattern)
CREATE POLICY "Users can view own consultation reports"
    ON public.consultation_reports
    FOR SELECT
    USING (
        consultation_id IN (
            SELECT c.id FROM public.consultations c
            JOIN public.user_profiles up ON up.id = c.user_id
            WHERE up.auth_user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON public.consultations TO authenticated;
GRANT ALL ON public.consultation_images TO authenticated;
GRANT ALL ON public.consultation_audios TO authenticated;
GRANT ALL ON public.consultation_reports TO authenticated;
