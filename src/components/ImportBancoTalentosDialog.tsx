import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, 
  Search, Info, Check, X, FileWarning, Database, Layers
} from 'lucide-react';
import { useVagasStore } from '@/store/vagasStore';
import { BancoTalentos } from '@/types/vaga';
import { format, parse, isValid, addDays } from 'date-fns';
import { toast } from 'sonner';

type Step = 'select' | 'sheets' | 'mapping' | 'preview' | 'summary';

interface ColumnMapping {
  excel: string;
  system: string;
  format?: string;
  isDate?: boolean;
}

const DATE_FORMATS = [
  { label: 'dd/mm/aaaa', value: 'dd/MM/yyyy' },
  { label: 'mm/dd/aaaa', value: 'MM/dd/yyyy' },
  { label: 'aaaa-mm-dd', value: 'yyyy-MM-dd' },
  { label: 'Excel (número)', value: 'excel_serial' },
  { label: 'Auto-detectar', value: 'auto' },
];

const DATE_FIELDS = ['data_abertura_edital', 'data_validade', 'nova_data_validade'];

const REQUIRED_FIELDS = [
  { key: 'unidade', label: 'Unidade' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'secao', label: 'Seção' },
  { key: 'numero_edital', label: 'Nº Edital' },
  { key: 'data_abertura_edital', label: 'Data Abertura' },
  { key: 'data_validade', label: 'Data Validade' },
];

const OPTIONAL_FIELDS = [
  { key: 'numero_processo', label: 'Nº Processo' },
  { key: 'nome', label: 'Nome' },
  { key: 'classificacao', label: 'Classificação' },
  { key: 'is_prorrogado', label: 'Prorrogado (Sim/Não)' },
  { key: 'nova_data_validade', label: 'Nova Data Final' },
  { key: 'observacoes', label: 'Observações' },
];

const FIELD_SYNONYMS: Record<string, string[]> = {
  unidade: ['unidade', 'filial', 'local'],
  cargo: ['cargo', 'função', 'vaga'],
  secao: ['seção', 'secao', 'setor', 'departamento'],
  numero_edital: ['edital', 'nº edital', 'número edital'],
  numero_processo: ['processo', 'nº processo', 'número processo'],
  nome: ['nome', 'candidato'],
  classificacao: ['classificação', 'posicao', 'ranking'],
  data_abertura_edital: ['abertura', 'data abertura', 'dt abertura'],
  data_validade: ['validade', 'data validade', 'dt validade'],
  is_prorrogado: ['prorrogado', 'prorrogação'],
  nova_data_validade: ['nova data', 'data final', 'prorrogado até'],
  observacoes: ['observações', 'obs'],
};

function detectHeaderRow(rawRows: any[][]): number {
  let bestRow = 0;
  let bestScore = 0;
  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const row = rawRows[i];
    if (!row) continue;
    const filledCells = row.filter(c => c != null && String(c).trim() !== '');
    if (filledCells.length > bestScore) {
      bestScore = filledCells.length;
      bestRow = i;
    }
  }
  return bestRow;
}

function fuzzyMatch(header: string, fieldKey: string): boolean {
  const h = header.toLowerCase().trim();
  const synonyms = FIELD_SYNONYMS[fieldKey];
  if (!synonyms) return false;
  return synonyms.some(syn => h.includes(syn) || syn.includes(h));
}

const parseDateValue = (value: any, targetFormat: string): { date: Date | null, isValid: boolean, formatted: string } => {
  if (!value) return { date: null, isValid: true, formatted: '' };
  let d: Date | null = null;
  if (targetFormat === 'excel_serial' || (typeof value === 'number' && targetFormat === 'auto')) {
    d = addDays(new Date(1899, 11, 30), Number(value));
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { date: null, isValid: true, formatted: '' };
    const formats = targetFormat === 'auto' ? ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy'] : [targetFormat];
    for (const f of formats) {
      const parsed = parse(trimmed, f, new Date());
      if (isValid(parsed)) { d = parsed; break; }
    }
  } else if (value instanceof Date) { d = value; }
  if (d && isValid(d)) return { date: d, isValid: true, formatted: format(d, 'yyyy-MM-dd') };
  return { date: null, isValid: false, formatted: String(value) };
};

export function ImportBancoTalentosDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { addBancos, addImportHistory, addImportedFile, updateImportedFile } = useVagasStore();
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [headerRow, setHeaderRow] = useState<number>(0);
  const [rawPreview, setRawPreview] = useState<any[][]>([]);
  const [fileId, setFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (workbook && selectedSheets.length > 0) {
      const sheet = workbook.Sheets[selectedSheets[0]];
      if (sheet) {
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        const preview = rows.slice(0, 10);
        setRawPreview(preview);
        setHeaderRow(detectHeaderRow(preview));
      }
    }
  }, [workbook, selectedSheets]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const id = `FILE-BT-${Date.now()}`;
      setFileId(id);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: 'binary' });
        addImportedFile({
          id,
          nome_original: selectedFile.name,
          nome_interno: id,
          tipo: selectedFile.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          tamanho: selectedFile.size,
          data_upload: new Date().toISOString(),
          usuario: 'Ana Paula Oliveira',
          email_usuario: 'ana.oliveira@agir.org.br',
          modulo_origem: 'banco_talentos',
          status: 'enviado',
          content: bstr
        });
        setWorkbook(wb);
        setSelectedSheets([wb.SheetNames[0]]);
        setStep('sheets');
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const startMapping = () => {
    const headers = rawPreview[headerRow]?.map((c, i) => c ? String(c) : `Coluna ${i + 1}`) || [];
    const initialMappings = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => {
      const matchedHeader = headers.find(h => fuzzyMatch(h, field.key));
      return { excel: matchedHeader || '', system: field.key, format: DATE_FIELDS.includes(field.key) ? 'auto' : undefined, isDate: DATE_FIELDS.includes(field.key) };
    });
    setMappings(initialMappings);
    setStep('mapping');
  };

  const generatePreview = () => {
    const allData: any[] = [];
    selectedSheets.forEach(sheetName => {
      const data = XLSX.utils.sheet_to_json(workbook!.Sheets[sheetName], { range: headerRow });
      allData.push(...data);
    });
    const mappedData = allData.map(row => {
      const result: any = { __errors: {} };
      mappings.forEach(m => {
        if (m.excel) {
          const val = row[m.excel];
          if (m.isDate) {
            const { isValid, formatted } = parseDateValue(val, m.format || 'auto');
            result[m.system] = formatted;
            if (!isValid && val) result.__errors[m.system] = true;
          } else { result[m.system] = val; }
        }
      });
      return result;
    });
    setPreviewData(mappedData.slice(0, 50));
    setStep('preview');
  };

  const processImport = () => {
    setIsProcessing(true);
    const allData: any[] = [];
    selectedSheets.forEach(sheetName => {
      const data = XLSX.utils.sheet_to_json(workbook!.Sheets[sheetName], { range: headerRow });
      allData.push(...data);
    });

    const now = new Date();
    const newBancos: BancoTalentos[] = allData.map((row, i) => {
      const mapped: any = {};
      mappings.forEach(m => {
        if (m.excel) {
          if (m.isDate) {
            mapped[m.system] = parseDateValue(row[m.excel], m.format || 'auto').formatted;
          } else if (m.system === 'is_prorrogado') {
            const val = String(row[m.excel]).toLowerCase();
            mapped[m.system] = val === 'sim' || val === 's' || val === 'true' || val === '1' || val === 'checked';
          } else {
            mapped[m.system] = String(row[m.excel]);
          }
        }
      });

      const expiryDate = new Date(mapped.nova_data_validade || mapped.data_validade);
      const status = expiryDate > now ? (mapped.is_prorrogado ? 'prorrogado' : 'valido') : 'vencido';

      return {
        id: `imp-bt-${Date.now()}-${i}`,
        unidade: mapped.unidade || 'HGG',
        cargo: mapped.cargo || 'Não informado',
        secao: mapped.secao || '',
        numero_edital: mapped.numero_edital || '000/0000',
        numero_processo: mapped.numero_processo || '',
        nome: mapped.nome || '',
        classificacao: mapped.classificacao || '',
        data_abertura_edital: mapped.data_abertura_edital || '',
        data_validade: mapped.data_validade || '',
        is_prorrogado: !!mapped.is_prorrogado,
        nova_data_validade: mapped.nova_data_validade || undefined,
        status: status as any,
        observacoes: mapped.observacoes || '',
      };
    });

    addBancos(newBancos);
    const loteId = `LOTE-BT-${Date.now()}`;
    addImportHistory({
      id: loteId,
      data_hora: new Date().toISOString(),
      usuario: 'Ana Paula Oliveira',
      email_usuario: 'ana.oliveira@agir.org.br',
      arquivo: file?.name || 'banco_import.xlsx',
      tipo_importacao: 'banco',
      total_lidos: allData.length,
      total_novos: newBancos.length,
      total_atualizados: 0, total_ignorados: 0, total_erros: 0,
      status: 'concluido',
      referencia_arquivo: fileId || undefined
    });
    if (fileId) updateImportedFile(fileId, { status: 'processado' });
    setImportSummary({ total_lidos: allData.length, total_novos: newBancos.length });
    setStep('summary');
    setIsProcessing(false);
    toast.success('Banco de talentos importado com sucesso!');
  };

  const reset = () => {
    setStep('select'); setFile(null); setWorkbook(null); setSelectedSheets([]); setMappings([]); setPreviewData([]); setImportSummary(null); setHeaderRow(0); setRawPreview([]);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) reset(); onOpenChange(val); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Importar Banco de Talentos</DialogTitle>
              <DialogDescription>Siga as etapas para importar a base atual do banco de talentos.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {step === 'select' && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl border-border hover:border-primary/50 transition-colors bg-muted/30 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
              <div className="bg-background p-4 rounded-full shadow-sm mb-4"><Upload className="h-8 w-8 text-primary" /></div>
              <h3 className="text-lg font-semibold">Selecione o arquivo Excel</h3>
              <p className="text-sm text-muted-foreground mt-1">Arraste e solte ou clique para navegar</p>
            </div>
          )}

          {step === 'sheets' && workbook && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {workbook.SheetNames.map(name => (
                  <button key={name} onClick={() => setSelectedSheets([name])} className={`p-4 border rounded-xl flex flex-col items-start gap-2 transition-all ${selectedSheets.includes(name) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'}`}>
                    <div className="flex items-center justify-between w-full"><Layers className={`h-5 w-5 ${selectedSheets.includes(name) ? 'text-primary' : 'text-muted-foreground'}`} />{selectedSheets.includes(name) && <CheckCircle2 className="h-4 w-4 text-primary" />}</div>
                    <span className="font-semibold text-sm truncate w-full text-left">{name}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Pré-visualização da aba: {selectedSheets[0]}</h4>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Linha do cabeçalho:</label>
                    <Select value={String(headerRow + 1)} onValueChange={(val) => setHeaderRow(Number(val) - 1)}>
                      <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: Math.min(10, rawPreview.length) }, (_, i) => (<SelectItem key={i} value={String(i + 1)}>Linha {i + 1}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <ScrollArea className="max-h-[220px]">
                    <Table>
                      <TableBody>
                        {rawPreview.map((row, rowIdx) => (
                          <TableRow key={rowIdx} className={rowIdx === headerRow ? 'bg-primary/10 font-semibold' : ''} onClick={() => setHeaderRow(rowIdx)}>
                            <TableCell className="text-center text-xs w-[40px]">{rowIdx + 1}</TableCell>
                            {row.map((cell, colIdx) => (<TableCell key={colIdx} className="text-xs py-1.5 truncate max-w-[150px]">{cell != null ? String(cell) : ''}</TableCell>))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <Table>
                <TableHeader><TableRow><TableHead>Campo do Sistema</TableHead><TableHead>Coluna no Excel</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => {
                    const mapping = mappings.find(m => m.system === field.key);
                    const isRequired = REQUIRED_FIELDS.some(f => f.key === field.key);
                    return (
                      <TableRow key={field.key}>
                        <TableCell className="font-medium">{field.label}{isRequired && <span className="text-destructive">*</span>}</TableCell>
                        <TableCell>
                          <Select value={mapping?.excel || ''} onValueChange={(val) => setMappings(prev => prev.map(m => m.system === field.key ? { ...m, excel: val } : m))}>
                            <SelectTrigger className={!mapping?.excel && isRequired ? 'border-destructive' : ''}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>{rawPreview[headerRow]?.map((h, i) => h ? <SelectItem key={i} value={String(h)}>{String(h)}</SelectItem> : null)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{mapping?.excel ? <Check className="h-4 w-4 text-green-500" /> : isRequired ? <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700">Requerido</Badge> : <span className="text-[10px] text-muted-foreground">Opcional</span>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4 overflow-auto flex-1">
              <h3 className="text-sm font-semibold">Prévia dos Dados</h3>
              <div className="border rounded-lg overflow-hidden flex-1">
                <Table>
                  <TableHeader><TableRow><TableHead>Cargo</TableHead><TableHead>Unidade</TableHead><TableHead>Edital</TableHead><TableHead>Validade</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{row.cargo}</TableCell>
                        <TableCell className="text-xs">{row.unidade}</TableCell>
                        <TableCell className="text-xs">{row.numero_edital}</TableCell>
                        <TableCell className="text-xs">{row.data_validade}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === 'summary' && importSummary && (
            <div className="space-y-6 flex flex-col items-center py-10">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
              <div className="text-center">
                <h2 className="text-2xl font-bold">Importação Concluída</h2>
                <p className="text-muted-foreground">Foram importados {importSummary.total_novos} registros para o banco de talentos.</p>
              </div>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-muted/30 flex justify-between">
          <Button variant="ghost" onClick={() => { if (step === 'select') onOpenChange(false); else setStep(step === 'sheets' ? 'select' : step === 'mapping' ? 'sheets' : 'mapping'); }}>Voltar</Button>
          {step === 'sheets' && <Button onClick={startMapping}>Próximo</Button>}
          {step === 'mapping' && <Button onClick={generatePreview}>Ver Prévia</Button>}
          {step === 'preview' && <Button onClick={processImport} disabled={isProcessing}>{isProcessing ? 'Processando...' : 'Confirmar Importação'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
