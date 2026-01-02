-- Function to safely increment document sequence
CREATE OR REPLACE FUNCTION increment_document_sequence(
    p_koperasi_id UUID,
    p_type TEXT,
    p_year INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    new_val INTEGER;
BEGIN
    INSERT INTO public.document_sequences (koperasi_id, type, year, current_value)
    VALUES (p_koperasi_id, p_type, p_year, 1)
    ON CONFLICT (koperasi_id, type, year)
    DO UPDATE SET 
        current_value = document_sequences.current_value + 1,
        updated_at = NOW()
    RETURNING current_value INTO new_val;
    
    RETURN new_val;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_document_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION increment_document_sequence TO service_role;
