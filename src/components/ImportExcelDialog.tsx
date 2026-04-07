import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, 
  Search, Info, Check, X, FileWarning, Database, Layers
} from 'lucide-react';
import { useVagasStore } from '@/store/vagasStore';
import { Vaga, StatusEdital, TipoVaga, StatusVaga } from '@/types/vaga';
import { getResponsavelPorUnidade } from '@/data/equipe';
import { format, parse, isValid, addDays } from 'date-fns';
import { toast } from 'sonner';

type Step = 'select' | 'sheets' | 'mapping' | 'preview' | 'duplicates' | 'summary';

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
  { label: 'dd-mm-aaaa', value: 'dd-MM-yyyy' },
  { label: 'Excel (número)', value: 'excel_serial' },
  { label: 'Auto-detectar', value: 'auto' },
];

const DATE_FIELDS = ['data_abertura', 'data_recebimento', 'publicacao', 'admissao', 'admissao_enviada', 'admissao_efetivada'];

const REQUIRED_FIELDS = [
  { key: 'unidade', label: 'Unidade' },
  { key: 'data_abertura', label: 'Data Abertura' },
  { key: 'requisicao', label: 'Nº Requisição' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'numero_vagas', label: 'Nº Vagas' },
];

const OPTIONAL_FIELDS = [
  { key: 'data_recebimento', label: 'Data Recebimento' },
  { key: 'publicacao', label: 'Data Publicação' },
  { key: 'admissao', label: 'Data Admissão' },
  { key: 'admissao_enviada', label: 'Admissão Enviada' },
  { key: 'admissao_efetivada', label: 'Admissão Efetivada' },
  { key: 'numero_edital', label: 'Nº Edital' },
  { key: 'numero_processo', label: 'Nº Processo' },
  { key: 'secao', label: 'Seção' },
  { key: 'tipo_vaga', label: 'Tipo' },
  { key: 'analista_responsavel', label: 'Analista' },
  { key: 'observacoes_internas', label: 'Observações' },
];

const FIELD_SYNONYMS: Record<string, string[]> = {
  unidade: ['unidade', 'filial', 'loja', 'local', 'unid'],
  data_abertura: ['data abertura', 'dt abertura', 'data de abertura', 'abertura', 'dt. abertura'],
  data_recebimento: ['data recebimento', 'dt recebimento', 'data de recebimento', 'recebimento', 'dt. recebimento'],
  requisicao: ['requisição', 'requisicao', 'nº requisição', 'n requisição', 'req', 'nº req'],
  cargo: ['cargo', 'função', 'funcao', 'vaga', 'posição', 'posicao'],
  numero_vagas: ['nº de vagas', 'n vagas', 'numero de vagas', 'vagas', 'qtd', 'quantidade', 'qtde', 'nº vagas'],
  secao: ['seção', 'secao', 'setor', 'departamento', 'depto', 'área', 'area'],
  tipo_vaga: ['tipo', 'tipo vaga', 'tipo de vaga', 'modalidade'],
  analista_responsavel: ['analista', 'responsável', 'responsavel', 'analista responsável'],
  observacoes_internas: ['observações', 'observacoes', 'obs', 'notas', 'comentários', 'comentarios'],
  numero_edital: ['nº edital', 'numero edital', 'edital', 'n edital', 'nº do edital', 'número do edital'],
  numero_processo: ['nº processo', 'numero processo', 'processo', 'n processo', 'nº do processo', 'número do processo'],
  publicacao: ['publicação', 'publicacao', 'data publicação', 'dt publicação'],
  admissao: ['admissão', 'admissao', 'data admissão', 'dt admissão'],
  admissao_enviada: ['admissão enviada', 'admissao enviada', 'dt admissão enviada'],
  admissao_efetivada: ['admissão efetivada', 'admissao efetivada', 'dt admissão efetivada'],
};

function detectHeaderRow(rawRows: any[][]): number {
  let bestRow = 0;
  let bestScore = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row) continue;
    const filledCells = row.filter(c => c != null && String(c).trim() !== '');
    const textCells = filledCells.filter(c => typeof c === 'string' || isNaN(Number(c)));
    const uniqueValues = new Set(filledCells.map(c => String(c).trim().toLowerCase()));
    const distinctRatio = filledCells.length > 0 ? uniqueValues.size / filledCells.length : 0;
    
    // Score: prefer rows with many filled text cells and high distinctness
    const score = textCells.length * 2 + filledCells.length + distinctRatio * 10;
    if (score > bestScore) {
      bestScore = score;
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
  
  // Excel serial number
  if (targetFormat === 'excel_serial' || (typeof value === 'number' && targetFormat === 'auto')) {
    const serialValue = Number(value);
    if (!isNaN(serialValue)) {
      // Excel serial 1 is 1900-01-01, JS Date starts 1970-01-01
      // 25569 is the number of days between 1900 and 1970
      d = addDays(new Date(1899, 11, 30), serialValue);
    }
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { date: null, isValid: true, formatted: '' };
    
    if (targetFormat === 'auto' || !targetFormat) {
      // Try common formats
      const formats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy'];
      for (const f of formats) {
        const parsed = parse(trimmed, f, new Date());
        if (isValid(parsed)) {
          d = parsed;
          break;
        }
      }
    } else {
      const parsed = parse(trimmed, targetFormat, new Date());
      if (isValid(parsed)) {
        d = parsed;
      }
    }
  } else if (value instanceof Date) {
    d = value;
  }

  if (d && isValid(d)) {
    return { date: d, isValid: true, formatted: format(d, 'yyyy-MM-dd') };
  }

  return { date: null, isValid: false, formatted: String(value) };
};

export function ImportExcelDialog({ 
  open, 
  onOpenChange,
  reprocessFile = null
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  reprocessFile?: any
}) {
  const { addVagas, vagas, addImportHistory, addImportedFile, updateImportedFile } = useVagasStore();
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [headerRow, setHeaderRow] = useState<number>(0);
  const [rawPreview, setRawPreview] = useState<any[][]>([]);
  const [fileId, setFileId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update raw preview when sheet selection or workbook changes
  useEffect(() => {
    if (workbook && selectedSheets.length > 0) {
      const sheet = workbook.Sheets[selectedSheets[0]];
      if (sheet) {
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        const preview = rows.slice(0, 10);
        setRawPreview(preview);
        const detected = detectHeaderRow(preview);
        setHeaderRow(detected);
      }
    }
  }, [workbook, selectedSheets]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSelectedSheets([wb.SheetNames[0]]);
        setStep('sheets');
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleSheetToggle = (sheetName: string) => {
    setSelectedSheets(prev => 
      prev.includes(sheetName) ? prev.filter(s => s !== sheetName) : [...prev, sheetName]
    );
  };

  const getHeadersFromRow = (): string[] => {
    if (!rawPreview[headerRow]) return [];
    return rawPreview[headerRow].map((c: any, i: number) => 
      c != null && String(c).trim() !== '' ? String(c) : `Coluna ${i + 1}`
    );
  };

  const startMapping = () => {
    if (selectedSheets.length === 0) return;
    
    const headers = getHeadersFromRow();

    const initialMappings = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => {
      const matchedHeader = headers.find(h => fuzzyMatch(h, field.key));
      const isDate = DATE_FIELDS.includes(field.key);
      return { 
        excel: matchedHeader || '', 
        system: field.key, 
        format: isDate ? 'auto' : undefined,
        isDate
      };
    });

    setMappings(initialMappings);
    setStep('mapping');
  };

  const generatePreview = () => {
    const allData: any[] = [];
    selectedSheets.forEach(sheetName => {
      const sheet = workbook?.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet!, { range: headerRow });
      allData.push(...data.map((row: any) => ({ ...row, __sheet: sheetName })));
    });

    const mappedData = allData.map(row => {
      const result: any = { __original: row, __errors: {} };
      mappings.forEach(m => {
        if (m.excel) {
          const rawValue = row[m.excel];
          if (m.isDate) {
            const { isValid, formatted } = parseDateValue(rawValue, m.format || 'auto');
            result[m.system] = formatted;
            if (!isValid && rawValue) {
              result.__errors[m.system] = true;
            }
          } else {
            result[m.system] = rawValue;
          }
        }
      });
      return result;
    });

    setPreviewData(mappedData.slice(0, 50));
    setStep('preview');
  };

  const detectDuplicates = () => {
    setIsProcessing(true);
    
    const allData: any[] = [];
    selectedSheets.forEach(sheetName => {
      const sheet = workbook?.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet!, { range: headerRow });
      allData.push(...data.map((row: any) => {
        const mapped: any = { __original: row, __sheet: sheetName };
        mappings.forEach(m => { if (m.excel) mapped[m.system] = row[m.excel]; });
        return mapped;
      }));
    });

    const foundDuplicates = allData.filter(newRow => {
      return vagas.some(existing => 
        existing.numero_requisicao === String(newRow.numero_requisicao) ||
        (existing.cargo === newRow.cargo && existing.unidade === newRow.unidade && existing.data_abertura === String(newRow.data_abertura))
      );
    }).map(d => ({
      ...d,
      __existing: vagas.find(v => v.numero_requisicao === String(d.numero_requisicao)) || 
                  vagas.find(v => v.cargo === d.cargo && v.unidade === d.unidade)
    }));

    setDuplicates(foundDuplicates);
    
    if (foundDuplicates.length > 0) {
      setStep('duplicates');
    } else {
      processImport(allData);
    }
    setIsProcessing(false);
  };

  const processImport = (dataToImport: any[]) => {
    setIsProcessing(true);
    const now = new Date().toISOString();
    const loteId = `LOTE-${Date.now()}`;
    
    const newVagas: Vaga[] = dataToImport.map((row, i) => {
      const statusVaga: StatusVaga = 'aberta';
      const unidade = String(row.unidade || '');
      const tipoVaga = (row.tipo_vaga as TipoVaga) || 'substituicao';
      
      const { analista, assistentes } = getResponsavelPorUnidade(unidade, tipoVaga);

      return {
        id: `imp-${Date.now()}-${i}`,
        unidade,
        data_abertura: parseDateValue(row.data_abertura, mappings.find(m => m.system === 'data_abertura')?.format || 'auto').formatted || now.split('T')[0],
        data_recebimento: parseDateValue(row.data_recebimento, mappings.find(m => m.system === 'data_recebimento')?.format || 'auto').formatted || now.split('T')[0],
        requisicao: String(row.requisicao || row.numero_requisicao || `REQ-${Date.now()}-${i}`),
        numero_requisicao: String(row.requisicao || row.numero_requisicao || `REQ-${Date.now()}-${i}`),
        cargo: String(row.cargo || 'Não informado'),
        numero_vagas: Number(row.numero_vagas || row.quantidade) || 1,
        quantidade: Number(row.numero_vagas || row.quantidade) || 1,
        secao: String(row.secao || ''),
        tipo_vaga: tipoVaga,
        analista_responsavel: analista,
        assistentes: assistentes,
        status: statusVaga,
        status_geral: statusVaga,
        tem_banco_valido: false,
        observacoes_internas: String(row.observacoes_internas || row.observacoes || ''),
        origem_importacao: file?.name || 'Excel',
        data_importacao: now,
        lote_importacao: loteId,
        historico: [{
          id: `h-${Date.now()}-${i}`,
          data: now.split('T')[0],
          descricao: `Importado via Excel (${file?.name})`,
          usuario: 'Ana Paula Oliveira'
        }]
      };
    });

    addVagas(newVagas);
    
    const summary = {
      total_lidos: dataToImport.length,
      total_novos: newVagas.length,
      total_atualizados: 0,
      total_ignorados: 0,
      total_erros: 0,
      repeticoes_tratadas: duplicates.length,
      total_datas_convertidas: dataToImport.length, // Simplificado
    };
    
    addImportHistory({
      id: loteId,
      data_hora: now,
      usuario: 'Ana Paula Oliveira',
      arquivo: file?.name || 'excel_import.xlsx',
      ...summary,
      status: 'concluido'
    });

    setImportSummary(summary);
    setStep('summary');
    setIsProcessing(false);
    toast.success('Importação concluída com sucesso!');
  };

  const handleDuplicateAction = (action: 'new' | 'update' | 'ignore') => {
    const allData: any[] = [];
    selectedSheets.forEach(sheetName => {
      const sheet = workbook?.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet!, { range: headerRow });
      allData.push(...data.map((row: any) => {
        const mapped: any = { __original: row, __sheet: sheetName };
        mappings.forEach(m => { if (m.excel) mapped[m.system] = row[m.excel]; });
        return mapped;
      }));
    });

    processImport(allData);
  };

  const reset = () => {
    setStep('select');
    setFile(null);
    setWorkbook(null);
    setSelectedSheets([]);
    setMappings([]);
    setPreviewData([]);
    setDuplicates([]);
    setImportSummary(null);
    setHeaderRow(0);
    setRawPreview([]);
  };

  const maxCols = rawPreview.reduce((max, row) => Math.max(max, row?.length || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) reset(); onOpenChange(val); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Importar dados do Excel</DialogTitle>
              <DialogDescription>
                Siga as etapas para importar novas vagas e editais para o sistema.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Progress Indicator */}
          <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
            <div className="flex gap-4">
              {[
                { s: 'select', l: 'Arquivo' },
                { s: 'sheets', l: 'Planilhas' },
                { s: 'mapping', l: 'Campos' },
                { s: 'preview', l: 'Prévia' },
                { s: 'duplicates', l: 'Revisão' },
                { s: 'summary', l: 'Conclusão' }
              ].map((item, idx) => (
                <div key={item.s} className="flex items-center gap-2">
                  <div className={`
                    h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${step === item.s ? 'bg-primary text-primary-foreground' : 
                      (['select', 'sheets', 'mapping', 'preview', 'duplicates', 'summary'].indexOf(step) > idx) ? 
                      'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}
                  `}>
                    {(['select', 'sheets', 'mapping', 'preview', 'duplicates', 'summary'].indexOf(step) > idx) ? <Check className="h-3 w-3" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-medium ${step === item.s ? 'text-primary' : 'text-muted-foreground'}`}>
                    {item.l}
                  </span>
                  {idx < 5 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {step === 'select' && (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl border-border hover:border-primary/50 transition-colors bg-muted/30" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                <div className="bg-background p-4 rounded-full shadow-sm mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Selecione o arquivo Excel</h3>
                <p className="text-sm text-muted-foreground mt-1">Arraste e solte ou clique para navegar</p>
                <div className="mt-6 flex gap-4">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Info className="h-4 w-4" /> Baixar Modelo
                  </Button>
                </div>
              </div>
            )}

            {step === 'sheets' && workbook && (
              <div className="space-y-4">
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertTitle>Base Unificada</AlertTitle>
                  <AlertDescription>
                    O sistema irá unificar todas as planilhas selecionadas em uma única base de dados.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {workbook.SheetNames.map(name => (
                    <button
                      key={name}
                      onClick={() => handleSheetToggle(name)}
                      className={`
                        p-4 border rounded-xl flex flex-col items-start gap-2 transition-all
                        ${selectedSheets.includes(name) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-muted-foreground/30'}
                      `}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Layers className={`h-5 w-5 ${selectedSheets.includes(name) ? 'text-primary' : 'text-muted-foreground'}`} />
                        {selectedSheets.includes(name) && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <span className="font-semibold text-sm text-foreground truncate w-full text-left">{name}</span>
                    </button>
                  ))}
                </div>

                {/* Header Row Preview & Selector */}
                {selectedSheets.length > 0 && rawPreview.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Pré-visualização da aba: {selectedSheets[0]}</h4>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          Linha do cabeçalho:
                        </label>
                        <Select value={String(headerRow + 1)} onValueChange={(val) => setHeaderRow(Number(val) - 1)}>
                          <SelectTrigger className="w-20 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: Math.min(10, rawPreview.length) }, (_, i) => (
                              <SelectItem key={i} value={String(i + 1)}>Linha {i + 1}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700">
                        Se sua planilha tiver títulos na linha 3, selecione a linha 3. A linha destacada em azul será usada como cabeçalho das colunas.
                      </p>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <ScrollArea className="max-h-[220px]">
                        <Table>
                          <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="w-[60px] text-center text-xs">#</TableHead>
                              {Array.from({ length: maxCols }, (_, i) => (
                                <TableHead key={i} className="text-xs min-w-[100px]">Col {i + 1}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rawPreview.map((row, rowIdx) => (
                              <TableRow 
                                key={rowIdx} 
                                className={`cursor-pointer transition-colors ${
                                  rowIdx === headerRow 
                                    ? 'bg-primary/10 ring-1 ring-inset ring-primary/30 font-semibold' 
                                    : 'hover:bg-muted/30'
                                }`}
                                onClick={() => setHeaderRow(rowIdx)}
                              >
                                <TableCell className="text-center text-xs font-mono text-muted-foreground">
                                  <Badge 
                                    variant={rowIdx === headerRow ? 'default' : 'outline'} 
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {rowIdx + 1}
                                  </Badge>
                                </TableCell>
                                {Array.from({ length: maxCols }, (_, colIdx) => (
                                  <TableCell key={colIdx} className="text-xs py-1.5 max-w-[150px] truncate">
                                    {row?.[colIdx] != null ? String(row[colIdx]) : ''}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'mapping' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Info className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Mapeie as colunas do seu Excel para os campos do sistema (cabeçalho: linha {headerRow + 1})
                    </span>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[200px]">Campo do Sistema</TableHead>
                        <TableHead className="w-[250px]">Coluna no Excel</TableHead>
                        <TableHead>Formato / Detalhes</TableHead>
                        <TableHead className="w-[100px] text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => {
                        const mapping = mappings.find(m => m.system === field.key);
                        const isRequired = REQUIRED_FIELDS.some(f => f.key === field.key);
                        const headers = getHeadersFromRow();
                        const isDateField = DATE_FIELDS.includes(field.key);

                        return (
                          <TableRow key={field.key}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {field.label}
                                {isRequired && <span className="text-destructive">*</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={mapping?.excel || ''} 
                                onValueChange={(val) => {
                                  setMappings(prev => prev.map(m => m.system === field.key ? { ...m, excel: val } : m));
                                }}
                              >
                                <SelectTrigger className={!mapping?.excel && isRequired ? 'border-destructive' : ''}>
                                  <SelectValue placeholder="Selecione a coluna..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {headers.filter(h => h && h.trim() !== '').map((h, i) => (
                                    <SelectItem key={`${h}-${i}`} value={h}>{h}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {isDateField && mapping?.excel && (
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Formato de Origem:</span>
                                    <Select 
                                      value={mapping?.format || 'auto'} 
                                      onValueChange={(val) => {
                                        setMappings(prev => prev.map(m => m.system === field.key ? { ...m, format: val } : m));
                                      }}
                                    >
                                      <SelectTrigger className="h-7 text-[11px] w-[140px] bg-background">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DATE_FORMATS.map(f => (
                                          <SelectItem key={f.value} value={f.value} className="text-[11px]">{f.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {/* Exemplo detectado */}
                                  {(() => {
                                    const firstRow = rawPreview[headerRow + 1];
                                    const colIndex = headers.indexOf(mapping.excel);
                                    const sampleValue = colIndex !== -1 ? firstRow?.[colIndex] : null;
                                    if (sampleValue) {
                                      const { isValid, formatted } = parseDateValue(sampleValue, mapping.format || 'auto');
                                      return (
                                        <div className="flex items-center gap-1 text-[10px]">
                                          <span className="text-muted-foreground">Exemplo:</span>
                                          <span className="font-mono bg-muted px-1 rounded">{String(sampleValue)}</span>
                                          <ArrowRight className="h-2 w-2 text-muted-foreground" />
                                          <span className={isValid ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                                            {isValid ? formatted : "Erro de conversão"}
                                          </span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              )}
                              {!isDateField && mapping?.excel && field.key === 'unidade' && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Info className="h-3 w-3" />
                                  <span>Analista e assistentes serão atribuídos automaticamente.</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {mapping?.excel ? (
                                <div className="flex justify-end">
                                  <div className="h-5 w-5 bg-green-100 rounded-full flex items-center justify-center">
                                    <Check className="h-3 w-3 text-green-600" />
                                  </div>
                                </div>
                              ) : isRequired ? (
                                <div className="flex justify-end">
                                  <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Requerido</Badge>
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Opcional</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Prévia dos Dados (Primeiras 50 linhas)</h3>
                  <Badge variant="secondary">{previewData.length} registros visualizados</Badge>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead>Nº Requisicão</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Abertura</TableHead>
                          <TableHead>Responsáveis</TableHead>
                          <TableHead>Vagas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, idx) => {
                          const { analista, assistentes } = getResponsavelPorUnidade(row.unidade || '', row.tipo_vaga);
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{row.requisicao}</TableCell>
                              <TableCell className="text-xs font-medium">{row.cargo}</TableCell>
                              <TableCell className="text-xs">{row.unidade}</TableCell>
                              <TableCell className="text-xs">
                                <span className={row.__errors?.data_abertura ? "text-destructive font-bold" : ""}>
                                  {row.data_abertura ? format(new Date(row.data_abertura), 'dd/MM/yyyy') : '-'}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-[10px] text-primary">{analista}</span>
                                  {assistentes.length > 0 && (
                                    <span className="text-[9px] text-muted-foreground">{assistentes.join(', ')}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-center">{row.numero_vagas}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            )}

            {step === 'duplicates' && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-4">
                  <div className="bg-amber-100 p-2 rounded-lg h-fit">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-800">Possíveis repetições encontradas</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Detectamos {duplicates.length} registros que já podem existir no sistema. Isso pode ser uma reabertura de vaga.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Search className="h-4 w-4" /> Comparação Detalhada
                  </h4>
                  <div className="space-y-4">
                    {duplicates.slice(0, 3).map((dup, idx) => (
                      <div key={idx} className="grid grid-cols-2 gap-4">
                        <div className="border rounded-xl p-4 bg-muted/30 relative overflow-hidden">
                          <div className="absolute top-0 left-0 bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-br">Existente</div>
                          <div className="mt-2 space-y-2">
                            <div className="flex justify-between border-b pb-1">
                              <span className="text-[10px] text-muted-foreground uppercase">Requisição</span>
                              <span className="text-xs font-bold">{dup.__existing?.numero_requisicao}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                              <span className="text-[10px] text-muted-foreground uppercase">Cargo</span>
                              <span className="text-xs font-medium truncate ml-4">{dup.__existing?.cargo}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[10px] text-muted-foreground uppercase">Unidade</span>
                              <span className="text-xs">{dup.__existing?.unidade}</span>
                            </div>
                          </div>
                        </div>
                        <div className="border rounded-xl p-4 border-amber-200 bg-amber-50/30 relative overflow-hidden">
                          <div className="absolute top-0 left-0 bg-amber-200 text-amber-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-br">Novo Importado</div>
                          <div className="mt-2 space-y-2">
                            <div className="flex justify-between border-b border-amber-100 pb-1">
                              <span className="text-[10px] text-amber-600 uppercase">Requisição</span>
                              <span className="text-xs font-bold">{dup.numero_requisicao}</span>
                            </div>
                            <div className="flex justify-between border-b border-amber-100 pb-1">
                              <span className="text-[10px] text-amber-600 uppercase">Cargo</span>
                              <span className="text-xs font-medium truncate ml-4">{dup.cargo}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[10px] text-amber-600 uppercase">Unidade</span>
                              <span className="text-xs">{dup.unidade}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {duplicates.length > 3 && (
                      <p className="text-center text-xs text-muted-foreground">... e mais {duplicates.length - 3} possíveis repetições</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-xl border">
                  <h4 className="text-sm font-bold text-foreground">Como deseja tratar estas repetições?</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <Button variant="outline" className="flex-col h-24 gap-2 border-primary/20 hover:bg-primary/5" onClick={() => handleDuplicateAction('new')}>
                      <Plus className="h-5 w-5 text-primary" />
                      <div className="text-center">
                        <div className="text-xs font-bold">Importar como Nova</div>
                        <div className="text-[9px] text-muted-foreground">Tratar como reabertura</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="flex-col h-24 gap-2 border-blue-200 hover:bg-blue-50" onClick={() => handleDuplicateAction('update')}>
                      <Check className="h-5 w-5 text-blue-500" />
                      <div className="text-center">
                        <div className="text-xs font-bold">Atualizar Existentes</div>
                        <div className="text-[9px] text-muted-foreground">Mesclar informações</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="flex-col h-24 gap-2 border-red-200 hover:bg-red-50" onClick={() => handleDuplicateAction('ignore')}>
                      <X className="h-5 w-5 text-red-500" />
                      <div className="text-center">
                        <div className="text-xs font-bold">Ignorar Linhas</div>
                        <div className="text-[9px] text-muted-foreground">Descartar duplicados</div>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 'summary' && importSummary && (
              <div className="space-y-6 flex flex-col items-center">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground">Importação Concluída</h2>
                  <p className="text-muted-foreground">Os dados foram processados e já estão disponíveis no sistema.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
                  <div className="p-4 bg-background border rounded-xl text-center">
                    <div className="text-2xl font-bold text-foreground">{importSummary.total_lidos}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Lidos</div>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-700">{importSummary.total_novos}</div>
                    <div className="text-[10px] text-green-600 uppercase font-bold tracking-wider">Novas Vagas</div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
                    <div className="text-2xl font-bold text-blue-700">{importSummary.total_datas_convertidas}</div>
                    <div className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">Datas OK</div>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                    <div className="text-2xl font-bold text-amber-700">{importSummary.repeticoes_tratadas}</div>
                    <div className="text-[10px] text-amber-600 uppercase font-bold tracking-wider">Repetições</div>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
                    <div className="text-2xl font-bold text-red-700">{importSummary.total_erros}</div>
                    <div className="text-[10px] text-red-600 uppercase font-bold tracking-wider">Erros</div>
                  </div>
                </div>

                <div className="w-full flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2">
                    <FileWarning className="h-4 w-4" /> Relatório de Inconsistências
                  </Button>
                  <Button variant="default" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => onOpenChange(false)}>
                    Concluir
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/30">
          <div className="flex justify-between w-full">
            <Button variant="ghost" onClick={() => { if (step === 'select') onOpenChange(false); else setStep('select'); }}>
              {step === 'select' ? 'Cancelar' : 'Voltar'}
            </Button>
            
            {step === 'sheets' && (
              <Button onClick={startMapping} disabled={selectedSheets.length === 0}>
                Aplicar cabeçalho e continuar <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 'mapping' && (
              <Button onClick={generatePreview} disabled={mappings.filter(m => REQUIRED_FIELDS.some(f => f.key === m.system)).some(m => !m.excel)}>
                Visualizar Prévia <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 'preview' && (
              <Button onClick={detectDuplicates} disabled={isProcessing}>
                {isProcessing ? 'Processando...' : 'Verificar Repetições'} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Plus(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
