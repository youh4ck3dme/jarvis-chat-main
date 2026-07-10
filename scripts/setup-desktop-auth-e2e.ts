/**
 * E2E helper: create ~/.jarvis/desktop-auth.json with a valid Supabase session.
 * Uses SUPABASE_SERVICE_ROLE_KEY to mint an admin session for a test user.
 *
 * Usage: pnpm tsx scripts/setup-desktop-auth-e2e.ts [--web-base-url http://127.0.0.1:3141]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(): Record<string, string> {
  const envPath = join(process.cwd(), ".env.local");
  const vars: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return vars;
}

const env = loadEnvLocal();
for (const [key, value] of Object.entries(env)) {
  process.env[key] ??= value;
}

const TEST_EMAIL = process.env.DESKTOP_E2E_TEST_EMAIL ?? "jarvis-desktop-e2e@local.test";
function readCliFlag(flag: string, fallback: string): string {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const webBaseUrl = readCliFlag("--web-base-url", "http://127.0.0.1:3141");

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw listError;

  let user = listed.users.find((u) => u.email === TEST_EMAIL);

  if (!user) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      email_confirm: true,
    });
    if (createError) throw createError;
    user = created.user;
    console.log(`Created test user: ${TEST_EMAIL}`);
  } else {
    console.log(`Using existing test user: ${TEST_EMAIL}`);
  }

  const e2ePassword = process.env.DESKTOP_E2E_TEST_PASSWORD ?? "jarvis-e2e-desktop-23513900";

  const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, {
    password: e2ePassword,
  });
  if (passwordError) throw passwordError;

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const publicClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: e2ePassword,
  });
  if (signInError) throw signInError;

  const session = signInData.session;
  if (!session?.access_token) {
    throw new Error("signInWithPassword returned no access_token");
  }

  const authPath = join(homedir(), ".jarvis", "desktop-auth.json");
  mkdirSync(join(homedir(), ".jarvis"), { recursive: true });

  const payload = {
    access_token: session.access_token,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600 * 24,
    web_base_url: webBaseUrl,
    user_id: user.id,
  };

  writeFileSync(authPath, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  console.log(`✅ Written ${authPath}`);
  console.log(`   user_id: ${user.id}`);
  console.log(`   web_base_url: ${webBaseUrl}`);
  console.log(`   expires_at: ${payload.expires_at}`);
}

main().catch((err) => {
  console.error("setup-desktop-auth-e2e failed:", err);
  process.exit(1);
});