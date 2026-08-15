#!/usr/bin/env node
/**
 * Apply supabase/migrations/003_jarvis_session_artifacts.sql via Supabase Management API.
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN  — personal access token from supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF   — defaults to qytsiddrksybwpqldjfj
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-migration-003.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || "qytsiddrksybwpqldjfj";
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "..", "supabase", "migrations", "003_jarvis_session_artifacts.sql");
const query = readFileSync(sqlPath, "utf8");

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query }),
});

const body = await response.text();
if (!response.ok) {
  console.error(`Migration failed (${response.status}): ${body}`);
  process.exit(1);
}

console.log("Migration 003 applied.");
console.log(body || "(ok)");

const verify = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: `select column_name from information_schema.columns
            where table_name = 'jarvis_chat_sessions'
              and column_name in ('artifacts','active_artifact_id')
            order by column_name;`,
  }),
});
const verifyBody = await verify.text();
console.log("Verify:", verifyBody);
