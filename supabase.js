// ================================
// Supabase client init
// Vul je eigen project URL + anon key in
// ================================
const SUPABASE_URL = "https://wjvleduvvjjseunakmcb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdmxlZHV2dmpqc2V1bmFrbWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDU0NzYsImV4cCI6MjA4MjUyMTQ3Nn0.9GzBjksztdM4SFw_BcAVKl3gwEzBN0jqNhztQ9m9uj0";

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false } // simpel: geen login nodig
});
