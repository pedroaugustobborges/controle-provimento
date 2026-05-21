---
name: Import rules
description: Import vagas (header row 2) and banco (header row 1). Always use @/integrations/supabase/client. Verify persistence after insert.
type: feature
---
- Vagas: header row 2 (index 1), replaces all records.
- Banco: header row 1 (index 0), supports scope and mode.
- All supabase usage via @/integrations/supabase/client.
- Verify persistence by counting records with import_batch_id after insert.
- Paginate fetches beyond 1000 rows.
