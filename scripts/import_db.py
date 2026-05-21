"""
import_db.py
Imports data from scripts/export/ into the new Supabase project.

Prerequisites:
  1. Apply supabase/migrations/0001_initial_schema.sql in the new project's SQL Editor first.
  2. Set NEW_SERVICE_ROLE_KEY env variable.

Run:
  python scripts/import_db.py
"""

import json
import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌  'requests' not found. Run: pip install requests")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────
NEW_URL = "https://npmqwwxhqwejgdodinba.supabase.co"
NEW_KEY = "".join(os.environ.get("NEW_SERVICE_ROLE_KEY", "").split())

if not NEW_KEY:
    print("❌  NEW_SERVICE_ROLE_KEY not set.")
    print('   Run: $env:NEW_SERVICE_ROLE_KEY="eyJ..."')
    sys.exit(1)

HEADERS = {
    "apikey": NEW_KEY,
    "Authorization": f"Bearer {NEW_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

EXPORT_DIR = Path(__file__).parent / "export"
CHUNK_SIZE = 200  # smaller chunks = safer for large rows

# Import order respects foreign key constraints:
#   profiles → vagas → editais (circular via vagas.edital_id, handled below)
TABLE_ORDER = [
    "profiles",
    "vagas",
    "editais",
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
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def chunks(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]

def upsert_chunk(table: str, rows: list) -> None:
    url = f"{NEW_URL}/rest/v1/{table}"
    resp = requests.post(url, headers=HEADERS, json=rows)
    if resp.status_code not in (200, 201):
        raise Exception(f"HTTP {resp.status_code}: {resp.text[:300]}")

def import_table(table: str) -> int:
    file_path = EXPORT_DIR / f"{table}.json"
    if not file_path.exists():
        print(f"  ⚠️   No export file for {table}, skipping.")
        return 0

    rows = json.loads(file_path.read_text(encoding="utf-8"))
    if not rows:
        print(f"  ○   {table}: 0 rows")
        return 0

    inserted = 0
    for chunk in chunks(rows, CHUNK_SIZE):
        upsert_chunk(table, chunk)
        inserted += len(chunk)
        print(f"  ... {inserted}/{len(rows)}", end="\r")

    print(f"  ✅  {table}: {len(rows)} rows{' ' * 10}")
    return len(rows)

# ── Handle circular FK (vagas ↔ editais) ─────────────────────────────────────
# vagas.edital_id → editais, but editais.vaga_id → vagas
# Strategy: import vagas with edital_id=NULL first, import editais, then patch vagas.edital_id

def import_vagas_two_pass():
    file_path = EXPORT_DIR / "vagas.json"
    if not file_path.exists():
        print("  ⚠️   No export file for vagas, skipping.")
        return

    rows = json.loads(file_path.read_text(encoding="utf-8"))
    if not rows:
        print("  ○   vagas: 0 rows")
        return

    # Pass 1: insert with edital_id nulled out
    edital_map = {}
    stripped = []
    for r in rows:
        if r.get("edital_id"):
            edital_map[r["id"]] = r["edital_id"]
        stripped.append({**r, "edital_id": None})

    for chunk in chunks(stripped, CHUNK_SIZE):
        upsert_chunk("vagas", chunk)
    print(f"  ✅  vagas pass 1 (edital_id deferred): {len(rows)} rows")

    return edital_map

def patch_vagas_edital_id(edital_map: dict):
    if not edital_map:
        return
    url = f"{NEW_URL}/rest/v1/vagas"
    patched = 0
    for vaga_id, edital_id in edital_map.items():
        resp = requests.patch(
            url,
            headers=HEADERS,
            params={"id": f"eq.{vaga_id}"},
            json={"edital_id": edital_id},
        )
        if resp.status_code not in (200, 204):
            print(f"  ⚠️   Could not patch vagas.edital_id for {vaga_id}: {resp.text[:100]}")
        else:
            patched += 1
    print(f"  ✅  vagas edital_id patched: {patched} rows")

# ── Main ──────────────────────────────────────────────────────────────────────

print(f"\nImporting to: {NEW_URL}\n")

summary = {}

# profiles first
print("📥 profiles...")
try:
    summary["profiles"] = import_table("profiles")
except Exception as e:
    print(f"  ❌  {e}")
    summary["profiles"] = -1

# vagas (pass 1 — without edital_id)
print("📥 vagas (pass 1)...")
try:
    edital_map = import_vagas_two_pass()
    summary["vagas"] = "deferred"
except Exception as e:
    print(f"  ❌  {e}")
    edital_map = {}
    summary["vagas"] = -1

# editais
print("📥 editais...")
try:
    summary["editais"] = import_table("editais")
except Exception as e:
    print(f"  ❌  {e}")
    summary["editais"] = -1

# vagas pass 2 — restore edital_id
print("📥 vagas (pass 2 — restoring edital_id)...")
try:
    patch_vagas_edital_id(edital_map or {})
    summary["vagas"] = "done"
except Exception as e:
    print(f"  ❌  {e}")

# rest of tables
for table in TABLE_ORDER:
    if table in ("profiles", "vagas", "editais"):
        continue
    print(f"📥 {table}...")
    try:
        summary[table] = import_table(table)
    except Exception as e:
        print(f"  ❌  {e}")
        summary[table] = -1

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n═══════════════════════════════")
print("Import summary:")
for table, count in summary.items():
    if count == -1:
        print(f"  ❌  {table:<28} ERROR")
    else:
        print(f"  ✅  {table:<28} {count}")

print("\n✅  Done.")
