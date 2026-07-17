-- RLS policy for consultation-media bucket
-- Objects are stored as: {auth_user_id}/{consultation_id}/{filename}
CREATE POLICY "Users can view own consultation media"
    ON storage.objects
    FOR SELECT
    USING (
        bucket = 'consultation-media'
        AND uploaded_by = auth.uid()::text
    );

CREATE POLICY "Users can upload consultation media"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket = 'consultation-media'
        AND uploaded_by = auth.uid()::text
    );

CREATE POLICY "Users can delete own consultation media"
    ON storage.objects
    FOR DELETE
    USING (
        bucket = 'consultation-media'
        AND uploaded_by = auth.uid()::text
    );

-- RLS policy for consultation-reports bucket
CREATE POLICY "Users can view own consultation reports"
    ON storage.objects
    FOR SELECT
    USING (
        bucket = 'consultation-reports'
        AND uploaded_by = auth.uid()::text
    );
