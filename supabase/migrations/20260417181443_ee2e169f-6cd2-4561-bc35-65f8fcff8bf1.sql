UPDATE public.vagas
SET status_origem = COALESCE(NULLIF(status_origem, ''), 'SEM STATUS')
WHERE status_fluxo_edital = 'encaminhado_edital'
  AND status_origem IS NULL
  AND deleted_at IS NULL;