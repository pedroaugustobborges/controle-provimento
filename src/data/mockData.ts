import { Vaga, Edital, ValidacaoEdital } from '@/types/vaga';

export const mockVagas: Vaga[] = [
  {
    id: '1', numero_requisicao: 'REQ-2025-001', data_abertura: '2025-01-15', cargo: 'Enfermeiro(a) - UTI',
    tipo_vaga: 'quadro', quantidade: 3, secao: 'Enfermagem', unidade: 'Hospital Central',
    analista_responsavel: 'Maria Silva', status_geral: 'em_edital', origem_importacao: 'Planilha RM',
    observacoes: 'Urgente - cobertura de escala noturna', historico: [
      { id: 'h1', data: '2025-01-15', descricao: 'Vaga cadastrada via importação', usuario: 'Sistema' },
      { id: 'h2', data: '2025-02-01', descricao: 'Enviada para publicação de edital', usuario: 'Maria Silva' },
    ],
  },
  {
    id: '2', numero_requisicao: 'REQ-2025-002', data_abertura: '2025-02-03', cargo: 'Técnico de Enfermagem',
    tipo_vaga: 'substituicao', quantidade: 2, secao: 'Enfermagem', unidade: 'Unidade Barra',
    analista_responsavel: 'João Santos', status_geral: 'aberta', origem_importacao: 'Planilha Controle',
    observacoes: '', historico: [
      { id: 'h3', data: '2025-02-03', descricao: 'Vaga cadastrada via importação', usuario: 'Sistema' },
    ],
  },
  {
    id: '3', numero_requisicao: 'REQ-2025-003', data_abertura: '2025-01-20', cargo: 'Médico Plantonista - Emergência',
    tipo_vaga: 'quadro', quantidade: 1, secao: 'Corpo Clínico', unidade: 'Hospital Central',
    analista_responsavel: 'Maria Silva', status_geral: 'entrevista', origem_importacao: 'Planilha RM',
    observacoes: 'Candidatos em fase final', historico: [
      { id: 'h4', data: '2025-01-20', descricao: 'Vaga cadastrada', usuario: 'Maria Silva' },
      { id: 'h5', data: '2025-02-10', descricao: 'Edital publicado', usuario: 'Ana Costa' },
      { id: 'h6', data: '2025-03-01', descricao: 'Triagem concluída - 15 aprovados', usuario: 'Maria Silva' },
      { id: 'h7', data: '2025-03-15', descricao: 'Entrevistas iniciadas', usuario: 'Maria Silva' },
    ],
  },
  {
    id: '4', numero_requisicao: 'REQ-2025-004', data_abertura: '2024-11-10', cargo: 'Fisioterapeuta Respiratório',
    tipo_vaga: 'lideranca', quantidade: 1, secao: 'Reabilitação', unidade: 'Unidade Norte',
    analista_responsavel: 'Ana Costa', status_geral: 'encerrada', origem_importacao: 'Planilha RM',
    observacoes: 'Processo concluído com sucesso', data_encerramento: '2025-02-28', historico: [
      { id: 'h8', data: '2024-11-10', descricao: 'Vaga cadastrada', usuario: 'Ana Costa' },
      { id: 'h9', data: '2025-02-28', descricao: 'Vaga encerrada - candidato aprovado', usuario: 'Ana Costa' },
    ],
  },
  {
    id: '5', numero_requisicao: 'REQ-2025-005', data_abertura: '2025-03-01', cargo: 'Farmacêutico Clínico',
    tipo_vaga: 'edital', quantidade: 2, secao: 'Farmácia', unidade: 'Hospital Central',
    analista_responsavel: 'João Santos', status_geral: 'em_edital', origem_importacao: 'Planilha Controle',
    observacoes: 'Aguardando validação do edital', historico: [
      { id: 'h10', data: '2025-03-01', descricao: 'Vaga cadastrada', usuario: 'João Santos' },
      { id: 'h11', data: '2025-03-10', descricao: 'Enviada para edital', usuario: 'João Santos' },
    ],
  },
  {
    id: '6', numero_requisicao: 'REQ-2025-006', data_abertura: '2025-02-20', cargo: 'Nutricionista',
    tipo_vaga: 'banco_talentos', quantidade: 5, secao: 'Nutrição', unidade: 'Unidade Barra',
    analista_responsavel: 'Maria Silva', status_geral: 'em_triagem', origem_importacao: 'Planilha RM',
    observacoes: 'Banco de talentos para futuras contratações', historico: [
      { id: 'h12', data: '2025-02-20', descricao: 'Vaga cadastrada', usuario: 'Maria Silva' },
    ],
  },
  {
    id: '7', numero_requisicao: 'REQ-2025-007', data_abertura: '2025-03-05', cargo: 'Auxiliar Administrativo',
    tipo_vaga: 'movimentacao_interna', quantidade: 1, secao: 'Administrativo', unidade: 'Unidade Norte',
    analista_responsavel: 'Ana Costa', status_geral: 'aberta', origem_importacao: 'Manual',
    observacoes: 'Movimentação interna - setor financeiro', historico: [
      { id: 'h13', data: '2025-03-05', descricao: 'Vaga cadastrada manualmente', usuario: 'Ana Costa' },
    ],
  },
  {
    id: '8', numero_requisicao: 'REQ-2025-008', data_abertura: '2025-01-05', cargo: 'Psicólogo Hospitalar',
    tipo_vaga: 'quadro', quantidade: 1, secao: 'Saúde Mental', unidade: 'Hospital Central',
    analista_responsavel: 'João Santos', status_geral: 'finalizada', origem_importacao: 'Planilha RM',
    observacoes: 'Aprovado candidato interno', data_encerramento: '2025-03-20', historico: [
      { id: 'h14', data: '2025-01-05', descricao: 'Vaga cadastrada', usuario: 'João Santos' },
      { id: 'h15', data: '2025-03-20', descricao: 'Vaga finalizada', usuario: 'João Santos' },
    ],
  },
];

export const mockEditais: Edital[] = [
  {
    id: 'e1', vaga_id: '1', numero_processo: 'PROC-2025-0045', numero_edital: 'ED-2025-012',
    data_abertura_edital: '2025-02-05', data_prova: '2025-03-10', data_entrevista: '2025-03-25',
    etapa_atual: 'entrevista', total_inscritos: 42, aprovados_triagem: 18, convocados_entrevista: 10,
    aprovados_finais: 0, possui_banco_talentos: true, status_publicacao: 'publicado',
  },
  {
    id: 'e2', vaga_id: '3', numero_processo: 'PROC-2025-0032', numero_edital: 'ED-2025-008',
    data_abertura_edital: '2025-02-10', data_prova: '2025-02-28', data_entrevista: '2025-03-15',
    etapa_atual: 'entrevista', total_inscritos: 28, aprovados_triagem: 15, convocados_entrevista: 8,
    aprovados_finais: 0, possui_banco_talentos: false, status_publicacao: 'publicado',
  },
  {
    id: 'e3', vaga_id: '5', numero_processo: '', numero_edital: '',
    data_abertura_edital: '', etapa_atual: 'inscricoes', total_inscritos: 0, aprovados_triagem: 0,
    convocados_entrevista: 0, aprovados_finais: 0, possui_banco_talentos: false, status_publicacao: 'pendente',
  },
];

export const mockValidacoes: ValidacaoEdital[] = [
  {
    id: 'v1', vaga_id: '1', salario_confere: true, requisitos_confere: true, atribuicoes_confere: true,
    site_confere: true, datas_conferem: true, vaga_correta_para_edital: true, planilha_correta: true,
    observacoes_validacao: 'Tudo confere, liberado para publicação.', validado_por: 'Carlos Mendes',
    data_validacao: '2025-02-04', status_validacao: 'aprovado',
  },
  {
    id: 'v2', vaga_id: '5', salario_confere: null, requisitos_confere: null, atribuicoes_confere: null,
    site_confere: null, datas_conferem: null, vaga_correta_para_edital: null, planilha_correta: null,
    observacoes_validacao: '', validado_por: '', status_validacao: 'pendente',
  },
  {
    id: 'v3', vaga_id: '3', salario_confere: true, requisitos_confere: true, atribuicoes_confere: false,
    site_confere: true, datas_conferem: true, vaga_correta_para_edital: true, planilha_correta: true,
    observacoes_validacao: 'Atribuições do cargo estão desatualizadas na descrição.', validado_por: 'Carlos Mendes',
    data_validacao: '2025-02-09', status_validacao: 'reprovado',
  },
];
