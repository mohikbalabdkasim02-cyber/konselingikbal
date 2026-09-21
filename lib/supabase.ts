import { createClient } from "@supabase/supabase-js";

// Publishable credentials are intentionally safe for browser use.
// Data security is enforced by Supabase Auth + Row Level Security (RLS).
const supabaseUrl = "https://pmfmrybzdkfmmmsdlddj.supabase.co";
const supabasePublishableKey = "sb_publishable_a953yOUs9wPEmE_6L0q2mA_8kyqflUn";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const source = input instanceof Request ? input : null;
  const method = (init?.method ?? source?.method ?? "GET").toUpperCase();
  const headers = new Headers(source?.headers ?? undefined);
  new Headers(init?.headers ?? undefined).forEach((value, key) => headers.set(key, value));

  // Only retry read-only requests here. Retrying a Request that contains a File/Blob
  // body can reuse an already-consumed stream in some browsers and produce a false
  // "Failed to fetch" even when the network has recovered. Storage uploads have their
  // own retry loop in lib/upload.ts, which recreates the request body on every attempt.
  const retryable = method === "GET" || method === "HEAD";
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
