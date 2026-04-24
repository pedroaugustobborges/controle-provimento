/**
 * export_db.ts
 * Exports all table data from the source Supabase project.
 * Run: bun run scripts/export_db.ts
 *
 * Output: scripts/export/ (one JSON file per table)
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://twgwrasjyqpllijilole.supabase.co";
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY ?? "";

if (!SERVICE_ROLE_KEY) {
  console.error("❌  Set SERVICE_ROLE_KEY env variable before running.");
  console.error(
    '   Example: SERVICE_ROLE_KEY="eyJ..." bun run scripts/export_db.ts'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const OUTPUT_DIR = join(import.meta.dir, "export");
const PAGE_SIZE = 1000;

// All tables derived from src/integrations/supabase/types.ts
const TABLES = [
  "alertas",
  "audit_logs",
  "auditoria_logs",
  "banco_candidatos",
  "bloqueios_horario",
  "convocacoes",
  "editais",
  "feedbacks",
  "feriados_locais",
  "importacoes",
  "notificacoes",
  "profiles",
  "support_configs",
  "system_maintenance",
  "system_updates",
  "tarefas",
  "user_roles",
  "user_sessions",
  "vagas",
  "validacoes_editais",
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchAllRows(table: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, to);

    if (error) throw new Error(`[${table}] ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...data);
    console.log(`  page ${page + 1}: ${data.length} rows`);

    if (data.length < PAGE_SIZE) break;
    page++;
  }

  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────────

mkdirSync(OUTPUT_DIR, { recursive: true });

const summary: Record<string, number> = {};

for (const table of TABLES) {
  process.stdout.write(`\n📦 Exporting ${table}...`);
  try {
    const rows = await fetchAllRows(table);
    const filePath = join(OUTPUT_DIR, `${table}.json`);
    writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf-8");
    summary[table] = rows.length;
    console.log(` ✅  ${rows.length} rows`);
  } catch (err) {
    console.log(` ❌  ${(err as Error).message}`);
    summary[table] = -1;
  }
}

console.log("\n═══════════════════════════════");
console.log("Export summary:");
for (const [table, count] of Object.entries(summary)) {
  const icon = count >= 0 ? "✅" : "❌";
  console.log(`  ${icon}  ${table.padEnd(28)} ${count >= 0 ? count + " rows" : "ERROR"}`);
}
console.log(`\nFiles saved to: ${OUTPUT_DIR}`);
