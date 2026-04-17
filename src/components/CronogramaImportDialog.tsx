import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Copy, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cronogramas: ParsedCronograma[] | null;
  errorMessage?: string | null;
  /** Detalhes estruturados do erro (passo, hint, raw) */
  errorDetails?: CronogramaParseError | null;
  /** Arquivo original — usado para botão "Baixar para diagnóstico" */
  originalFile?: File | null;
  loading?: boolean;
  fileName?: string;
  onApply: (result: CronogramaImportResult) => void;
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
}: Props) {
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

  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // Auto-seleciona quando vem 1 só; reseta seleção sempre que a lista muda
  useEffect(() => {
    setSelectedIdx(0);
  }, [cronogramas]);

  const showSelector = (cronogramas?.length ?? 0) > 1 && selectedIdx === -1;
  const selected = cronogramas && selectedIdx >= 0 ? cronogramas[selectedIdx] : null;
  const multiple = (cronogramas?.length ?? 0) > 1;

  // Quando há múltiplos, começamos sem seleção (modo seletor)
  useEffect(() => {
    if (multiple) setSelectedIdx(-1);
    else setSelectedIdx(0);
  }, [multiple, cronogramas]);

  const handleApply = () => {
    if (!selected) return;
    const values: Record<string, string> = {};
    let entrevistaConfig: EntrevistaConfig | undefined;

    for (const e of selected.etapas) {
      if (!e.cronogramaKey || e.datas.length === 0) continue;
      // Não sobrescreve uma chave já preenchida (ex.: data_inicio_inscricao expandida antes)
      if (!values[e.cronogramaKey]) {
        values[e.cronogramaKey] = e.datas[0];
      }
      if (e.cronogramaKey === 'data_entrevistas') {
        entrevistaConfig = { tipo: e.tipo, datas: e.datas.slice(0, 2) };
      }
    }

    onApply({ values, entrevistaConfig, cargo: selected.cargo, anexo: selected.anexo });
    toast.success(
      `Cronograma "${selected.cargo}" aplicado: ${Object.keys(values).length} etapa(s) preenchida(s).`,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            Cronograma detectado no Word
          </DialogTitle>
          <DialogDescription>
            {loading
              ? `Lendo ${fileName || 'arquivo'}...`
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
          <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong className="block mb-1">Não foi possível extrair o cronograma.</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {!loading && !errorMessage && cronogramas && multiple && selectedIdx === -1 && (
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase text-slate-500">
              Selecione o cronograma ({cronogramas.length} encontrados)
            </Label>
            <RadioGroup
              value=""
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

        {!loading && !errorMessage && selected && (multiple ? selectedIdx !== -1 : true) && (
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
          <Button
            onClick={handleApply}
            disabled={loading || !selected || (multiple && selectedIdx === -1)}
          >
            Aplicar ao formulário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
