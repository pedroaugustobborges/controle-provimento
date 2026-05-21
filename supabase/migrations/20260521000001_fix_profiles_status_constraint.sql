-- Fix profiles status CHECK constraint to include 'suspenso'
-- Without this, attempting to set status='suspenso' throws a constraint violation

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('ativo', 'inativo', 'suspenso'));
