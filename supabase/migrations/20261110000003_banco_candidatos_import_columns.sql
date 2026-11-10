-- New columns required for the manual Excel import flow in BancoTalentosPage.
-- nota_avaliacao_externa: third evaluation score from the Excel sheet
-- media_final:            weighted average used for ranking candidates
-- data_resultado:         date when the selection process result was published
-- is_teia:                whether the process belongs to Rede Teia

ALTER TABLE public.banco_candidatos
  ADD COLUMN IF NOT EXISTS nota_avaliacao_externa NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_final            NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_resultado         TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_teia                BOOLEAN DEFAULT false;
