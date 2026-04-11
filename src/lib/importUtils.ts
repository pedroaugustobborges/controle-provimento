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

export const VAGA_OPTIONAL_COLUMNS = [
  { key: 'secao', label: 'Seção', aliases: ['SECAO', 'SEÇÃO', 'SETOR', 'DEPARTAMENTO'] },
  { key: 'data_convocacao_planilha', label: 'Data Convocação', aliases: ['DATA_CONVOCACAO', 'CONVOCAÇÃO', 'DATA CONVOCAÇÃO'] },
  { key: 'horario_convocacao_planilha', label: 'Horário', aliases: ['HORARIO', 'HORÁRIO', 'HORA'] },
  { key: 'candidato_convocado_planilha', label: 'Candidato Convocado', aliases: ['CANDIDATO_CONVOCADO', 'NOME CANDIDATO', 'CANDIDATO'] },
  { key: 'classificacao_convocacao_planilha', label: 'Classificação Conv.', aliases: ['CLASSIFICACAO_CONV', 'CLASSIFICAÇÃO CONV', 'ORDEM'] },
  { key: 'forma_convocacao_planilha', label: 'Forma', aliases: ['FORMA', 'MEIO', 'CANAL'] },
  { key: 'status_oitiva_convocacao_planilha', label: 'Status Oitiva', aliases: ['STATUS_OITIVA', 'OITIVA'] },
  { key: 'admissao_enviada_acompanhamento', label: 'Admissão Enviada', aliases: ['ADMISSAO_ENVIADA_DATA', 'DATA ADMISSÃO ENVIADA'] },
  { key: 'admissao_efetivada_acompanhamento', label: 'Admissão Efetivada', aliases: ['ADMISSAO_EFETIVADA_DATA', 'DATA ADMISSÃO EFETIVADA'] },
  { key: 'detalhes_acompanhamento', label: 'Detalhes', aliases: ['DETALHES'] },
  { key: 'observacao', label: 'Observação', aliases: ['OBSERVACAO', 'OBSERVAÇÃO', 'OBS', 'NOTAS'] },
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
  { key: 'data_publicacao', label: 'Data Publicação', aliases: ['PUBLICAÇÃO', 'DATA PUBLICAÇÃO', 'DATA_PUBLICACAO', 'DT PUBLICAÇÃO', 'DATA DA PUBLICAÇÃO', 'DT. PUBLICAÇÃO', 'ABERTURA', 'DATA ABERTURA'] },
  { key: 'data_convocacao', label: 'Data Convocação', aliases: ['CONVOCAÇÃO', 'DATA CONVOCAÇÃO', 'DATA_CONVOCACAO', 'DT CONVOCAÇÃO', 'DATA DA CONVOCAÇÃO', 'DT. CONVOCAÇÃO'] },
  { key: 'data_validade', label: 'Validade', aliases: ['VALIDADE', 'VENCIMENTO', 'DATA VALIDADE', 'DATA_VALIDADE', 'DT VALIDADE', 'VIGÊNCIA', 'VIGENCIA'] },
  { key: 'numero_processo_seletivo', label: 'Processo', aliases: ['PROCESSO', 'Nº PROCESSO', 'PROTOCOLO', 'PROCESSO SELETIVO', 'PROC. SELETIVO', 'PS', 'N° PROCESSO'] },
  { key: 'unidade_convocacao', label: 'Unidade Convocação', aliases: ['UNIDADE CONVOCAÇÃO', 'UNIDADE_CONVOCACAO', 'UNIDADE CONVOCADA', 'UNID. CONVOCAÇÃO', 'UNID CONVOCAÇÃO', 'LOCAL CONVOCAÇÃO'] },
  { key: 'numero_chamada', label: 'Nº Chamada', aliases: ['NUMERO CHAMADA', 'Nº CHAMADA', 'N° CHAMADA', 'NUM CHAMADA', 'CHAMADA', 'NR CHAMADA', 'NUMERO DA CHAMADA', 'Nº DA CHAMADA'] },
  { key: 'prorrogacao', label: 'Prorrogação', aliases: ['PRORROGAÇÃO', 'PRORROGACAO', 'PRORROGADO', 'PRORROG', 'PRORROG.', 'COLUNA L', 'L', 'PRORROGACAO (L)'] },
  { key: 'quantidade_banco', label: 'Qtd. Banco', aliases: ['QUANTIDADE BANCO', 'QTD BANCO', 'QTD. BANCO', 'QUANTIDADE', 'QTD', 'QTDE', 'QTDE BANCO', 'NUMERO BANCO', 'Nº BANCO'] },
  { key: 'observacao', label: 'Observações', aliases: ['OBSERVAÇÕES', 'OBSERVACAO', 'OBS', 'NOTAS', 'OBS.', 'OBSERVAÇÃO'] },
  { key: 'email', label: 'E-mail', aliases: ['EMAIL', 'E-MAIL', 'CORREIO', 'E MAIL', 'CONTATO EMAIL'] },
  { key: 'telefone', label: 'Telefone', aliases: ['TELEFONE', 'TEL', 'CELULAR', 'CONTATO', 'TEL.', 'FONE', 'WHATSAPP'] },
];

export function getDefaultHeaderRow(type: 'vagas' | 'banco'): number {
  // Para Vagas deixamos o usuário escolher, mas o padrão sugerido era 2 (índice 1)
  // Para Banco o padrão é 1 (índice 0)
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
  
  const config = type === 'vagas' 
    ? [...VAGA_REQUIRED_COLUMNS, ...VAGA_OPTIONAL_COLUMNS] 
    : [...BANCO_REQUIRED_COLUMNS, ...BANCO_OPTIONAL_COLUMNS];
    
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

    // Special case for Prorrogação in Banco (Column L is common)
    if (!foundHeader && type === 'banco' && field.key === 'prorrogacao' && headers.length >= 12) {
      const colL = headers[11];
      if (colL && (normalizeHeader(colL) === '' || normalizeHeader(colL).includes('L') || normalizeHeader(colL).includes('PRORROG'))) {
        foundHeader = colL;
      }
    }

    if (foundHeader) {
      usedHeaders.add(foundHeader);
      const isDate = field.key.includes('data') || 
                     field.key.includes('_data') || 
                     field.key === 'data_abertura' || 
                     field.key === 'data_recebimento' || 
                     field.key === 'data_convocacao' || 
                     field.key === 'data_validade';
                     
      mappings.push({
        excel: foundHeader,
        system: field.key,
        isDate
      });
    }
  });

  return mappings;
}