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

const stripAccents = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

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
  // Período: "a", "ate", "-", "–", "—"
  if (/\d\s*(a|ate|–|—|-)\s*\d/.test(norm)) return 'periodo';
  // Duas datas explícitas: "e", ","
  if (datas.length === 2) return 'duas_datas';
  return 'periodo';
}

/** Indica se um texto identifica um anexo de cronograma de cargo. */
function parseAnexoCronogramaTitle(text: string): { anexo: string; cargo: string } | null {
  const clean = text.replace(/\s+/g, ' ').trim();
  const norm = stripAccents(clean);
  // Procura o trecho "cronograma de selecao para o cargo de"
  if (!norm.includes('cronograma de selecao para o cargo')) return null;

  // Captura "Anexo XXX" no início, se houver
  let anexo = '';
  const mAnexo = clean.match(/Anexo\s+[IVXLCDM\d]+/i);
  if (mAnexo) anexo = mAnexo[0];

  // Captura cargo após "Cargo de:" ou "Cargo de"
  const idx = norm.indexOf('cargo de');
  let cargo = '';
  if (idx !== -1) {
    // posição correspondente em `clean` (mesmo tamanho pois apenas troca acentos)
    let after = clean.substring(idx + 'cargo de'.length);
    // remove ":" ou "-" iniciais
    after = after.replace(/^\s*[:\-–—]\s*/, '').trim();
    cargo = after.split(/\s{2,}|\n|\r/)[0].trim();
    // limita comprimento sensato
    if (cargo.length > 200) cargo = cargo.substring(0, 200);
  }

  return { anexo: anexo || 'Cronograma', cargo: cargo || '(cargo não identificado)' };
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

/** Extrai etapas de uma <table>. Trata "Inscrição" (período) abrindo em início+fim. */
function extractEtapasFromTable(table: HTMLTableElement): ParsedEtapa[] {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length < 2) return [];

  const headerCells = Array.from(rows[0].querySelectorAll('th, td'))
    .map((c) => stripAccents(c.textContent || ''));
  let etapaCol = headerCells.findIndex((h) => h.includes('etapa'));
  let dataCol = headerCells.findIndex((h) => h.includes('data'));
  let startRow = 1;

  if (etapaCol === -1 || dataCol === -1) {
    // tenta segunda linha como cabeçalho
    if (rows.length >= 2) {
      const h2 = Array.from(rows[1].querySelectorAll('th, td')).map((c) => stripAccents(c.textContent || ''));
      const e2 = h2.findIndex((h) => h.includes('etapa'));
      const d2 = h2.findIndex((h) => h.includes('data'));
      if (e2 !== -1 && d2 !== -1) {
        etapaCol = e2;
        dataCol = d2;
        startRow = 2;
      }
    }
  }

  if (etapaCol === -1 || dataCol === -1) return [];

  const etapas: ParsedEtapa[] = [];
  for (let i = startRow; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll('th, td'));
    if (cells.length <= Math.max(etapaCol, dataCol)) continue;
    const etapaText = (cells[etapaCol].textContent || '').trim();
    const dataText = (cells[dataCol].textContent || '').trim();
    if (!etapaText && !dataText) continue;

    const datas = extractDates(dataText);
    const tipo = detectTipo(dataText, datas);
    const match = matchEtapa(etapaText);

    // Caso especial: linha "Inscrição/Inscrições" com período → expande para início+fim
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
  try {
    type TitleHit = { idx: number; anexo: string; cargo: string };
    const titles: TitleHit[] = [];
    for (let i = 0; i < allNodes.length; i++) {
      const node = allNodes[i];
      if (node.closest('table')) continue;
      const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      const parsed = parseAnexoCronogramaTitle(txt);
      if (parsed) {
        const last = titles[titles.length - 1];
        if (last && last.cargo === parsed.cargo && Math.abs(last.idx - i) < 3) continue;
        titles.push({ idx: i, anexo: parsed.anexo, cargo: parsed.cargo });
      }
    }

    const cronogramas: ParsedCronograma[] = [];

    if (titles.length > 0) {
      for (let t = 0; t < titles.length; t++) {
        const start = titles[t].idx;
        const end = t + 1 < titles.length ? titles[t + 1].idx : Infinity;
        const table = tables.find((tbl) => {
          const pos = allNodes.indexOf(tbl);
          return pos > start && pos < end;
        });
        if (!table) continue;
        const etapas = extractEtapasFromTable(table);
        if (etapas.length > 0) {
          cronogramas.push({ anexo: titles[t].anexo, cargo: titles[t].cargo, etapas });
        }
      }
    }

    if (cronogramas.length === 0) {
      let anexoIdx = -1;
      for (let i = 0; i < allNodes.length; i++) {
        const txt = stripAccents(allNodes[i].textContent || '');
        if (/^anexo\b/.test(txt) || txt.startsWith('anexo ')) {
          anexoIdx = i;
          break;
        }
      }
      for (const table of tables) {
        const pos = allNodes.indexOf(table);
        if (anexoIdx !== -1 && pos < anexoIdx) continue;
        const headers = Array.from(table.querySelectorAll('tr')[0]?.querySelectorAll('th, td') || [])
          .map((c) => stripAccents(c.textContent || ''));
        if (headers.some((h) => h.includes('etapa')) && headers.some((h) => h.includes('data'))) {
          const etapas = extractEtapasFromTable(table);
          if (etapas.length > 0) {
            cronogramas.push({ anexo: 'Cronograma', cargo: '(cargo não identificado)', etapas });
          }
        }
      }
    }

    if (cronogramas.length === 0) {
      const tablesInfo = `Tabelas encontradas: ${tables.length}.`;
      return fail(
        'extracao_cronograma',
        'Nenhum cronograma reconhecido no arquivo.',
        'Confirme que o Word contém um trecho como "Anexo … Cronograma de Seleção para o Cargo de: …" seguido de uma tabela com colunas "ETAPA" e "DATA". Você também pode anexar este .docx aqui na conversa para diagnóstico.',
        tablesInfo,
      );
    }

    return { ok: true, cronogramas };
  } catch (err: any) {
    return fail('extracao_cronograma', 'Erro inesperado ao extrair o cronograma.', 'Use o botão "Baixar arquivo para diagnóstico" e anexe-o aqui na conversa.', String(err?.message ?? err));
  }
}
