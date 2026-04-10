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
  { key: 'nome', label: 'Nome', aliases: ['NOME', 'CANDIDATO', 'NOME COMPLETO', 'NOME_CANDIDATO', 'NOME DO CANDIDATO', 'CANDIDATO(A)', 'NOME CANDIDATO'] },
  { key: 'cargo', label: 'Cargo', aliases: ['CARGO', 'FUNÇÃO', 'FUNCAO', 'VAGA', 'CARGO/FUNÇÃO', 'CARGO / FUNÇÃO'] },
  { key: 'unidade', label: 'Unidade', aliases: ['UNIDADE', 'FILIAL', 'LOCAL', 'LOTAÇÃO', 'LOTACAO', 'UNIDADE DE LOTAÇÃO', 'ESTABELECIMENTO'] },
  { key: 'numero_edital', label: 'Edital', aliases: ['EDITAL', 'Nº EDITAL', 'Nº_EDITAL', 'NUMERO EDITAL', 'N° EDITAL', 'N. EDITAL', 'EDITAL Nº', 'EDITAL N°', 'NR EDITAL', 'NUM EDITAL'] },
];

export const BANCO_OPTIONAL_COLUMNS = [
  { key: 'classificacao', label: 'Classificação', aliases: ['CLASSIFICAÇÃO', 'CLASSIFICACAO', 'POSIÇÃO', 'RANKING', 'COLOCAÇÃO', 'CLASS', 'CLASS.', 'ORDEM'] },
  { key: 'status', label: 'Status', aliases: ['STATUS', 'SITUAÇÃO', 'SITUACAO', 'ACOMPANHAMENTO', 'SIT', 'SIT.'] },
  { key: 'data_convocacao', label: 'Data Convocação', aliases: ['CONVOCAÇÃO', 'DATA CONVOCAÇÃO', 'DATA_CONVOCACAO', 'DT CONVOCAÇÃO', 'DATA DA CONVOCAÇÃO', 'DT. CONVOCAÇÃO'] },
  { key: 'data_validade', label: 'Validade', aliases: ['VALIDADE', 'VENCIMENTO', 'DATA VALIDADE', 'DATA_VALIDADE', 'DT VALIDADE', 'VIGÊNCIA', 'VIGENCIA'] },
  { key: 'numero_processo_seletivo', label: 'Processo', aliases: ['PROCESSO', 'Nº PROCESSO', 'PROTOCOLO', 'PROCESSO SELETIVO', 'PROC. SELETIVO', 'PS', 'N° PROCESSO'] },
  { key: 'observacao', label: 'Observações', aliases: ['OBSERVAÇÕES', 'OBSERVACAO', 'OBS', 'NOTAS', 'OBS.', 'OBSERVAÇÃO'] },
  { key: 'email', label: 'E-mail', aliases: ['EMAIL', 'E-MAIL', 'CORREIO', 'E MAIL', 'CONTATO EMAIL'] },
  { key: 'telefone', label: 'Telefone', aliases: ['TELEFONE', 'TEL', 'CELULAR', 'CONTATO', 'TEL.', 'FONE', 'WHATSAPP'] },
];

export function getDefaultHeaderRow(type: 'vagas' | 'banco'): number {
  // vagas: headers on row 2 (index 1), banco: headers on row 1 (index 0)
  return type === 'vagas' ? 1 : 0;
}

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeHeader(value: string): string {
  return removeAccents(String(value || '').toUpperCase().trim());
}

export function autoMapColumns(headers: string[], type: 'vagas' | 'banco'): ColumnMapping[] {
  if (!headers || !Array.isArray(headers)) return [];
  
  const config = type === 'vagas' ? VAGA_REQUIRED_COLUMNS : [...BANCO_REQUIRED_COLUMNS, ...BANCO_OPTIONAL_COLUMNS];
  const mappings: ColumnMapping[] = [];
  const usedHeaders = new Set<string>();

  config.forEach(field => {
    const fieldLabelNorm = normalizeHeader(field.label);
    const fieldAliasesNorm = (field.aliases || []).map(a => normalizeHeader(a));

    const availableHeaders = headers.filter(h => !usedHeaders.has(h));

    // Try exact match first
    let foundHeader = availableHeaders.find(h => {
      if (!h) return false;
      const normH = normalizeHeader(h);
      return normH === fieldLabelNorm;
    });
    
    // Try aliases
    if (!foundHeader) {
      foundHeader = availableHeaders.find(h => {
        if (!h) return false;
        const normH = normalizeHeader(h);
        return fieldAliasesNorm.includes(normH);
      });
    }

    // Try partial match if still not found
    if (!foundHeader) {
      foundHeader = availableHeaders.find(h => {
        if (!h) return false;
        const normH = normalizeHeader(h);
        return fieldAliasesNorm.some(alias => {
          if (alias.length < 3 || normH.length < 3) return false;
          return normH.includes(alias) || alias.includes(normH);
        });
      });
    }

    if (foundHeader) {
      usedHeaders.add(foundHeader);
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
