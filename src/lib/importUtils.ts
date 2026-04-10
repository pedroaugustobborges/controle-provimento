import { ColumnMapping } from "@/services/importService";

export const VAGA_REQUIRED_COLUMNS = [
  { key: 'abertura', label: 'Abertura', aliases: ['ABERTURA', 'DATA ABERTURA', 'DATA_ABERTURA', 'ABERTO EM'] },
  { key: 'recebimento', label: 'Recebimento', aliases: ['RECEBIMENTO', 'DATA RECEBIMENTO', 'DATA_RECEBIMENTO', 'RECEBIDO EM'] },
  { key: 'unidade', label: 'Unidade', aliases: ['UNIDADE', 'FILIAL', 'LOCAL', 'ESTABELECIMENTO'] },
  { key: 'requisicao', label: 'Requisição', aliases: ['REQUISIÇÃO', 'REQUISICAO', 'Nº REQUISIÇÃO', 'NUMERO_REQUISICAO', 'N° REQUISIÇÃO'] },
  { key: 'cargo', label: 'Cargo', aliases: ['CARGO', 'FUNÇÃO', 'FUNCAO', 'OCUPAÇÃO'] },
  { key: 'tipo_vaga', label: 'Tipo', aliases: ['TIPO', 'TIPO VAGA', 'TIPO_VAGA', 'CATEGORIA'] },
  { key: 'numero_vagas', label: 'Vagas', aliases: ['VAGAS', 'QTD VAGAS', 'QUANTIDADE', 'Nº VAGAS'] },
  { key: 'status', label: 'Status', aliases: ['STATUS', 'SITUAÇÃO', 'SITUACAO', 'ESTADO'] },
];

export const BANCO_REQUIRED_COLUMNS = [
  { key: 'nome', label: 'Nome', aliases: ['NOME', 'CANDIDATO', 'NOME COMPLETO', 'NOME_CANDIDATO'] },
  { key: 'cargo', label: 'Cargo', aliases: ['CARGO', 'FUNÇÃO', 'FUNCAO', 'VAGA'] },
  { key: 'unidade', label: 'Unidade', aliases: ['UNIDADE', 'FILIAL', 'LOCAL'] },
  { key: 'numero_edital', label: 'Edital', aliases: ['EDITAL', 'Nº EDITAL', 'Nº_EDITAL', 'NUMERO EDITAL'] },
];

export const BANCO_OPTIONAL_COLUMNS = [
  { key: 'classificacao', label: 'Classificação', aliases: ['CLASSIFICAÇÃO', 'POSIÇÃO', 'RANKING', 'COLOCAÇÃO'] },
  { key: 'status_import', label: 'Status', aliases: ['STATUS', 'SITUAÇÃO', 'SITUACAO', 'ACOMPANHAMENTO'] },
  { key: 'data_abertura_edital', label: 'Abertura Edital', aliases: ['ABERTURA EDITAL', 'DATA EDITAL', 'PUBLICACAO'] },
  { key: 'data_validade', label: 'Validade', aliases: ['VALIDADE', 'VENCIMENTO', 'DATA VALIDADE'] },
  { key: 'numero_processo', label: 'Processo', aliases: ['PROCESSO', 'Nº PROCESSO', 'PROTOCOLO'] },
  { key: 'observacoes', label: 'Observações', aliases: ['OBSERVAÇÕES', 'OBS', 'NOTAS'] },
];

export function autoMapColumns(headers: string[], type: 'vagas' | 'banco'): ColumnMapping[] {
  const config = type === 'vagas' ? VAGA_REQUIRED_COLUMNS : [...BANCO_REQUIRED_COLUMNS, ...BANCO_OPTIONAL_COLUMNS];
  const mappings: ColumnMapping[] = [];
  const normalizedHeaders = headers.map(h => h.toUpperCase().trim());

  config.forEach(field => {
    // Try exact match first
    let foundHeader = headers.find(h => h.toUpperCase().trim() === field.label.toUpperCase());
    
    // Try aliases
    if (!foundHeader) {
      foundHeader = headers.find(h => field.aliases.includes(h.toUpperCase().trim()));
    }

    // Try partial match if still not found
    if (!foundHeader) {
      foundHeader = headers.find(h => {
        const normH = h.toUpperCase().trim();
        return field.aliases.some(alias => normH.includes(alias) || alias.includes(normH));
      });
    }

    if (foundHeader) {
      mappings.push({
        excel: foundHeader,
        system: field.key,
        isDate: field.key.includes('data') || field.key === 'abertura' || field.key === 'recebimento'
      });
    }
  });

  return mappings;
}
