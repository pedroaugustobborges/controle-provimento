"""
export_db.py
Exports all table data from the source Supabase project using only
the standard library + requests (pip install requests).

Run:
  python scripts/export_db.py

Output: scripts/export/ (one JSON file per table)
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
SUPABASE_URL = "https://twgwrasjyqpllijilole.supabase.co"
# Strip any whitespace/newlines that PowerShell may have inserted
SERVICE_ROLE_KEY = "".join(os.environ.get("SERVICE_ROLE_KEY", "").split())

if not SERVICE_ROLE_KEY:
    print("❌  SERVICE_ROLE_KEY not set.")
    print('   Run: $env:SERVICE_ROLE_KEY="eyJ..."  (then run this script)')
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

OUTPUT_DIR = Path(__file__).parent / "export"
PAGE_SIZE = 1000

TABLES = [
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
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def fetch_all_rows(table: str) -> list:
    rows = []
    page = 0
    while True:
        start = page * PAGE_SIZE
        end = start + PAGE_SIZE - 1
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        resp = requests.get(
            url,
            headers={**HEADERS, "Range": f"{start}-{end}", "Prefer": "count=none"},
            params={"select": "*"},
        )
        if resp.status_code == 416:  # Range Not Satisfiable = no more rows
            break
        resp.raise_for_status()
        data = resp.json()
        if not data:
            break
        rows.extend(data)
        print(f"    page {page + 1}: {len(data)} rows")
        if len(data) < PAGE_SIZE:
            break
        page += 1
    return rows

# ── Main ──────────────────────────────────────────────────────────────────────

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
summary = {}

for table in TABLES:
    print(f"\n📦 Exporting {table}...", flush=True)
    try:
        rows = fetch_all_rows(table)
        out_file = OUTPUT_DIR / f"{table}.json"
        out_file.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
        summary[table] = len(rows)
        print(f"   ✅  {len(rows)} rows saved to {out_file.name}")
    except Exception as e:
        print(f"   ❌  {e}")
        summary[table] = -1

print("\n═══════════════════════════════")
print("Export summary:")
for table, count in summary.items():
    icon = "✅" if count >= 0 else "❌"
    status = f"{count} rows" if count >= 0 else "ERROR"
    print(f"  {icon}  {table:<28} {status}")

print(f"\nFiles saved to: {OUTPUT_DIR}")
