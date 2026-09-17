import { createClient } from "@supabase/supabase-js";

// Publishable credentials are intentionally safe for browser use.
// Data security is enforced by Supabase Auth + Row Level Security (RLS).
const supabaseUrl = "https://pmfmrybzdkfmmmsdlddj.supabase.co";
const supabasePublishableKey = "sb_publishable_a953yOUs9wPEmE_6L0q2mA_8kyqflUn";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const source = input instanceof Request ? input : null;
  const url = source?.url ?? String(input);
  const method = (init?.method ?? source?.method ?? "GET").toUpperCase();
  const headers = new Headers(source?.headers ?? undefined);
  new Headers(init?.headers ?? undefined).forEach((value, key) => headers.set(key, value));

  // Proposal paths are unique per version. Making object uploads idempotent prevents
  // a transient network retry from failing because the first request actually arrived.
  if (url.includes("/storage/v1/object/") && (method === "POST" || method === "PUT")) {
    headers.set("x-upsert", "true");
  }

  const retryable = method === "GET" || method === "HEAD" || url.includes("/storage/v1/object/");
  const maxAttempts = retryable ? 3 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(input, { ...init, headers });
      if (retryable && response.status >= 500 && attempt < maxAttempts) {
        await sleep(500 * attempt);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(650 * attempt);
        continue;
      }
    }
  }

  const detail = lastError instanceof Error ? lastError.message : "network error";
  throw new Error(`Koneksi ke server terputus. Periksa internet lalu coba lagi. (${detail})`);
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: resilientFetch,
  },
});
