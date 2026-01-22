import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Safe initialization - won't crash during build if env vars are missing
export const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabase && process.env.NODE_ENV === 'development') {
  console.warn('⚠️  Supabase environment variables missing. Supabase client not initialized.');
}

export default supabase;
