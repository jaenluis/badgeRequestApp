// js/supabaseClient.js

// ✅ Import Supabase client library
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// ✅ Your Supabase project URL + anon key (replace with your values)
const SUPABASE_URL = "https://iuewzlxrztalslbjpjut.supabase.co";   // 🔹 from settings
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZXd6bHhyenRhbHNsYmpwanV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzY3MDcsImV4cCI6MjA3NDkxMjcwN30.0npDTdOa-vJfFIiAX15BKnuGnkhc9y2cWwaRMhhpQK8";                // 🔹 from settings

// ✅ Export client instance so app.js can use it
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
