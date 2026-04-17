import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Copy, Download, Layers } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ParsedCronograma, CronogramaParseError } from '@/lib/editalCronogramaParser';
import { toast } from 'sonner';
import { formatDate } from '@/lib/vagaUtils';
import { EntrevistaConfig } from '@/components/EntrevistaDateField';

export interface CronogramaImportResult {
  /** Mapa chave → primeira data (yyyy-mm-dd) — para campos simples */
  values: Record<string, string>;
  /** Config específica da etapa Entrevistas (quando detectada) */
  entrevistaConfig?: EntrevistaConfig;
  cargo?: string;
  anexo?: string;
}

/** Resultado do modo múltiplo: mapeia ID do cargo do edital → cronograma extraído */
export interface CronogramaImportMultiResult {
  /** cargoId (do edital alvo) → resultado pronto para aplicar */
  porCargo: Record<string, CronogramaImportResult>;
}

/** Cargo do edital para o qual o usuário pode mapear cronogramas detectados */
export interface CargoAlvo {
  id: string;
  cargo: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cronogramas: ParsedCronograma[] | null;
  errorMessage?: string | null;
  errorDetails?: CronogramaParseError | null;
  originalFile?: File | null;
  loading?: boolean;
  fileName?: string;
  onApply: (result: CronogramaImportResult) => void;
  /** Quando informado, ativa MODO MÚLTIPLO: mapear N cronogramas → N cargos */
  cargosAlvo?: CargoAlvo[];
  /** Callback do modo múltiplo */
  onApplyMulti?: (result: CronogramaImportMultiResult) => void;
}

/** Constrói o CronogramaImportResult a partir de um ParsedCronograma único */
function buildResultFromCronograma(c: ParsedCronograma): CronogramaImportResult {
  const values: Record<string, string> = {};
  let entrevistaConfig: EntrevistaConfig | undefined;
  for (const e of c.etapas) {
    if (!e.cronogramaKey || e.datas.length === 0) continue;
    if (!values[e.cronogramaKey]) {
      values[e.cronogramaKey] = e.datas[0];
    }
    if (e.cronogramaKey === 'data_entrevistas') {
      entrevistaConfig = { tipo: e.tipo, datas: e.datas.slice(0, 2) };
    }
  }
  return { values, entrevistaConfig, cargo: c.cargo, anexo: c.anexo };
}

/** Similaridade simples (Dice coefficient sobre bigramas, sem acento) entre 2 strings */
function similarity(a: string, b: string): number {
  const norm = (s: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const bigrams = (s: string) => {
    const out: string[] = [];
    for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
    return out;
  };
  const A = bigrams(x);
  const B = bigrams(y);
  if (A.length === 0 || B.length === 0) return 0;
  const map = new Map<string, number>();
  for (const g of A) map.set(g, (map.get(g) || 0) + 1);
  let inter = 0;
  for (const g of B) {
    const c = map.get(g) || 0;
    if (c > 0) {
      inter++;
      map.set(g, c - 1);
    }
  }
  return (2 * inter) / (A.length + B.length);
}

/** Tenta auto-mapear cada cargo alvo ao melhor cronograma do Word */
function autoMatch(
  cargosAlvo: CargoAlvo[],
  cronogramas: ParsedCronograma[],
): Record<string, number> {
  const map: Record<string, number> = {};
  cargosAlvo.forEach((alvo) => {
    let bestIdx = -1;
    let bestScore = 0;
    cronogramas.forEach((c, i) => {
      const s = similarity(alvo.cargo, c.cargo);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    });
    // só auto-mapeia se passou de um threshold razoável
    if (bestScore >= 0.45) map[alvo.id] = bestIdx;
  });
  return map;
}

export function CronogramaImportDialog({
  open,
  onOpenChange,
  cronogramas,
  errorMessage,
  errorDetails,
  originalFile,
  loading,
  fileName,
  onApply,
  cargosAlvo,
  onApplyMulti,
}: Props) {
  const isMultiMode = !!(cargosAlvo && cargosAlvo.length > 1 && onApplyMulti);

  const handleCopyDetails = async () => {
    const payload = {
      fileName: originalFile?.name ?? fileName ?? null,
      size: originalFile?.size ?? null,
      type: originalFile?.type ?? null,
      step: errorDetails?.step ?? null,
      message: errorDetails?.message ?? errorMessage ?? null,
      hint: errorDetails?.hint ?? null,
      raw: errorDetails?.raw ?? null,
      timestamp: new Date().toISOString(),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success('Detalhes copiados — cole na conversa para diagnóstico.');
    } catch {
      toast.error('Não foi possível copiar. Tire um print da tela.');
    }
  };

  const handleDownloadOriginal = () => {
    if (!originalFile) return;
    const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const safeName = originalFile.name.replace(/[^\w.\-]+/g, '_');
    const url = URL.createObjectURL(originalFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostico-word-${ts}-${safeName}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Arquivo baixado. Anexe-o aqui na conversa para diagnóstico.');
  };

  // ===== Modo SINGLE (1 cargo alvo, escolhe 1 cronograma) =====
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const multiple = (cronogramas?.length ?? 0) > 1;

  useEffect(() => {
    if (isMultiMode) return;
    if (multiple) setSelectedIdx(-1);
    else setSelectedIdx(0);
  }, [multiple, cronogramas, isMultiMode]);

  const selected = cronogramas && selectedIdx >= 0 ? cronogramas[selectedIdx] : null;

  const handleApplySingle = () => {
    if (!selected) return;
    const result = buildResultFromCronograma(selected);
    onApply(result);
    toast.success(
      `Cronograma "${selected.cargo}" aplicado: ${Object.keys(result.values).length} etapa(s) preenchida(s).`,
    );
    onOpenChange(false);
  };

  // ===== Modo MULTI (N cargos alvo, mapeia cada um a um cronograma) =====
  // mapping: cargoId → índice em `cronogramas` (ou -1 = ignorar)
  const [mapping, setMapping] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isMultiMode || !cronogramas || !cargosAlvo) return;
    setMapping(autoMatch(cargosAlvo, cronogramas));
  }, [isMultiMode, cronogramas, cargosAlvo]);

  const totalMapeados = useMemo(
    () => Object.values(mapping).filter((i) => i >= 0).length,
    [mapping],
  );

  const handleApplyMulti = () => {
    if (!cargosAlvo || !cronogramas || !onApplyMulti) return;
    const porCargo: Record<string, CronogramaImportResult> = {};
    for (const alvo of cargosAlvo) {
      const idx = mapping[alvo.id];
      if (idx === undefined || idx < 0 || !cronogramas[idx]) continue;
      porCargo[alvo.id] = buildResultFromCronograma(cronogramas[idx]);
    }
    if (Object.keys(porCargo).length === 0) {
      toast.error('Nenhum cargo foi mapeado. Selecione ao menos um cronograma.');
      return;
    }
    onApplyMulti({ porCargo });
    toast.success(
      `${Object.keys(porCargo).length} cronograma(s) aplicado(s) aos cargos do edital.`,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            {isMultiMode ? 'Mapear cronogramas aos cargos do edital' : 'Cronograma detectado no Word'}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? `Lendo ${fileName || 'arquivo'}...`
              : isMultiMode
                ? `Foram detectados ${cronogramas?.length ?? 0} cronogramas no Word. Associe cada cargo do edital ao cronograma correspondente.`
                : multiple
                  ? 'Foram encontrados múltiplos cronogramas no arquivo. Selecione o cargo cujo cronograma deseja aplicar ao formulário.'
                  : 'Confira as etapas detectadas e clique em Aplicar para preencher o formulário.'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Processando {fileName}...</span>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <strong className="block">Não foi possível extrair o cronograma.</strong>
                {errorDetails?.step && (
                  <div className="text-[11px] uppercase tracking-wider opacity-70">
                    Etapa: {errorDetails.step.replace(/_/g, ' ')}
                  </div>
                )}
                <span className="block">{errorMessage}</span>
                {errorDetails?.hint && (
                  <div className="mt-2 text-xs text-slate-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                    💡 <strong>Dica:</strong> {errorDetails.hint}
                  </div>
                )}
                {errorDetails?.raw && (
                  <details className="mt-1 text-[11px] text-slate-600">
                    <summary className="cursor-pointer">Detalhes técnicos</summary>
                    <pre className="mt-1 whitespace-pre-wrap break-all bg-slate-50 border border-slate-200 rounded p-2">{errorDetails.raw}</pre>
                  </details>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyDetails} className="gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Copiar detalhes do erro
              </Button>
              {originalFile && (
                <Button variant="outline" size="sm" onClick={handleDownloadOriginal} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Baixar arquivo para diagnóstico
                </Button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Anexe o arquivo baixado e os detalhes copiados na conversa do chat para análise.
            </p>
          </div>
        )}

        {/* ============ MODO MÚLTIPLO ============ */}
        {!loading && !errorMessage && isMultiMode && cronogramas && cronogramas.length > 0 && cargosAlvo && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-xs">
              <Layers className="h-4 w-4 shrink-0" />
              <span>
                <strong>Modo edital agrupado:</strong> {cargosAlvo.length} cargo(s) no edital ·{' '}
                {cronogramas.length} cronograma(s) detectado(s) no Word · {totalMapeados} mapeado(s).
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo do edital</TableHead>
                  <TableHead>Cronograma do Word</TableHead>
                  <TableHead className="text-center">Etapas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargosAlvo.map((alvo) => {
                  const idx = mapping[alvo.id];
                  const c = idx !== undefined && idx >= 0 ? cronogramas[idx] : null;
                  const mapeadas = c ? c.etapas.filter((e) => e.cronogramaKey).length : 0;
                  return (
                    <TableRow key={alvo.id}>
                      <TableCell className="text-sm font-medium text-slate-800">
                        {alvo.cargo}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={idx !== undefined && idx >= 0 ? String(idx) : '__none__'}
                          onValueChange={(v) =>
                            setMapping((prev) => ({
                              ...prev,
                              [alvo.id]: v === '__none__' ? -1 : parseInt(v, 10),
                            }))
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Selecione um cronograma..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Não aplicar —</SelectItem>
                            {cronogramas.map((cron, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {cron.anexo} — {cron.cargo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {c ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> {mapeadas}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="text-[11px] text-slate-500 italic">
              O sistema sugeriu automaticamente os pareamentos por similaridade do nome do cargo. Ajuste manualmente se necessário.
            </p>
          </div>
        )}

        {/* ============ MODO SINGLE — seletor de múltiplos cronogramas ============ */}
        {!loading && !errorMessage && !isMultiMode && cronogramas && multiple && selectedIdx === -1 && (
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase text-slate-500">
              Selecione o cronograma ({cronogramas.length} encontrados)
            </Label>
            <RadioGroup
              value={selectedIdx >= 0 ? String(selectedIdx) : ""}
              onValueChange={(v) => setSelectedIdx(parseInt(v, 10))}
              className="space-y-2"
            >
              {cronogramas.map((c, i) => {
                const mapeadas = c.etapas.filter((e) => e.cronogramaKey).length;
                return (
                  <label
                    key={i}
                    htmlFor={`cron-${i}`}
                    className="flex items-start gap-3 rounded-md border border-slate-200 hover:border-primary/40 hover:bg-primary/5 p-3 cursor-pointer transition"
                  >
                    <RadioGroupItem id={`cron-${i}`} value={String(i)} className="mt-1" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800">
                        {c.anexo} — {c.cargo}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {c.etapas.length} etapa(s) detectada(s) • {mapeadas} reconhecida(s) pelo sistema
                      </div>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>
        )}

        {/* ============ MODO SINGLE — preview do cronograma escolhido ============ */}
        {!loading && !errorMessage && !isMultiMode && selected && (multiple ? selectedIdx !== -1 : true) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 flex-1">
                <strong>{selected.anexo}</strong> — Cargo: <strong>{selected.cargo}</strong>
              </div>
              {multiple && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedIdx(-1)} className="gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Trocar cronograma
                </Button>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etapa (Word)</TableHead>
                  <TableHead>Mapeada para</TableHead>
                  <TableHead>Datas detectadas</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.etapas.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{e.etapaOriginal || <em className="text-slate-400">—</em>}</TableCell>
                    <TableCell className="text-xs">
                      {e.cronogramaLabel ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> {e.cronogramaLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> Sem correspondência
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {e.datas.length > 0
                        ? e.datas.map((d) => formatDate(d)).join(' • ')
                        : <em className="text-slate-400">{e.textoOriginal || '—'}</em>}
                    </TableCell>
                    <TableCell className="text-xs uppercase text-slate-500">
                      {e.cronogramaKey === 'data_entrevistas'
                        ? e.tipo === 'unica' ? 'Única' : e.tipo === 'duas_datas' ? '2 datas' : 'Período'
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-[11px] text-slate-500 italic">
              Etapas sem correspondência permanecem em branco no formulário e podem ser preenchidas manualmente.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {isMultiMode ? (
            <Button onClick={handleApplyMulti} disabled={loading || totalMapeados === 0}>
              Aplicar {totalMapeados} cronograma(s) aos cargos
            </Button>
          ) : (
            <Button
              onClick={handleApplySingle}
              disabled={loading || !selected || (multiple && selectedIdx === -1)}
            >
              Aplicar ao formulário
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
