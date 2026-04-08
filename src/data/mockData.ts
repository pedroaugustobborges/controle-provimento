import { Vaga, BancoTalentos, Convocacao, Edital, ValidacaoEdital, Tarefa, Alerta } from '@/types/vaga';

// Initializing as empty to ensure all data comes from Excel imports
export const mockVagas: Vaga[] = [
  {
    id: 'vaga-test-1',
    data_abertura: '2024-03-01',
    data_recebimento: '2024-03-05',
    unidade: 'HECAD',
    requisicao: 'REQ-001',
    numero_requisicao: 'REQ-001',
    cargo: 'ENFERMEIRO - UTI PEDIÁTRICA',
    secao: 'UTI',
    tipo_vaga: 'substituicao',
    numero_vagas: 2,
    quantidade: 2,
    analista_responsavel: 'Ana Souza',
    assistentes: ['Carlos Silva'],
    observacoes_internas: 'Urgente',
    status: 'em_edital',
    status_geral: 'em_edital',
    tem_banco_valido: false,
    vaga: 'V-001',
    origem_importacao: 'base_real_teste.xlsm',
    data_importacao: '2024-03-20T10:00:00Z',
    lote_importacao: 'IMPORT-001',
    source_sheet: 'tb_HECAD',
    source_row_index: 4,
    historico: []
  },
  {
    id: 'vaga-test-2',
    data_abertura: '2024-03-02',
    data_recebimento: '2024-03-06',
    unidade: 'HUGOL',
    requisicao: 'REQ-002',
    numero_requisicao: 'REQ-002',
    cargo: 'TÉCNICO DE ENFERMAGEM',
    secao: 'Emergência',
    tipo_vaga: 'aumento',
    numero_vagas: 5,
    quantidade: 5,
    analista_responsavel: 'Marcos Lima',
    assistentes: [],
    observacoes_internas: '',
    status: 'publicar_novo_edital',
    status_geral: 'publicar_novo_edital',
    tem_banco_valido: false,
    vaga: 'V-002',
    origem_importacao: 'base_real_teste.xlsm',
    data_importacao: '2024-03-20T10:00:00Z',
    lote_importacao: 'IMPORT-001',
    source_sheet: 'tb_HUGOL',
    source_row_index: 5,
    historico: []
  },
  {
    id: 'vaga-test-3',
    data_abertura: '2024-03-10',
    data_recebimento: '2024-03-12',
    unidade: 'CRER',
    requisicao: 'REQ-003',
    numero_requisicao: 'REQ-003',
    cargo: 'FISIOTERAPEUTA',
    secao: 'Reabilitação',
    tipo_vaga: 'lideranca',
    numero_vagas: 1,
    quantidade: 1,
    analista_responsavel: 'Juliana Costa',
    assistentes: [],
    observacoes_internas: '',
    status: 'admissao_efetivada',
    status_geral: 'admissao_efetivada',
    tem_banco_valido: true,
    vaga: 'V-003',
    origem_importacao: 'base_real_teste.xlsm',
    data_importacao: '2024-03-20T10:00:00Z',
    lote_importacao: 'IMPORT-001',
    source_sheet: 'tb_CRER',
    source_row_index: 6,
    historico: []
  }
];
export const mockBancos: BancoTalentos[] = [];
export const mockConvocacoes: Convocacao[] = [];
export const mockEditais: Edital[] = [];
export const mockValidacoes: ValidacaoEdital[] = [];
export const mockTarefas: Tarefa[] = [];
export const mockAlertas: Alerta[] = [];
