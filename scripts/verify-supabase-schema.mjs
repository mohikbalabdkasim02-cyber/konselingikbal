import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const requiredTables = [
  "assessment_definitions",
  "assessment_attempts",
  "assessment_answers",
  "assessment_action_plans",
  "assessment_reviews",
  "need_signals",
  "consultation_requests",
  "student_auth_links",
  "career_profiles",
  "career_self_profiles",
  "student_career_choices",
  "career_comparisons",
  "career_comparison_items",
  "career_portfolio_items",
];

const missing = [];
const failures = [];

for (const table of requiredTables) {
  const { error } = await supabase.from(table).select("*", { head: true, count: "exact" }).limit(1);
  if (!error) {
    console.log(`✓ ${table}`);
    continue;
  }

  const message = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if (message.includes("pgrst205") || message.includes("could not find the table") || (message.includes("relation") && message.includes("does not exist"))) {
    missing.push(table);
    console.error(`✗ ${table}: table missing`);
  } else {
    failures.push({ table, error });
    console.error(`✗ ${table}: ${error.code ?? "error"} ${error.message ?? "unknown error"}`);
  }
}

if (missing.length || failures.length) {
  console.error("\nSupabase V2 schema verification failed.");
  if (missing.length) console.error(`Missing tables: ${missing.join(", ")}`);
  if (failures.length) console.error(`Other query failures: ${failures.map((x) => x.table).join(", ")}`);
  process.exit(1);
}

console.log(`\nSupabase V2 schema verified: ${requiredTables.length} required tables are reachable.`);
