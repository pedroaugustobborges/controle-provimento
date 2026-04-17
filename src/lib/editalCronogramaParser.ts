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

const stripAccents = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Mapa de palavras-chave → chave do cronograma do sistema */
const ETAPA_KEYWORDS: Array<{ key: string; label: string; matchers: string[] }> = [
  { key: 'data_publicacao_edital', label: 'Publicação do Edital', matchers: ['publicacao do edital', 'publicacao'] },
  { key: 'data_inicio_inscricao', label: 'Início das Inscrições', matchers: ['inicio das inscricoes', 'inicio inscricoes', 'abertura das inscricoes', 'inicio inscricao'] },
  { key: 'data_fim_inscricao', label: 'Fim das Inscrições', matchers: ['fim das inscricoes', 'encerramento das inscricoes', 'termino das inscricoes', 'fim inscricoes'] },
  { key: 'data_triagem', label: 'Triagem', matchers: ['triagem'] },
  { key: 'data_avaliacao_especifica_online', label: 'Avaliação Online', matchers: ['avaliacao especifica online', 'avaliacao online', 'avaliacao especifica'] },
  { key: 'data_resultado_preliminar_avaliacao_especifica', label: 'Resultado Preliminar', matchers: ['resultado preliminar'] },
  { key: 'data_recurso_avaliacao_especifica', label: 'Período de Recurso', matchers: ['periodo de recurso', 'prazo para recurso', 'recurso da avaliacao', 'recurso avaliacao', 'recurso'] },
  { key: 'data_resultado_recurso_avaliacao_especifica', label: 'Resultado do Recurso', matchers: ['resultado do recurso', 'resultado recurso'] },
  { key: 'data_resultado_final_avaliacao_especifica', label: 'Resultado Final Avaliação', matchers: ['resultado final da avaliacao', 'resultado final avaliacao'] },
  { key: 'data_entrevistas', label: 'Entrevistas', matchers: ['entrevista', 'entrevistas'] },
  { key: 'data_resultado_final_seletivo', label: 'Resultado Final Seletivo', matchers: ['resultado final do processo', 'resultado final seletivo', 'resultado final', 'homologacao'] },
];

function matchEtapa(rawName: string): { key: string; label: string } | null {
  const norm = stripAccents(rawName);
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
  // Período: "a", "ate", "-"
  if (/\d\s*(a|ate|–|—|-)\s*\d/.test(norm)) return 'periodo';
  // Duas datas explícitas: "e", ","
  if (datas.length === 2) return 'duas_datas';
  return 'periodo';
}

export interface CronogramaParseResult {
  ok: boolean;
  errorMessage?: string;
  cargo?: string;
  etapas: ParsedEtapa[];
}

/**
 * Parseia um arquivo .docx procurando:
 *   1. Heading/parágrafo contendo "ANEXO"
 *   2. Tabela seguinte que tenha "Cronograma de Seleção para o Cargo de ..."
 *   3. Colunas "ETAPA" e "DATA"
 */
export async function parseCronogramaFromDocx(file: File): Promise<CronogramaParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

    // Parse HTML em DOM
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const allNodes = Array.from(doc.body.querySelectorAll('*'));

    // 1. Localiza nó com "ANEXO"
    let anexoIdx = -1;
    for (let i = 0; i < allNodes.length; i++) {
      const txt = stripAccents(allNodes[i].textContent || '');
      if (/^anexo\b/.test(txt) || txt.startsWith('anexo ')) {
        anexoIdx = i;
        break;
      }
    }
    if (anexoIdx === -1) {
      return { ok: false, errorMessage: 'Não foi encontrado um título começando com "ANEXO" no documento.', etapas: [] };
    }

    // 2. Procura próxima tabela após ANEXO; também valida cabeçalho "Cronograma de Seleção para o Cargo"
    const tables = Array.from(doc.body.querySelectorAll('table'));
    let cronogramaTable: HTMLTableElement | null = null;
    let cargo: string | undefined;

    for (const table of tables) {
      // Verifica posição relativa: tabela deve aparecer após o ANEXO
      const pos = anexoIdx === -1 ? 0 : allNodes.indexOf(table);
      if (pos !== -1 && pos < anexoIdx) continue;

      const tableText = stripAccents(table.textContent || '');
      if (tableText.includes('cronograma de selecao para o cargo')) {
        cronogramaTable = table as HTMLTableElement;
        // Tenta extrair cargo
        const fullText = (table.textContent || '');
        const mCargo = fullText.match(/Cargo de\s+([^\n]+?)(?:\s{2,}|$|ETAPA)/i);
        if (mCargo) cargo = mCargo[1].trim();
        break;
      }
    }

    // Fallback: aceita qualquer tabela com colunas ETAPA + DATA após ANEXO
    if (!cronogramaTable) {
      for (const table of tables) {
        const pos = allNodes.indexOf(table);
        if (pos < anexoIdx) continue;
        const headers = Array.from(table.querySelectorAll('tr')[0]?.querySelectorAll('th, td') || [])
          .map((c) => stripAccents(c.textContent || ''));
        if (headers.some((h) => h.includes('etapa')) && headers.some((h) => h.includes('data'))) {
          cronogramaTable = table as HTMLTableElement;
          break;
        }
      }
    }

    if (!cronogramaTable) {
      return {
        ok: false,
        errorMessage: 'Não foi possível localizar a tabela "Cronograma de Seleção para o Cargo de..." após o ANEXO.',
        etapas: [],
      };
    }

    // 3. Identifica colunas ETAPA e DATA
    const rows = Array.from(cronogramaTable.querySelectorAll('tr'));
    if (rows.length < 2) {
      return { ok: false, errorMessage: 'A tabela do cronograma está vazia.', etapas: [], cargo };
    }

    const headerCells = Array.from(rows[0].querySelectorAll('th, td')).map((c) => stripAccents(c.textContent || ''));
    let etapaCol = headerCells.findIndex((h) => h.includes('etapa'));
    let dataCol = headerCells.findIndex((h) => h === 'data' || h.startsWith('data ') || h.includes('data'));

    // Se cabeçalho não estiver na primeira linha, tenta a segunda
    if (etapaCol === -1 || dataCol === -1) {
      const headerCells2 = Array.from(rows[1].querySelectorAll('th, td')).map((c) => stripAccents(c.textContent || ''));
      const e2 = headerCells2.findIndex((h) => h.includes('etapa'));
      const d2 = headerCells2.findIndex((h) => h.includes('data'));
      if (e2 !== -1 && d2 !== -1) {
        etapaCol = e2;
        dataCol = d2;
        rows.splice(0, 1);
      }
    }

    if (etapaCol === -1 || dataCol === -1) {
      return { ok: false, errorMessage: 'Cabeçalho da tabela não contém colunas "ETAPA" e "DATA".', etapas: [], cargo };
    }

    // 4. Extrai linhas
    const etapas: ParsedEtapa[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('th, td'));
      if (cells.length <= Math.max(etapaCol, dataCol)) continue;
      const etapaText = (cells[etapaCol].textContent || '').trim();
      const dataText = (cells[dataCol].textContent || '').trim();
      if (!etapaText && !dataText) continue;

      const datas = extractDates(dataText);
      const tipo = detectTipo(dataText, datas);
      const match = matchEtapa(etapaText);

      etapas.push({
        etapaOriginal: etapaText,
        cronogramaKey: match?.key ?? null,
        cronogramaLabel: match?.label ?? null,
        tipo,
        datas,
        textoOriginal: dataText,
      });
    }

    return { ok: true, cargo, etapas };
  } catch (err: any) {
    return { ok: false, errorMessage: `Erro ao ler o arquivo Word: ${err?.message ?? err}`, etapas: [] };
  }
}
