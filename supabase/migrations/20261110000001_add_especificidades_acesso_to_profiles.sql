-- Add especificidades_acesso column to profiles
-- Stores which vacancy "especificidades" (Liderança, PCD, Comum, TEIA) an Analista de RH can see.
-- Other profiles see all especificidades; this column is only enforced for 'Analista de RH'.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS especificidades_acesso text[] DEFAULT '{}';

-- Grant all 4 especificidades to every existing Analista de RH so the feature is opt-out,
-- not opt-in — the admin can narrow them down afterwards through the UI.
UPDATE profiles
SET especificidades_acesso = ARRAY['Liderança', 'PCD', 'Comum', 'TEIA']
WHERE perfil = 'Analista de RH';
