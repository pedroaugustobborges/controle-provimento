-- Ensure devolutiva-related columns exist on convocacoes with no value constraints.
-- motivo_recusa is reused for both "motivo de recusa" and "motivo de desistência".

ALTER TABLE public.convocacoes
  ADD COLUMN IF NOT EXISTS motivo_recusa TEXT,
  ADD COLUMN IF NOT EXISTS observacao_devolutiva TEXT,
  ADD COLUMN IF NOT EXISTS banco_relacionado UUID;

-- Drop any check constraint that may restrict motivo_recusa to old recusa_* values.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.convocacoes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%motivo_recusa%'
  LOOP
    EXECUTE 'ALTER TABLE public.convocacoes DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END;
$$;
