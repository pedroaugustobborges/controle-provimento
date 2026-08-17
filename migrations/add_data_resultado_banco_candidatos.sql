-- Migration: add data_resultado column to banco_candidatos
-- Stores the result date extracted from the last Cronograma card in Reachr.
-- Format: YYYY-MM-DD  (source text: "Adicionado em DD/MM/YYYY")
-- Nullable: rows imported before this migration, or where the step failed, will have NULL.

ALTER TABLE banco_candidatos
ADD COLUMN IF NOT EXISTS data_resultado DATE;

COMMENT ON COLUMN banco_candidatos.data_resultado IS
  'Data do resultado extraída do último card de Cronograma na Reachr (Etapas do Processo Seletivo). '
  'Aplicada a todos os candidatos do mesmo numero_processo_seletivo.';
