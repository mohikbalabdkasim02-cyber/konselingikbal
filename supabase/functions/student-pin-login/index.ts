import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function makePassword() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}-Aa1!`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ code: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const { student_id, pin } = await req.json();
    if (typeof student_id !== "string" || typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
      return json({ code: "INVALID" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) return json({ code: "SERVER_CONFIG" }, 500);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: verifyData, error: verifyError } = await admin.rpc("verify_student_pin_login", {
      p_student_id: student_id,
      p_pin: pin,
    });
    if (verifyError) return json({ code: "LOGIN_UNAVAILABLE" }, 500);

    const verify = Array.isArray(verifyData) ? verifyData[0] : verifyData;
    if (!verify?.ok) {
      if (verify?.code === "LOCKED") return json({ code: "LOCKED" }, 423);
      return json({ code: "INVALID" }, 401);
    }

    const syntheticEmail = `student.${student_id.replaceAll("-", "")}@portal.bina-insan.invalid`;
    const temporaryPassword = makePassword();

    const { data: linkData } = await admin
      .from("student_auth_links")
      .select("auth_user_id")
      .eq("student_id", student_id)
      .maybeSingle();

    let authUserId = linkData?.auth_user_id as string | undefined;
    let authEmail = syntheticEmail;

    if (authUserId) {
      const { data: existingUser } = await admin.auth.admin.getUserById(authUserId);
      if (existingUser?.user) {
        authEmail = existingUser.user.email || syntheticEmail;
        const { error: updateError } = await admin.auth.admin.updateUserById(authUserId, {
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { role: "student", student_id },
        });
        if (updateError) return json({ code: "SESSION_PREPARE_FAILED" }, 500);
      } else {
        authUserId = undefined;
      }
    }

    if (!authUserId) {
      const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = listed?.users?.find((user) => user.email === syntheticEmail);

      if (found) {
        authUserId = found.id;
        const { error: updateError } = await admin.auth.admin.updateUserById(authUserId, {
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { role: "student", student_id },
        });
        if (updateError) return json({ code: "SESSION_PREPARE_FAILED" }, 500);
      } else {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email: syntheticEmail,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { role: "student", student_id },
        });
        if (createError || !created.user) return json({ code: "SESSION_PREPARE_FAILED" }, 500);
        authUserId = created.user.id;
      }

      const { error: linkError } = await admin
        .from("student_auth_links")
        .upsert({ student_id, auth_user_id: authUserId }, { onConflict: "student_id" });
      if (linkError) return json({ code: "SESSION_LINK_FAILED" }, 500);
    }

    const publicClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({
      email: authEmail,
      password: temporaryPassword,
    });
    if (signInError || !signInData.session) return json({ code: "SESSION_CREATE_FAILED" }, 500);

    return json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_at: signInData.session.expires_at,
    });
  } catch {
    return json({ code: "LOGIN_UNAVAILABLE" }, 500);
  }
});
