-- Give all existing users full access to all hospital units.
-- New users default to restricted access (visualiza_todas_unidades = false)
-- and an administrator must explicitly grant unit access after creation.

UPDATE public.profiles
SET visualiza_todas_unidades = true
WHERE visualiza_todas_unidades IS NULL
   OR visualiza_todas_unidades = false;
