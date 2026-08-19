-- Add unidades_banco_talentos column to profiles table.
-- This stores the banco de talentos city/unit options each user has access to,
-- controlling visibility of banco_candidatos records by their unidade column.
-- Options: "Goiânia - GO", "Cidade de Goiás - GO", "Cáceres - MT", "Vitória - ES"
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS unidades_banco_talentos text[] DEFAULT '{}';
