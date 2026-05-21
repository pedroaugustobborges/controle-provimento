-- Reconcilia vagas órfãs: registros que foram "enviadas para redação" antes do fix
-- ficaram com status_fluxo_edital='encaminhado_edital' + status='ACOMPANHAMENTO DE EDITAL',
-- o que as escondia tanto da Fila (filtra por PUBLICAR EDITAL) quanto da Redação (exclui encaminhado_edital).
-- Move essas vagas para 'em_redacao' onde o analista pode trabalhá-las.
UPDATE public.vagas
SET status_fluxo_edital = 'em_redacao',
    etapa = 'em_redacao'
WHERE deleted_at IS NULL
  AND status_fluxo_edital = 'encaminhado_edital'
  AND UPPER(COALESCE(status, '')) = 'ACOMPANHAMENTO DE EDITAL';