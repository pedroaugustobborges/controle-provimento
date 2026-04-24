/**
 * import_db.ts
 * Imports data exported by export_db.ts into a new Supabase project.
 * Run: bun run scripts/import_db.ts
 *
 * Prerequisites:
 *   1. Apply supabase/migrations/0001_initial_schema.sql to the new project first.
 *   2. Set env variables NEW_SUPABASE_URL and NEW_SERVICE_ROLE_KEY.
 *
 * Example:
 *   NEW_SUPABASE_URL="https://NEWREF.supabase.co" \
 *   NEW_SERVICE_ROLE_KEY="eyJ..." \
 *   bun run scripts/import_db.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// ── Config ────────────────────────────────────────────────────────────────────
const NEW_URL = process.env.NEW_SUPABASE_URL ?? "";
const NEW_KEY = process.env.NEW_SERVICE_ROLE_KEY ?? "";

if (!NEW_URL || !NEW_KEY) {
  console.error("❌  Set NEW_SUPABASE_URL and NEW_SERVICE_ROLE_KEY before running.");
  process.exit(1);
}

const supabase = createClient(NEW_URL, NEW_KEY, {
  auth: { persistSession: false },
});

const EXPORT_DIR = join(import.meta.dir, "export");
const CHUNK_SIZE = 500; // rows per upsert batch

// Import order matters because of foreign key constraints
const TABLE_ORDER = [
  "profiles",        // referenced by vagas, user_sessions
  "vagas",           // referenced by editais, validacoes_editais
  "editais",         // referenced by vagas (circular — vagas.edital_id)
  "validacoes_editais",
  "convocacoes",
  "banco_candidatos",
  "alertas",
  "audit_logs",
  "auditoria_logs",
  "bloqueios_horario",
  "feedbacks",
  "feriados_locais",
  "importacoes",
  "notificacoes",
  "support_configs",
  "system_maintenance",
  "system_updates",
  "tarefas",
  "user_roles",
  "user_sessions",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

async function importTable(table: string): Promise<void> {
  const filePath = join(EXPORT_DIR, `${table}.json`);
  let rows: unknown[];

  try {
    rows = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    console.log(`  ⚠️  No export file found for ${table}, skipping.`);
    return;
  }

  if (rows.length === 0) {
    console.log(`  ○  ${table}: 0 rows (empty table)`);
    return;
  }

  let inserted = 0;
  for (const chunk of chunks(rows, CHUNK_SIZE)) {
    const { error } = await supabase
      .from(table)
      .upsert(chunk as Record<string, unknown>[], { onConflict: "id" });

    if (error) throw new Error(`[${table}] ${error.message}`);
    inserted += chunk.length;
  }

  console.log(`  ✅  ${table}: ${inserted} rows`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\nImporting to: ${NEW_URL}\n`);

// Check which export files exist
const exportedFiles = new Set(
  readdirSync(EXPORT_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
);

for (const table of TABLE_ORDER) {
  process.stdout.write(`📥 ${table}... `);
  try {
    await importTable(table);
  } catch (err) {
    console.log(`\n  ❌  ${(err as Error).message}`);
  }
}

// Import any tables not in the explicit order
for (const file of exportedFiles) {
  if (!TABLE_ORDER.includes(file)) {
    process.stdout.write(`📥 ${file} (extra)... `);
    try {
      await importTable(file);
    } catch (err) {
      console.log(`\n  ❌  ${(err as Error).message}`);
    }
  }
}

console.log("\n✅  Import complete.");
