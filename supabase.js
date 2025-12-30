// supabase.js
const SUPABASE_URL = "https://wjvleduvvjjseunakmcb.supabase.co";
const SUPABASE_ANON_KEY = "";

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

console.log("✅ supabase.js geladen", window.sb);
