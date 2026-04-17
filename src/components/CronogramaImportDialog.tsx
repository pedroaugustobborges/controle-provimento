import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseCronogramaFromDocx, ParsedEtapa } from '@/lib/editalCronogramaParser';
import { toast } from 'sonner';
import { formatDate } from '@/lib/vagaUtils';
import { EntrevistaConfig } from '@/components/EntrevistaDateField';

export interface CronogramaImportResult {
  /** Mapa chave → primeira data (yyyy-mm-dd) — para campos simples */
  values: Record<string, string>;
  /** Config específica da etapa Entrevistas (quando detectada) */
  entrevistaConfig?: EntrevistaConfig;
  cargo?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onApply: (result: CronogramaImportResult) => void;
}

export function CronogramaImportDialog({ open, onOpenChange, onApply }: Props) {
  const [loading, setLoading] = useState(false);
  const [etapas, setEtapas] = useState<ParsedEtapa[] | null>(null);
  const [cargo, setCargo] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const reset = () => {
    setLoading(false);
    setEtapas(null);
    setCargo(undefined);
    setError(null);
    setFileName('');
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.docx$/i)) {
      toast.error('Selecione um arquivo .docx (Word). Arquivos .doc antigos não são suportados.');
      return;
    }
    setFileName(file.name);
    setLoading(true);
    setError(null);
    setEtapas(null);
    const result = await parseCronogramaFromDocx(file);
    setLoading(false);
    if (!result.ok) {
      setError(result.errorMessage || 'Falha ao processar o arquivo.');
      return;
    }
    setEtapas(result.etapas);
    setCargo(result.cargo);
    if (result.etapas.length === 0) {
      setError('Nenhuma etapa foi reconhecida na tabela do cronograma.');
    }
  }, []);

  const handleApply = () => {
    if (!etapas) return;
    const values: Record<string, string> = {};
    let entrevistaConfig: EntrevistaConfig | undefined;

    for (const e of etapas) {
      if (!e.cronogramaKey || e.datas.length === 0) continue;
      values[e.cronogramaKey] = e.datas[0];
      if (e.cronogramaKey === 'data_entrevistas') {
        entrevistaConfig = { tipo: e.tipo, datas: e.datas.slice(0, 2) };
      }
    }

    onApply({ values, entrevistaConfig, cargo });
    toast.success(`Cronograma aplicado: ${Object.keys(values).length} etapa(s) preenchida(s).`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            Importar Cronograma do Word
          </DialogTitle>
          <DialogDescription>
            Faça upload do arquivo <strong>.docx</strong> do edital. O sistema localiza o "ANEXO" com a tabela{' '}
            <em>"Cronograma de Seleção para o Cargo de..."</em> e extrai automaticamente as datas de cada etapa.
          </DialogDescription>
        </DialogHeader>

        {!etapas && !loading && (
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center bg-slate-50/50">
            <Upload className="h-10 w-10 mx-auto text-slate-400 mb-3" />
            <p className="text-sm text-slate-600 mb-3">
              Arraste o arquivo aqui ou clique no botão abaixo.
            </p>
            <Button asChild variant="outline">
              <label className="cursor-pointer">
                Selecionar arquivo .docx
                <input
                  type="file"
                  className="hidden"
                  accept=".docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Processando {fileName}...</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong className="block mb-1">Não foi possível extrair o cronograma.</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {etapas && etapas.length > 0 && (
          <div className="space-y-3">
            {cargo && (
              <div className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                Cargo detectado: <strong>{cargo}</strong>
              </div>
            )}
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
                {etapas.map((e, i) => (
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
          {etapas && (
            <Button variant="outline" onClick={reset}>Trocar arquivo</Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApply} disabled={!etapas || etapas.length === 0}>
            Aplicar ao formulário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
