-- Add unidades_responsavel column to profiles table.
-- This stores the hospital units each analyst is responsible for,
-- independently of whether vagas exist for those units.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS unidades_responsavel text[] DEFAULT '{}';
