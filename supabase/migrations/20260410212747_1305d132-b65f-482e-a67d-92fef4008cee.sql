-- Add columns for status calculation logic
ALTER TABLE public.banco_candidatos 
ADD COLUMN IF NOT EXISTS data_publicacao DATE,
ADD COLUMN IF NOT EXISTS prorrogacao TEXT,
ADD COLUMN IF NOT EXISTS status_original TEXT,
ADD COLUMN IF NOT EXISTS status_calculado TEXT,
ADD COLUMN IF NOT EXISTS motivo_do_calculo TEXT,
ADD COLUMN IF NOT EXISTS data_base_do_calculo TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS data_referencia_usada DATE;

-- Update existing records to set status_original if it's null
UPDATE public.banco_candidatos 
SET status_original = status 
WHERE status_original IS NULL;
