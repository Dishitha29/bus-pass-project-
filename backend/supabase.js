const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Supabase credentials are missing. Add them to backend/.env before starting the application.");
}

const supabase = createClient(
  process.env.SUPABASE_URL || "https://example.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "missing-server-key",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = supabase;
