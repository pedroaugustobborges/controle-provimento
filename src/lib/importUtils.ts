import { ColumnMapping } from "@/services/importService";

export const VAGA_REQUIRED_COLUMNS = [
  { key: 'data_abertura', label: 'Abertura', aliases: ['ABERTURA', 'DATA ABERTURA', 'DATA_ABERTURA', 'ABERTO EM', 'DT ABERTURA'] },
  { key: 'data_recebimento', label: 'Recebimento', aliases: ['RECEBIMENTO', 'DATA RECEBIMENTO', 'DATA_RECEBIMENTO', 'RECEBIDO EM', 'DT RECEBIMENTO'] },
  { key: 'unidade', label: 'Unidade', aliases: ['UNIDADE', 'FILIAL', 'LOCAL', 'ESTABELECIMENTO'] },
  { key: 'numero_processo_seletivo', label: 'Requisição', aliases: ['REQUISIÇÃO', 'REQUISICAO', 'Nº REQUISIÇÃO', 'NUMERO_REQUISICAO', 'N° REQUISIÇÃO', 'PROCESSO SELETIVO', 'Nº PROCESSO'] },
  { key: 'cargo', label: 'Cargo', aliases: ['CARGO', 'FUNÇÃO', 'FUNCAO', 'OCUPAÇÃO'] },
  { key: 'tipo_vaga', label: 'Tipo', aliases: ['TIPO', 'TIPO VAGA', 'TIPO_VAGA', 'CATEGORIA', 'TIPO DE VAGA'] },
  { key: 'numero_vagas', label: 'Vagas', aliases: ['VAGAS', 'QTD VAGAS', 'QUANTIDADE', 'Nº VAGAS', 'QTD', 'QTDE'] },
  { key: 'status', label: 'Status', aliases: ['STATUS', 'SITUAÇÃO', 'SITUACAO', 'ESTADO'] },
];

export const BANCO_REQUIRED_COLUMNS = [
  { key: 'nome', label: 'Nome', aliases: ['NOME', 'CANDIDATO', 'NOME COMPLETO', 'NOME_CANDIDATO'] },
  { key: 'cargo', label: 'Cargo', aliases: ['CARGO', 'FUNÇÃO', 'FUNCAO', 'VAGA'] },
  { key: 'unidade', label: 'Unidade', aliases: ['UNIDADE', 'FILIAL', 'LOCAL'] },
  { key: 'numero_edital', label: 'Edital', aliases: ['EDITAL', 'Nº EDITAL', 'Nº_EDITAL', 'NUMERO EDITAL', 'N° EDITAL'] },
];

export const BANCO_OPTIONAL_COLUMNS = [
  { key: 'classificacao', label: 'Classificação', aliases: ['CLASSIFICAÇÃO', 'CLASSIFICACAO', 'POSIÇÃO', 'RANKING', 'COLOCAÇÃO'] },
  { key: 'status', label: 'Status', aliases: ['STATUS', 'SITUAÇÃO', 'SITUACAO', 'ACOMPANHAMENTO'] },
  { key: 'data_convocacao', label: 'Data Convocação', aliases: ['CONVOCAÇÃO', 'DATA CONVOCAÇÃO', 'DATA_CONVOCACAO', 'DT CONVOCAÇÃO'] },
  { key: 'data_validade', label: 'Validade', aliases: ['VALIDADE', 'VENCIMENTO', 'DATA VALIDADE'] },
  { key: 'numero_processo_seletivo', label: 'Processo', aliases: ['PROCESSO', 'Nº PROCESSO', 'PROTOCOLO', 'PROCESSO SELETIVO'] },
  { key: 'observacao', label: 'Observações', aliases: ['OBSERVAÇÕES', 'OBSERVACAO', 'OBS', 'NOTAS'] },
  { key: 'email', label: 'E-mail', aliases: ['EMAIL', 'E-MAIL', 'CORREIO'] },
  { key: 'telefone', label: 'Telefone', aliases: ['TELEFONE', 'TEL', 'CELULAR', 'CONTATO'] },
];

export function getDefaultHeaderRow(type: 'vagas' | 'banco'): number {
  // vagas: headers on row 2 (index 1), banco: headers on row 1 (index 0)
  return type === 'vagas' ? 1 : 0;
}

export function autoMapColumns(headers: string[], type: 'vagas' | 'banco'): ColumnMapping[] {
  if (!headers || !Array.isArray(headers)) return [];
  
  const config = type === 'vagas' ? VAGA_REQUIRED_COLUMNS : [...BANCO_REQUIRED_COLUMNS, ...BANCO_OPTIONAL_COLUMNS];
  const mappings: ColumnMapping[] = [];

  config.forEach(field => {
    const fieldLabelUpper = String(field.label || '').toUpperCase();
    const fieldAliasesUpper = (field.aliases || []).map(a => String(a || '').toUpperCase());

    // Try exact match first
    let foundHeader = headers.find(h => {
      if (!h) return false;
      const normH = String(h).toUpperCase().trim();
      return normH === fieldLabelUpper;
    });
    
    // Try aliases
    if (!foundHeader) {
      foundHeader = headers.find(h => {
        if (!h) return false;
        const normH = String(h).toUpperCase().trim();
        return fieldAliasesUpper.includes(normH);
      });
    }

    // Try partial match if still not found
    if (!foundHeader) {
      foundHeader = headers.find(h => {
        if (!h) return false;
        const normH = String(h).toUpperCase().trim();
        return fieldAliasesUpper.some(alias => normH.includes(alias) || alias.includes(normH));
      });
    }

    if (foundHeader) {
      const isDate = field.key.includes('data') || field.key === 'data_abertura' || field.key === 'data_recebimento' || field.key === 'data_convocacao' || field.key === 'data_validade';
      mappings.push({
        excel: foundHeader,
        system: field.key,
        isDate
      });
    }
  });

  return mappings;
}
