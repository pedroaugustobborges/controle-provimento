-- Adds custom ordering fields to banco_candidatos.
-- ordem_manual: 1-based position set by the HR user via drag-and-drop
-- reordenado_por: display name of the user who last changed the order
-- reordenado_em: timestamp of when the order was last changed

ALTER TABLE public.banco_candidatos
  ADD COLUMN IF NOT EXISTS ordem_manual    INTEGER      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reordenado_por  TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reordenado_em   TIMESTAMPTZ  DEFAULT NULL;

COMMENT ON COLUMN public.banco_candidatos.ordem_manual   IS 'Custom display order set by HR via drag-and-drop (1-based). NULL = use classificacao.';
COMMENT ON COLUMN public.banco_candidatos.reordenado_por IS 'Display name of the user who last reordered this banco group.';
COMMENT ON COLUMN public.banco_candidatos.reordenado_em  IS 'Timestamp of the last manual reordering.';
