-- New columns for banco_candidatos needed by the Reachr edital import script.
-- PostgreSQL does not support column reordering; columns are added at the end
-- but the application references them by name.

ALTER TABLE public.banco_candidatos
  ADD COLUMN IF NOT EXISTS cpf              TEXT DEFAULT '',   -- before email (logical order)
  ADD COLUMN IF NOT EXISTS data_nascimento  TEXT DEFAULT '',   -- after cpf
  ADD COLUMN IF NOT EXISTS nota_avaliacao   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS nota_entrevista  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_publicacao  TEXT DEFAULT '';
