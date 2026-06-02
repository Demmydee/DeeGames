import { supabase } from '../config/supabase';
import bcrypt from 'bcryptjs';

export class AdminDbInitService {
  static async init() {
    console.log('[AdminDbInitService] Checking and running schema enhancements if needed...');
    try {
      // 1. Create table admin_users if it doesn't exist
      try {
        await supabase.rpc('admin_execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS public.admin_users (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              name TEXT NOT NULL,
              role TEXT NOT NULL DEFAULT 'super_admin',
              is_active BOOLEAN NOT NULL DEFAULT TRUE,
              last_login_at TIMESTAMPTZ,
              login_attempts INTEGER NOT NULL DEFAULT 0,
              locked_until TIMESTAMPTZ,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              created_by_admin_id UUID
            );
          `
        });
      } catch (err) {
        // Ignored fallback
      }

      // 2. We'll run the direct columns extensions using postgres block.
      // Wait, since we don't always have a custom RPC named 'admin_execute_sql', 
      // let's do safe SELECT queries via supabase JS client, or check columns, 
      // or implement fallback queries. If 'admin_execute_sql' RPC is not registered, 
      // we can also create the admin_users table programmatically if we have access, 
      // or assume the user has run the migration or let the backend do basic queries.
      // Let's check if we can insert directly into 'admin_users'
      const { error: selectError } = await supabase
        .from('admin_users')
        .select('count')
        .limit(1);

      if (selectError && selectError.message.includes('does not exist')) {
        console.warn('[AdminDbInitService] Table admin_users does not exist. Migrations might not be fully applied. Attempting to create or continuing...');
      }

      // 3. Seed initial admin user if empty
      const { data: admins, error: countError } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1);

      if (!countError && (!admins || admins.length === 0)) {
        const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@deegames.com';
        const defaultPw = process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe123!';
        const hashedPassword = await bcrypt.hash(defaultPw, 10);

        console.log(`[AdminDbInitService] Seeding default administrator account: ${defaultEmail}`);
        
        const { error: insertError } = await supabase
          .from('admin_users')
          .insert({
            email: defaultEmail.toLowerCase(),
            password_hash: hashedPassword,
            name: 'Super Admin',
            role: 'super_admin',
            is_active: true
          });

        if (insertError) {
          console.error('[AdminDbInitService] Failed to seed default admin:', insertError);
        } else {
          console.log('[AdminDbInitService] Default admin seeded successfully!');
        }
      } else {
        console.log('[AdminDbInitService] Admin table already initialized or skipped.');
      }
    } catch (e) {
      console.error('[AdminDbInitService] Setup warning:', e);
    }
  }
}
