// supabase.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const sb = createClient(
    "https://wjvleduvvjjseunakmcb.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdmxlZHV2dmpqc2V1bmFrbWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDU0NzYsImV4cCI6MjA4MjUyMTQ3Nn0.9GzBjksztdM4SFw_BcAVKl3gwEzBN0jqNhztQ9m9uj0",
  {
    auth: {
      persistSession: false
    }
  }
);