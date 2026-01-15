import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// We can't throw here because it might break build if env vars are missing during build time
// Instead, we can export a function or check lazily, or just let it fail at runtime if used.
// For now, we'll keep it simple but safe.

export const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabase && process.env.NODE_ENV !== 'production') {
  console.warn('Supabase environment variables missing. Supabase client not initialized.');
}

export default supabase;
