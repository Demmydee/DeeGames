-- Phase 6: Admin Panel Schema Migration

-- 1. Create admin_users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'super_admin', -- super_admin, finance_admin, moderation_admin, support_admin
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL
);

-- Case-insensitive index for email
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email_lower ON public.admin_users (LOWER(email));

-- 2. Create admin_audit_logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    action_type TEXT NOT NULL, -- e.g., user_suspended, withdrawal_completed
    resource_type TEXT NOT NULL, -- user, withdrawal, deposit, match, report, ticket, admin, setting
    resource_id UUID NULL,
    description TEXT NOT NULL,
    before_value JSONB NULL,
    after_value JSONB NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for log filters
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON public.admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource ON public.admin_audit_logs(resource_type, resource_id);

-- 3. Extend existing users table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='is_suspended') THEN
        ALTER TABLE public.users ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='is_banned') THEN
        ALTER TABLE public.users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='suspension_reason') THEN
        ALTER TABLE public.users ADD COLUMN suspension_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='suspension_expires_at') THEN
        ALTER TABLE public.users ADD COLUMN suspension_expires_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='ban_reason') THEN
        ALTER TABLE public.users ADD COLUMN ban_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='banned_at') THEN
        ALTER TABLE public.users ADD COLUMN banned_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='kyc_rejection_reason') THEN
        ALTER TABLE public.users ADD COLUMN kyc_rejection_reason TEXT;
    END IF;
END $$;

-- 4. Extend withdrawals table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='withdrawals' AND column_name='admin_note') THEN
        ALTER TABLE public.withdrawals ADD COLUMN admin_note TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='withdrawals' AND column_name='processed_by_admin_id') THEN
        ALTER TABLE public.withdrawals ADD COLUMN processed_by_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Extend player_reports table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='player_reports' AND column_name='reviewed_by_admin_id') THEN
        ALTER TABLE public.player_reports ADD COLUMN reviewed_by_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='player_reports' AND column_name='reviewed_at') THEN
        ALTER TABLE public.player_reports ADD COLUMN reviewed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='player_reports' AND column_name='admin_action') THEN
        ALTER TABLE public.player_reports ADD COLUMN admin_action TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='player_reports' AND column_name='resolution_note') THEN
        ALTER TABLE public.player_reports ADD COLUMN resolution_note TEXT;
    END IF;
END $$;

-- 6. Extend support_tickets table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_tickets' AND column_name='assigned_to_admin_id') THEN
        ALTER TABLE public.support_tickets ADD COLUMN assigned_to_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_tickets' AND column_name='admin_reply') THEN
        ALTER TABLE public.support_tickets ADD COLUMN admin_reply TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_tickets' AND column_name='replied_at') THEN
        ALTER TABLE public.support_tickets ADD COLUMN replied_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_tickets' AND column_name='resolved_by_admin_id') THEN
        ALTER TABLE public.support_tickets ADD COLUMN resolved_by_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_tickets' AND column_name='resolved_at') THEN
        ALTER TABLE public.support_tickets ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;
END $$;

-- 7. Disable Row Level Security on admin tables for simplicity and backend oversight,
-- or enable and set policies allowing administrative access.
-- We keep them accessible via our system API (which uses Service Role bypass)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: No RLS Policies target anon or authenticated player roles for safety. 
-- Only service role (bypassing RLS) will query them.
