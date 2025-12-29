-- GRANT FULL ADMIN ACCESS TO SPECIFIC USER
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    v_target_email TEXT := 'hingkicandra@gmail.com';
    v_user_id UUID;
    v_koperasi_id UUID;
BEGIN
    -- 1. Find User ID
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = v_target_email;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User % not found! Please ensure they have signed up.', v_target_email;
        RETURN;
    END IF;

    -- 2. Find Koperasi ID (Default to the first one found)
    SELECT id INTO v_koperasi_id 
    FROM public.koperasi 
    LIMIT 1;

    IF v_koperasi_id IS NULL THEN
        RAISE NOTICE 'No Koperasi found in database!';
        RETURN;
    END IF;

    -- 3. Grant 'admin' role
    -- Check if already exists to avoid duplicates
    IF EXISTS (
        SELECT 1 FROM public.user_role 
        WHERE user_id = v_user_id 
        AND koperasi_id = v_koperasi_id 
        AND role = 'admin'
    ) THEN
        UPDATE public.user_role
        SET is_active = true, deleted_at = NULL
        WHERE user_id = v_user_id AND koperasi_id = v_koperasi_id AND role = 'admin';
        RAISE NOTICE 'User % already has Admin role. Activated it.', v_target_email;
    ELSE
        INSERT INTO public.user_role (koperasi_id, user_id, role, is_active)
        VALUES (v_koperasi_id, v_user_id, 'admin', true);
        RAISE NOTICE 'SUCCESS: Granted Admin access to %', v_target_email;
    END IF;

    -- 4. Also grant 'pengurus' and 'bendahara' just in case some features check specifically for those
    -- (Though usually Admin covers all, explicit roles can help legacy checks)
    
    -- Grant Pengurus
    IF NOT EXISTS (SELECT 1 FROM public.user_role WHERE user_id = v_user_id AND role = 'pengurus') THEN
        INSERT INTO public.user_role (koperasi_id, user_id, role, is_active)
        VALUES (v_koperasi_id, v_user_id, 'pengurus', true);
    END IF;

    -- Grant Bendahara
    IF NOT EXISTS (SELECT 1 FROM public.user_role WHERE user_id = v_user_id AND role = 'bendahara') THEN
        INSERT INTO public.user_role (koperasi_id, user_id, role, is_active)
        VALUES (v_koperasi_id, v_user_id, 'bendahara', true);
    END IF;

END $$;
