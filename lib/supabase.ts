import { createClient } from "@supabase/supabase-js";

// Publishable credentials are intentionally safe for browser use.
// Data security is enforced by Supabase Auth + Row Level Security (RLS).
const supabaseUrl = "https://pmfmrybzdkfmmmsdlddj.supabase.co";
const supabasePublishableKey = "sb_publishable_a953yOUs9wPEmE_6L0q2mA_8kyqflUn";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
