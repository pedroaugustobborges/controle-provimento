
-- Add is_pcd and is_teia columns
ALTER TABLE public.vagas ADD COLUMN is_pcd boolean DEFAULT false;
ALTER TABLE public.vagas ADD COLUMN is_teia boolean DEFAULT false;

-- Backfill existing data
UPDATE public.vagas SET is_pcd = true WHERE cargo ILIKE '%pcd%';
UPDATE public.vagas SET is_teia = true WHERE unidade ILIKE '%teia%';
