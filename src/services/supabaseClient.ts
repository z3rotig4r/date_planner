import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * .env.local 설정 가이드:
 * 
 * VITE_SUPABASE_URL=your_project_url
 * VITE_SUPABASE_ANON_KEY=your_anon_public_key
 */
