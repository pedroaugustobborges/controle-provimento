import mammoth from 'mammoth';

export type EntrevistaTipo = 'unica' | 'duas_datas' | 'periodo';

export interface ParsedEtapa {
  /** Nome bruto extraído da coluna ETAPA */
  etapaOriginal: string;
  /** Chave normalizada da etapa do sistema (ex.: data_entrevistas) — pode ser null se não houver match */
  cronogramaKey: string | null;
  /** Label legível para a etapa do sistema (quando match) */
  cronogramaLabel: string | null;
  /** Tipo (relevante principalmente para Entrevistas) */
  tipo: EntrevistaTipo;
  /** Datas no formato ISO yyyy-mm-dd */
  datas: string[];
  /** Texto bruto da coluna DATA */
  textoOriginal: string;
}

export interface ParsedCronograma {
  /** Ex.: "Anexo VII" */
  anexo: string;
  /** Ex.: "Cirurgião Dentista – Odontopediatria" */
  cargo: string;
  etapas: ParsedEtapa[];
}

/** Normaliza espaços não-quebráveis, hífens tipográficos, espaços múltiplos e
 *  insere espaço entre letra-minúscula+letra-Maiúscula (colagem comum do Word
 *  quando há quebra de linha dentro de célula, ex.: "daAvaliação"). */
const normalizeText = (s: string) =>
  (s || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // separa "daAvaliação" → "da Avaliação", "doRecurso" → "do Recurso", etc.
    .replace(/([a-záéíóúâêôãõç])([A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

const stripAccents = (s: string) =>
  normalizeText(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Mapa de palavras-chave → chave do cronograma do sistema.
 *  ATENÇÃO: ordem importa apenas no desempate por tamanho do match (mais longo vence).
 *  Inclua sempre as variantes mais específicas primeiro nos `matchers`.
 */
const ETAPA_KEYWORDS: Array<{ key: string; label: string; matchers: string[] }> = [
  { key: 'data_publicacao_edital', label: 'Publicação do Edital', matchers: ['publicacao do edital', 'publicacao'] },

  // Inscrições (singular ou plural)
  { key: 'data_inicio_inscricao', label: 'Início das Inscrições', matchers: [
    'inicio das inscricoes', 'inicio inscricoes', 'abertura das inscricoes',
    'inicio inscricao', 'inicio da inscricao', 'abertura da inscricao',
  ]},
  { key: 'data_fim_inscricao', label: 'Fim das Inscrições', matchers: [
    'fim das inscricoes', 'encerramento das inscricoes', 'termino das inscricoes',
    'fim inscricoes', 'fim da inscricao', 'encerramento da inscricao', 'termino da inscricao',
  ]},
  // Genérico "Inscrição/Inscrições" (período em uma só linha) — chave especial tratada no parse de linhas
  { key: 'inscricao_periodo', label: 'Período de Inscrição', matchers: [
    'periodo de inscricao', 'periodo das inscricoes', 'inscricoes', 'inscricao',
  ]},

  { key: 'data_triagem', label: 'Triagem', matchers: ['triagem'] },

  // Avaliação Específica Online
  { key: 'data_avaliacao_especifica_online', label: 'Avaliação Específica Online', matchers: [
    'avaliacao especifica online', 'avaliacao online', 'avaliacao especifica',
  ]},
  { key: 'data_resultado_preliminar_avaliacao_especifica', label: 'Resultado Preliminar (Avaliação)', matchers: [
    'resultado preliminar da avaliacao especifica online',
    'resultado preliminar da avaliacao especifica',
    'resultado preliminar da avaliacao',
    'resultado preliminar',
  ]},
  { key: 'data_recurso_avaliacao_especifica', label: 'Prazo para Recurso (Avaliação)', matchers: [
    'prazo para recurso da avaliacao especifica online',
    'prazo para recurso da avaliacao especifica',
    'prazo para recurso da avaliacao',
    'periodo de recurso da avaliacao',
    'periodo de recurso',
    'prazo para recurso',
    'recurso da avaliacao especifica',
    'recurso avaliacao',
  ]},
  { key: 'data_resultado_recurso_avaliacao_especifica', label: 'Resultado do Recurso (Avaliação)', matchers: [
    'resultado do recurso da avaliacao especifica online',
    'resultado do recurso da avaliacao especifica',
    'resultado do recurso da avaliacao',
    'resultado do recurso',
  ]},
  { key: 'data_resultado_final_avaliacao_especifica', label: 'Resultado Final (Avaliação)', matchers: [
    'resultado final da avaliacao especifica online',
    'resultado final da avaliacao especifica',
    'resultado final da avaliacao',
  ]},

  // Análise Curricular (Médico, Cirurgião-Dentista, etc.)
  { key: 'data_envio_titulos', label: 'Envio de Títulos/Certificados', matchers: [
    'envio dos certificados, titulos e aperfeicoamentos',
    'envio dos certificados titulos e aperfeicoamentos',
    'envio dos certificados',
    'envio dos titulos',
    'envio de titulos',
    'envio de certificados',
    'declaracao de experiencia profissional',
  ]},
  { key: 'data_resultado_preliminar_analise_curricular', label: 'Resultado Preliminar (Análise Curricular)', matchers: [
    'resultado preliminar da analise curricular',
    'resultado preliminar da analise',
  ]},
  { key: 'data_recurso_analise_curricular', label: 'Prazo para Recurso (Análise Curricular)', matchers: [
    'prazo para recurso da analise curricular',
    'periodo de recurso da analise curricular',
    'recurso da analise curricular',
  ]},
  { key: 'data_resultado_recurso_analise_curricular', label: 'Resultado do Recurso (Análise Curricular)', matchers: [
    'resultado do recurso da analise curricular',
  ]},
  { key: 'data_resultado_final_analise_curricular', label: 'Resultado Final (Análise Curricular)', matchers: [
    'resultado final da analise curricular',
  ]},

  // Entrevistas
  { key: 'data_entrevistas', label: 'Entrevistas', matchers: ['entrevistas', 'entrevista'] },

  // Resultado Final do Processo
  { key: 'data_resultado_final_seletivo', label: 'Resultado Final Seletivo', matchers: [
    'resultado final do processo seletivo',
    'resultado final do processo',
    'resultado final seletivo',
    'homologacao do resultado',
    'homologacao',
    'resultado final',
  ]},
];

function matchEtapa(rawName: string): { key: string; label: string } | null {
  const norm = stripAccents(rawName).replace(/\s+/g, ' ');
  // Prioriza match mais longo (mais específico)
  let best: { key: string; label: string; len: number } | null = null;
  for (const { key, label, matchers } of ETAPA_KEYWORDS) {
    for (const m of matchers) {
      if (norm.includes(m)) {
        if (!best || m.length > best.len) {
          best = { key, label, len: m.length };
        }
      }
    }
  }
  return best ? { key: best.key, label: best.label } : null;
}

/** Converte "dd/mm/yyyy" ou "dd/mm/yy" → "yyyy-mm-dd" */
function brToIso(br: string): string | null {
  const m = br.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = (parseInt(y, 10) > 50 ? '19' : '20') + y;
  const dd = d.padStart(2, '0');
  const mm = mo.padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/** Extrai todas as datas dd/mm/yyyy do texto, na ordem */
function extractDates(text: string): string[] {
  const matches = text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g) || [];
  return matches.map(brToIso).filter((d): d is string => !!d);
}

/** Heurística do tipo (apenas relevante para Entrevistas, mas calculado para todas) */
function detectTipo(text: string, datas: string[]): EntrevistaTipo {
  if (datas.length <= 1) return 'unica';
  const norm = stripAccents(text);
  // "e/ou", "e", "ou", "," entre datas → datas discretas (não intervalo)
  // Verifica ANTES de período, porque "e/ou" contém "/" e poderia confundir.
  const hasDiscreteSep = /\d[^\d]*\b(e\/ou|e ou|e|ou)\b[^\d]*\d/.test(norm)
    || /\d\s*,\s*\d/.test(norm);
  if (hasDiscreteSep) return 'duas_datas';
  // Período: "a", "ate", "até", "-", "–", "—" entre dois números (mas não confundir com dd/mm/yyyy)
  if (/\d\s*(a|ate|ate|–|—|-)\s+\d/.test(norm) || /\d{4}\s*(a|ate|–|—|-)\s*\d/.test(norm)) return 'periodo';
  if (datas.length === 2) return 'duas_datas';
  return 'periodo';
}

/** Indica se um texto identifica um anexo de cronograma de cargo. */
function parseAnexoCronogramaTitle(text: string): { anexo: string; cargo: string } | null {
  const clean = normalizeText(text);
  const norm = stripAccents(clean);

  // Aceita variações: "cronograma de selecao para o cargo", "cronograma para o cargo",
  // "cronograma do processo seletivo ... cargo", "cronograma ... cargo de"
  const hasCronograma = /cronograma/.test(norm);
  if (!hasCronograma) return null;

  // EXIGE explicitamente "cargo de" (com dois pontos opcionais) seguido de um cargo real,
  // para evitar falsos positivos como "...na data prevista no Cronograma, Anexo V."
  const idxCargoDe = norm.indexOf('cargo de');
  if (idxCargoDe === -1) return null;

  // Captura "Anexo XXX" no início, se houver
  let anexo = '';
  const mAnexo = clean.match(/Anexo\s+[IVXLCDM\d]+/i);
  if (mAnexo) anexo = mAnexo[0];

  // Captura cargo após "Cargo de:" ou "Cargo de"
  let after = clean.substring(idxCargoDe + 'cargo de'.length);
  // remove ":" ou "-" iniciais e pontuação final
  after = after.replace(/^\s*[:\-–—]\s*/, '').trim();
  let cargo = after.split(/\s{2,}|\n|\r/)[0].trim();
  // remove ponto final que vem do .docx
  cargo = cargo.replace(/[.,;]+$/, '').trim();
  if (cargo.length > 240) cargo = cargo.substring(0, 240).trim() + '…';

  // Sem cargo extraído de forma útil, descarta — evita "(cargo não identificado)" falso
  if (!cargo || cargo.length < 3) return null;

  // Sanity: o título deve começar com "Anexo" OU conter "cronograma" + "cargo de" próximos
  // (no máximo 80 chars de distância) para evitar que parágrafos longos mencionando
  // "cronograma" e depois "cargo de" sejam considerados títulos.
  const idxCronograma = norm.indexOf('cronograma');
  if (!anexo && Math.abs(idxCargoDe - idxCronograma) > 80) return null;

  return { anexo: anexo || 'Cronograma', cargo };
}

export type CronogramaParseStep =
  | 'validacao_tipo'
  | 'leitura_arquivo'
  | 'conversao_docx'
  | 'parse_html'
  | 'extracao_cronograma'
  | 'desconhecido';

export interface CronogramaParseError {
  step: CronogramaParseStep;
  message: string;
  hint?: string;
  /** Detalhes técnicos crus (mensagem do erro original, etc.) */
  raw?: string;
}

export interface CronogramaParseResult {
  ok: boolean;
  errorMessage?: string;
  /** Detalhes estruturados do erro, quando ok=false */
  error?: CronogramaParseError;
  cronogramas: ParsedCronograma[];
}

/** Diagnóstico: motivo de rejeição de uma tabela */
export interface TableRejection {
  index: number;
  motivo: string;
  headers: string[];
  primeiraLinha?: string[];
}

const isEtapaHeader = (h: string) =>
  /\b(etapa|etapas|fase|fases|atividade|atividades|evento|eventos)\b/.test(h);
const isDataHeader = (h: string) =>
  /\b(data|datas|periodo|prazo|prazos|cronograma)\b/.test(h);

/** Extrai etapas de uma <table>. Trata "Inscrição" (período) abrindo em início+fim. */
function extractEtapasFromTable(
  table: HTMLTableElement,
  rejections?: TableRejection[],
  tableIndex = 0,
): ParsedEtapa[] {
  const rows = Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr'));
  // fallback: se não achou rows diretas, pega todas (caso mammoth não gere tbody)
  const allRows = rows.length > 0 ? rows : Array.from(table.querySelectorAll('tr'));
  if (allRows.length < 2) {
    rejections?.push({ index: tableIndex, motivo: 'menos de 2 linhas', headers: [] });
    return [];
  }

  const readHeaders = (rowIdx: number) =>
    Array.from(allRows[rowIdx].querySelectorAll(':scope > th, :scope > td'))
      .map((c) => stripAccents(c.textContent || ''));

  let headerCells = readHeaders(0);
  let etapaCol = headerCells.findIndex(isEtapaHeader);
  let dataCol = headerCells.findIndex(isDataHeader);
  let startRow = 1;

  // Tenta as próximas 2 linhas como cabeçalho (alguns docs têm título mesclado na 1ª)
  if (etapaCol === -1 || dataCol === -1) {
    for (let tryRow = 1; tryRow < Math.min(3, allRows.length); tryRow++) {
      const h = readHeaders(tryRow);
      const e = h.findIndex(isEtapaHeader);
      const d = h.findIndex(isDataHeader);
      if (e !== -1 && d !== -1) {
        etapaCol = e;
        dataCol = d;
        startRow = tryRow + 1;
        headerCells = h;
        break;
      }
    }
  }

  if (etapaCol === -1 || dataCol === -1) {
    rejections?.push({
      index: tableIndex,
      motivo: 'cabeçalho ETAPA/DATA não encontrado',
      headers: headerCells,
      primeiraLinha: allRows[1] ? readHeaders(1) : undefined,
    });
    return [];
  }

  const etapas: ParsedEtapa[] = [];
  for (let i = startRow; i < allRows.length; i++) {
    const cells = Array.from(allRows[i].querySelectorAll(':scope > th, :scope > td'));
    const cellsToUse = cells.length > 0 ? cells : Array.from(allRows[i].querySelectorAll('th, td'));
    if (cellsToUse.length <= Math.max(etapaCol, dataCol)) continue;
    const etapaText = normalizeText(cellsToUse[etapaCol].textContent || '');
    const dataText = normalizeText(cellsToUse[dataCol].textContent || '');
    if (!etapaText && !dataText) continue;

    const datas = extractDates(dataText);
    const tipo = detectTipo(dataText, datas);
    const match = matchEtapa(etapaText);

    if (match && match.key === 'inscricao_periodo') {
      if (datas.length >= 2) {
        etapas.push({
          etapaOriginal: etapaText,
          cronogramaKey: 'data_inicio_inscricao',
          cronogramaLabel: 'Início das Inscrições',
          tipo: 'unica',
          datas: [datas[0]],
          textoOriginal: dataText,
        });
        etapas.push({
          etapaOriginal: etapaText,
          cronogramaKey: 'data_fim_inscricao',
          cronogramaLabel: 'Fim das Inscrições',
          tipo: 'unica',
          datas: [datas[datas.length - 1]],
          textoOriginal: dataText,
        });
        continue;
      }
      if (datas.length === 1) {
        etapas.push({
          etapaOriginal: etapaText,
          cronogramaKey: 'data_inicio_inscricao',
          cronogramaLabel: 'Início das Inscrições',
          tipo: 'unica',
          datas: [datas[0]],
          textoOriginal: dataText,
        });
        continue;
      }
    }

    etapas.push({
      etapaOriginal: etapaText,
      cronogramaKey: match?.key ?? null,
      cronogramaLabel: match?.label ?? null,
      tipo,
      datas,
      textoOriginal: dataText,
    });
  }

  if (etapas.length === 0) {
    rejections?.push({
      index: tableIndex,
      motivo: 'cabeçalho ok mas nenhuma linha com dados úteis',
      headers: headerCells,
    });
  }

  return etapas;
}

/**
 * Parseia um arquivo .docx procurando TODOS os anexos contendo
 * "Cronograma de Seleção para o Cargo de: ..." e a próxima tabela
 * com colunas ETAPA + DATA.
 */
function fail(step: CronogramaParseStep, message: string, hint?: string, raw?: string): CronogramaParseResult {
  const payload = { step, message, hint, raw };
  // eslint-disable-next-line no-console
  console.error('[word-import]', payload);
  return {
    ok: false,
    errorMessage: message,
    error: payload,
    cronogramas: [],
  };
}

export async function parseCronogramaFromDocx(file: File): Promise<CronogramaParseResult> {
  // 1. Validação de tipo
  if (!file) {
    return fail('validacao_tipo', 'Nenhum arquivo recebido.', 'Selecione um arquivo .docx e tente novamente.');
  }
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) {
    return fail(
      'validacao_tipo',
      'Formato .doc (Word antigo) não é suportado.',
      'Abra o arquivo no Word e use "Salvar como" → escolha "Documento do Word (.docx)" e tente novamente.',
    );
  }
  if (!/\.docx$/i.test(file.name)) {
    return fail(
      'validacao_tipo',
      `Tipo de arquivo não suportado: ${file.name.split('.').pop() || 'desconhecido'}.`,
      'A leitura automática só funciona com arquivos .docx (Word moderno).',
    );
  }
  if (file.size === 0) {
    return fail('validacao_tipo', 'Arquivo vazio.', 'Selecione um arquivo .docx válido.');
  }
  if (file.size > 25 * 1024 * 1024) {
    return fail('validacao_tipo', 'Arquivo muito grande (máx. 25 MB).', 'Reduza o arquivo ou divida-o.');
  }

  // 2. Leitura do arquivo
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (err: any) {
    return fail('leitura_arquivo', 'Não foi possível ler o conteúdo do arquivo.', 'Tente novamente. Se persistir, baixe o arquivo de novo da origem.', String(err?.message ?? err));
  }

  // 3. Conversão DOCX → HTML (mammoth)
  let html: string;
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    html = result.value;
  } catch (err: any) {
    const raw = String(err?.message ?? err);
    let hint = 'Verifique se o arquivo abre normalmente no Word. Se ele foi exportado de outro app (Google Docs, Pages), reabra no Word e salve como .docx.';
    if (/zip|central directory|end of central/i.test(raw)) {
      hint = 'O arquivo parece corrompido ou não é um .docx real (pode ser um PDF/.doc renomeado). Reexporte como .docx no Word.';
    }
    return fail('conversao_docx', 'Falha ao decodificar o arquivo .docx.', hint, raw);
  }

  if (!html || html.trim().length === 0) {
    return fail('conversao_docx', 'O arquivo Word não tem conteúdo legível.', 'Confirme que o documento contém texto/tabelas e tente novamente.');
  }

  // 4. Parse HTML
  let doc: Document;
  let allNodes: Element[];
  let tables: HTMLTableElement[];
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
    allNodes = Array.from(doc.body.querySelectorAll('*'));
    tables = Array.from(doc.body.querySelectorAll('table')) as HTMLTableElement[];
  } catch (err: any) {
    return fail('parse_html', 'Falha ao interpretar o conteúdo do Word.', 'Tente reabrir o arquivo no Word e salvar novamente.', String(err?.message ?? err));
  }

  // 5. Extração de cronogramas
  const rejections: TableRejection[] = [];
  try {
    type TitleHit = { idx: number; anexo: string; cargo: string; inTable: boolean };
    const allTitleHits: TitleHit[] = [];
    const TITLE_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH']);
    for (let i = 0; i < allNodes.length; i++) {
      const node = allNodes[i];
      if (!TITLE_TAGS.has(node.tagName)) continue;
      const txt = normalizeText(node.textContent || '');
      if (!txt || txt.length > 500) continue;
      const parsed = parseAnexoCronogramaTitle(txt);
      if (!parsed) continue;
      const last = allTitleHits[allTitleHits.length - 1];
      if (last && last.cargo === parsed.cargo && Math.abs(last.idx - i) < 8) continue;
      allTitleHits.push({ idx: i, anexo: parsed.anexo, cargo: parsed.cargo, inTable: !!node.closest('table') });
    }

    // Estratégia híbrida: títulos DENTRO de tabelas têm prioridade (são as células-título
    // do próprio cronograma). MAS, se sobrarem tabelas com cabeçalho ETAPA/DATA não cobertas
    // por nenhum título-em-tabela, completamos com títulos fora (parágrafos antes da tabela).
    // Isto resolve o caso de cronogramas onde o último Anexo tem o título em parágrafo
    // separado, fora da grid da tabela — antes ele era descartado.
    const inTableHits = allTitleHits.filter((h) => h.inTable);
    const outTableHits = allTitleHits.filter((h) => !h.inTable);
    const titles: TitleHit[] = inTableHits.length > 0
      ? [...inTableHits, ...outTableHits]
      : allTitleHits;
    // Ordena por posição no documento — garante associação correta título→próxima tabela.
    titles.sort((a, b) => a.idx - b.idx);

    const cronogramas: ParsedCronograma[] = [];
    const usedTables = new Set<HTMLTableElement>();

    if (titles.length > 0) {
      for (let t = 0; t < titles.length; t++) {
        const title = titles[t];
        // Se o título está DENTRO de uma tabela, essa tabela É a do cronograma
        // (o Word mescla a 1ª linha como faixa-título). Não procuramos a "próxima".
        if (title.inTable) {
          const containerTable = (allNodes[title.idx] as Element).closest('table') as HTMLTableElement | null;
          if (containerTable && !usedTables.has(containerTable)) {
            const tIdx = tables.indexOf(containerTable);
            const etapas = extractEtapasFromTable(containerTable, rejections, tIdx);
            if (etapas.length > 0) {
              usedTables.add(containerTable);
              cronogramas.push({ anexo: title.anexo, cargo: title.cargo, etapas });
              continue;
            }
          }
        }
        // Caso contrário (título em parágrafo), pega a próxima tabela com ETAPA+DATA.
        const start = title.idx;
        for (const tbl of tables) {
          if (usedTables.has(tbl)) continue;
          const pos = allNodes.indexOf(tbl);
          if (pos <= start) continue;
          const tIdx = tables.indexOf(tbl);
          const etapas = extractEtapasFromTable(tbl, rejections, tIdx);
          if (etapas.length > 0) {
            usedTables.add(tbl);
            cronogramas.push({ anexo: title.anexo, cargo: title.cargo, etapas });
            break;
          }
        }
      }
    }


    // Fallback: tentar QUALQUER tabela com cabeçalho ETAPA+DATA, mesmo sem título identificado
    if (cronogramas.length === 0) {
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const etapas = extractEtapasFromTable(table, rejections, i);
        if (etapas.length > 0) {
          cronogramas.push({
            anexo: 'Cronograma',
            cargo: '(cargo não identificado)',
            etapas,
          });
        }
      }
    }

    if (cronogramas.length === 0) {
      const motivos = rejections
        .slice(0, 8)
        .map((r) => `#${r.index + 1}: ${r.motivo} [headers: ${r.headers.join(' | ') || '∅'}]`)
        .join('\n');
      const tablesInfo = `Tabelas encontradas: ${tables.length}. Rejeições:\n${motivos || '(nenhuma diagnosticada)'}`;
      // eslint-disable-next-line no-console
      console.warn('[cronograma-parser] tabelas rejeitadas:', rejections);
      return fail(
        'extracao_cronograma',
        'Nenhum cronograma reconhecido no arquivo.',
        'O sistema agora aceita variações como "ETAPAS"/"FASE"/"ATIVIDADE" e "DATA"/"DATAS"/"PERÍODO"/"PRAZO". Verifique se a tabela do cronograma tem cabeçalho com essas palavras. Você também pode anexar este .docx aqui na conversa para diagnóstico.',
        tablesInfo,
      );
    }

    return { ok: true, cronogramas };
  } catch (err: any) {
    return fail('extracao_cronograma', 'Erro inesperado ao extrair o cronograma.', 'Use o botão "Baixar arquivo para diagnóstico" e anexe-o aqui na conversa.', String(err?.message ?? err));
  }
}
