-- Set cargo = 'Gerente' for all existing Gestores de Unidade that have no cargo set.

UPDATE public.profiles
SET cargo = 'Gerente'
WHERE perfil = 'Gestor de Unidade'
  AND (cargo IS NULL OR cargo = '');
