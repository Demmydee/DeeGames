import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Database operations will fail.');
}

// Use service role key for backend operations to bypass RLS
// We use a dedicated admin client to avoid session cross-talk
// IMPORTANT: Never call auth.signIn... or auth.setSession on this client
export const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Separate client for auth operations to prevent session cross-talk
// This client will be used for signIn/signUp which sets internal state
export const createAuthClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const supabaseAuth = createAuthClient();

// Helper to create a client with a specific user's token
// This is useful for respecting RLS on the backend without session cross-talk
export const createClientWithToken = (token: string) => {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
  return client;
};
