import { Vaga, BancoTalentos, Convocacao, Edital, ValidacaoEdital } from '@/types/vaga';

export const mockVagas: Vaga[] = [
  {
    id: '1', 
    requisicao: 'REQ-2025-001', 
    numero_requisicao: 'REQ-2025-001',
    data_abertura: '2025-01-15', 
    data_recebimento: '2025-01-14',
    cargo: 'Enfermeiro(a) - UTI',
    tipo_vaga: 'substituicao', 
    numero_vagas: 3, 
    quantidade: 3,
    secao: 'Enfermagem', 
    unidade: 'Hospital Central (GO)',
    analista_responsavel: 'Maria Silva', 
    status: 'em_edital',
    status_geral: 'em_edital',
    observacoes_internas: 'Urgente - cobertura de escala noturna',
    tem_banco_valido: true,
    banco_id: 'b1',
    historico: [
      { id: 'h1', data: '2025-01-15', descricao: 'Vaga cadastrada via importação', usuario: 'Sistema' },
      { id: 'h2', data: '2025-02-01', descricao: 'Enviada para publicação de edital', usuario: 'Maria Silva' },
    ],
  },
  {
    id: '2', 
    requisicao: 'REQ-2025-002', 
    numero_requisicao: 'REQ-2025-002',
    data_abertura: '2025-02-03', 
    data_recebimento: '2025-02-01',
    cargo: 'Técnico de Enfermagem',
    tipo_vaga: 'substituicao', 
    numero_vagas: 2, 
    quantidade: 2,
    secao: 'Enfermagem', 
    unidade: 'Hospital das Clínicas (ES)',
    analista_responsavel: 'João Santos', 
    status: 'realizar_convocacao',
    status_geral: 'realizar_convocacao',
    observacoes_internas: '',
    tem_banco_valido: true,
    banco_id: 'b2',
    historico: [
      { id: 'h3', data: '2025-02-03', descricao: 'Vaga cadastrada via importação', usuario: 'Sistema' },
    ],
  },
  {
    id: '3', 
    requisicao: 'REQ-2025-003', 
    numero_requisicao: 'REQ-2025-003',
    data_abertura: '2025-01-20', 
    data_recebimento: '2025-01-18',
    cargo: 'Médico Plantonista - Emergência',
    tipo_vaga: 'aumento', 
    numero_vagas: 1, 
    quantidade: 1,
    secao: 'Corpo Clínico', 
    unidade: 'Hospital Central (GO)',
    analista_responsavel: 'Maria Silva', 
    status: 'documentacao',
    status_geral: 'documentacao',
    observacoes_internas: 'Candidatos em fase final',
    tem_banco_valido: false,
    historico: [
      { id: 'h4', data: '2025-01-20', descricao: 'Vaga cadastrada', usuario: 'Maria Silva' },
    ],
  },
];

export const mockBancos: BancoTalentos[] = [
  {
    id: 'b1',
    unidade: 'Hospital Central (GO)',
    cargo: 'Enfermeiro(a) - UTI',
    secao: 'Enfermagem',
    numero_edital: 'ED-2024-005',
    data_abertura_edital: '2024-06-10',
    data_validade: '2024-12-10',
    is_prorrogado: true,
    nova_data_validade: '2025-06-10',
    observacoes: 'Prorrogado por mais 6 meses.',
    status: 'prorrogado'
  },
  {
    id: 'b2',
    unidade: 'Hospital das Clínicas (ES)',
    cargo: 'Técnico de Enfermagem',
    secao: 'Enfermagem',
    numero_edital: 'ED-2024-008',
    data_abertura_edital: '2024-08-15',
    data_validade: '2025-02-15',
    is_prorrogado: false,
    observacoes: '',
    status: 'valido'
  }
];

export const mockConvocacoes: Convocacao[] = [
  {
    id: 'c1',
    vaga_id: '2',
    data_convocacao: '2025-03-20',
    horario: '08:30',
    nome_candidato: 'Carlos Eduardo Oliveira',
    classificacao: 1,
    tipo_convocacao: 'E-mail',
    cargo: 'Técnico de Enfermagem',
    unidade: 'Hospital das Clínicas (ES)',
    requisicao: 'REQ-2025-002',
    edital_relacionado: 'ED-2024-008',
    banco_relacionado: 'b2',
    observacoes: 'Primeira chamada do banco.',
    status: 'pendente'
  }
];

export const mockEditais: Edital[] = [];
export const mockValidacoes: ValidacaoEdital[] = [];
