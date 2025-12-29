import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Supabase JS v2 via CDN (loaded in HTML)
export const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  }
);

export function requireConfig() {
  if (!SUPABASE_URL.includes('supabase.co') || SUPABASE_ANON_KEY.includes('YOUR_')) {
    throw new Error('Vul eerst SUPABASE_URL en SUPABASE_ANON_KEY in js/config.js');
  }
}
