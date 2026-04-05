-- SQL Schema for DeeGames Phase 1
-- To be run in Supabase SQL Editor

-- Enable pgcrypto for gen_random_uuid() if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop existing table to ensure clean slate (WARNING: This deletes existing user data in public.users)
DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table linked to Supabase Auth
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    is_adult_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- Future proofing fields
    wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
    kyc_status TEXT DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.users (
        id, 
        username, 
        email, 
        phone, 
        is_adult_confirmed, 
        terms_accepted, 
        terms_accepted_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
        COALESCE((NEW.raw_user_meta_data->>'isAdultConfirmed')::boolean, false),
        COALESCE((NEW.raw_user_meta_data->>'termsAccepted')::boolean, false),
        NOW()
    );
    RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC Function to check uniqueness (needed for anon key backend)
CREATE OR REPLACE FUNCTION public.check_user_uniqueness(p_username TEXT, p_email TEXT, p_phone TEXT)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'username_exists', EXISTS(SELECT 1 FROM public.users WHERE LOWER(username) = LOWER(p_username)),
        'email_exists', EXISTS(SELECT 1 FROM public.users WHERE LOWER(email) = LOWER(p_email)),
        'phone_exists', EXISTS(SELECT 1 FROM public.users WHERE phone = p_phone AND p_phone IS NOT NULL)
    ) INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC Function to get email by username (needed for login with username using anon key)
CREATE OR REPLACE FUNCTION public.get_user_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_email text;
BEGIN
    SELECT u.email
    INTO v_email
    FROM public.users u
    WHERE LOWER(u.username) = LOWER(p_username)
    LIMIT 1;

    RETURN v_email;
END;
$$;
