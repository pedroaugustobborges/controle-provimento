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
  Search, Info, Check, X, FileWarning, Database, Layers, Calendar
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
  { label: 'Excel (número serial)', value: 'excel_serial' },
  { label: 'Auto-detectar', value: 'auto' },
];

const DATE_FIELDS = ['data_abertura_edital', 'data_validade', 'nova_data_validade', 'data_convocacao'];

const REQUIRED_FIELDS = [
  { key: 'unidade', label: 'Unidade' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'secao', label: 'Seção' },
  { key: 'numero_edital', label: 'Número do edital' },
  { key: 'data_abertura_edital', label: 'Data de Publicação' },
  { key: 'data_validade', label: 'Validade' },
];

const OPTIONAL_FIELDS = [
  { key: 'numero_processo', label: 'Número do processo' },
  { key: 'nome', label: 'Nome' },
  { key: 'classificacao', label: 'Classificação' },
  { key: 'is_prorrogado', label: 'Banco prorrogado' },
  { key: 'nova_data_validade', label: 'Nova data final' },
  { key: 'data_convocacao', label: 'Data de Convocação' },
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
  data_abertura_edital: ['abertura', 'data abertura', 'dt abertura', 'publicação', 'publicacao', 'data publicação', 'data publicacao'],
  data_validade: ['validade', 'data validade', 'dt validade', 'vencimento'],
  is_prorrogado: ['prorrogado', 'prorrogação'],
  nova_data_validade: ['nova data', 'data final', 'prorrogado até'],
  data_convocacao: ['convocação', 'data convocação', 'convocacao', 'dt convocacao', 'convocado em'],
  observacoes: ['observações', 'obs'],
};

function detectHeaderRow(rawRows: any[][]): number {
  if (!rawRows || rawRows.length === 0) return 0;
  
  let bestRow = 0;
  let bestScore = 0;
  
  // Analisamos as primeiras 15 linhas para encontrar o cabeçalho mais provável
  for (let i = 0; i < Math.min(15, rawRows.length); i++) {
    const row = rawRows[i];
    if (!row || !Array.isArray(row)) continue;
    
    // Contamos células não vazias e que não parecem ser apenas números (dados)
    const filledCells = row.filter(c => {
      if (c == null) return false;
      const str = String(c).trim();
      if (str === '') return false;
      
      // Se for uma data ou número muito grande, provavelmente é dado, não cabeçalho
      if (!isNaN(Number(str)) && str.length > 2) return false;
      
      return true;
    });
    
    // Verificamos se contém palavras-chave comuns de cabeçalho
    const hasKeywords = row.some(c => {
      const str = String(c).toLowerCase();
      return ['nome', 'cargo', 'edital', 'unidade', 'cpf', 'data', 'status'].some(k => str.includes(k));
    });

    let score = filledCells.length;
    if (hasKeywords) score += 5; // Bônus para linhas com palavras-chave

    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }
  return bestRow;
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[\r\n]+/g, ' ')       // remove quebras de linha
    .replace(/\s+/g, ' ');          // normaliza espaços
}

function fuzzyMatch(header: string, fieldKey: string): boolean {
  if (!header) return false;
  const h = normalizeString(header);
  const synonyms = FIELD_SYNONYMS[fieldKey];
  if (!synonyms) return false;
  
  return synonyms.some(syn => {
    const normalizedSyn = normalizeString(syn);
    return h === normalizedSyn || h.includes(normalizedSyn) || normalizedSyn.includes(h);
  });
}

const parseDateValue = (value: any, targetFormat: string): { date: Date | null, isValid: boolean, formatted: string, isExcelSerial?: boolean } => {
  if (value === undefined || value === null || value === '') return { date: null, isValid: true, formatted: '' };
  
  let d: Date | null = null;
  let isExcelSerial = false;

  // Se for número ou parecer número e o formato for auto ou excel_serial
  const numValue = Number(value);
  const looksLikeExcelSerial = !isNaN(numValue) && numValue > 30000 && numValue < 60000;

  if (targetFormat === 'excel_serial' || (targetFormat === 'auto' && looksLikeExcelSerial)) {
    d = addDays(new Date(1899, 11, 30), numValue);
    isExcelSerial = true;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { date: null, isValid: true, formatted: '' };
    const formats = targetFormat === 'auto' ? ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'd/M/yyyy'] : [targetFormat];
    for (const f of formats) {
      const parsed = parse(trimmed, f, new Date());
      if (isValid(parsed)) { d = parsed; break; }
    }
  } else if (value instanceof Date) {
    d = value;
  }

  if (d && isValid(d)) {
    return { 
      date: d, 
      isValid: true, 
      formatted: format(d, 'yyyy-MM-dd'),
      isExcelSerial
    };
  }
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
      try {
        const sheet = workbook.Sheets[selectedSheets[0]];
        if (sheet) {
          // Usamos raw: true e header: 1 para pegar a estrutura bruta sem processamento automático do XLSX
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { 
            header: 1, 
            raw: true,
            defval: null // Garante que células vazias não sejam ignoradas no array
          });
          
          if (rows && rows.length > 0) {
            const preview = rows.slice(0, 15); // Pegamos um pouco mais de linhas para detecção
            setRawPreview(preview);
            setHeaderRow(detectHeaderRow(preview));
          } else {
            setRawPreview([]);
            setHeaderRow(0);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar prévia da aba:", err);
        setRawPreview([]);
      }
    }
  }, [workbook, selectedSheets]);

  useEffect(() => {
    console.log("Current Step:", step);
  }, [step]);

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
    console.log("Iniciando mapeamento...", { headerRow, selectedSheets, rawPreviewLength: rawPreview.length });
    
    try {
      if (selectedSheets.length === 0) {
        toast.error("Selecione uma aba para continuar");
        return;
      }

      if (!rawPreview || rawPreview.length === 0) {
        toast.error("Não foi possível carregar os dados da aba. Tente selecionar outra aba.");
        return;
      }

      // 1. Extrair e tratar cabeçalhos
      const rawHeaders = rawPreview[headerRow] || [];
      const processedHeaders: string[] = [];
      const usedNames = new Map<string, number>();

      rawHeaders.forEach((c, i) => {
        // Fallback para nomes vazios
        let name = (c !== null && c !== undefined && String(c).trim() !== '') 
          ? String(c).trim().replace(/[\r\n]+/g, ' ') 
          : `Coluna ${i + 1}`;
        
        // Tratar duplicados
        if (usedNames.has(name)) {
          const count = usedNames.get(name)! + 1;
          usedNames.set(name, count);
          name = `${name}_${count}`;
        } else {
          usedNames.set(name, 1);
        }
        
        processedHeaders.push(name);
      });

      console.log("Colunas processadas:", processedHeaders);

      // 2. Mapeamento inicial inteligente
      const initialMappings = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => {
        // Tenta encontrar um match exato primeiro, depois fuzzy
        let matchedHeader = processedHeaders.find(h => normalizeString(h) === normalizeString(field.label));
        
        if (!matchedHeader) {
          matchedHeader = processedHeaders.find(h => fuzzyMatch(h, field.key));
        }

        return { 
          excel: matchedHeader || '', 
          system: field.key, 
          format: DATE_FIELDS.includes(field.key) ? 'auto' : undefined, 
          isDate: DATE_FIELDS.includes(field.key) 
        };
      });

      // 3. Atualizar estados e avançar
      setMappings(initialMappings);
      setStep('mapping');
      
      // Se faltarem colunas importantes, avisar amigavelmente em vez de travar
      const foundCount = initialMappings.filter(m => m.excel).length;
      if (foundCount < REQUIRED_FIELDS.length) {
        toast.info("Aba selecionada. Algumas colunas não foram identificadas automaticamente e precisam de mapeamento manual.");
      } else {
        toast.success("Colunas identificadas com sucesso!");
      }

    } catch (error) {
      console.error("Erro ao iniciar mapeamento:", error);
      // Fallback seguro: avançar mesmo com erro, limpando mapeamentos problemáticos
      setMappings([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(f => ({
        excel: '',
        system: f.key,
        format: DATE_FIELDS.includes(f.key) ? 'auto' : undefined,
        isDate: DATE_FIELDS.includes(f.key)
      })));
      setStep('mapping');
      toast.error("Houve um problema ao processar as colunas automaticamente. Por favor, faça o mapeamento manual.");
    }
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
        if (m.excel && m.excel !== 'no_mapping') {
          const val = row[m.excel];
          if (m.isDate) {
            const { isValid, formatted } = parseDateValue(val, m.format || 'auto');
            result[m.system] = formatted;
            if (!isValid && val) result.__errors[m.system] = true;
          } else { 
            result[m.system] = val; 
          }
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
        if (m.excel && m.excel !== 'no_mapping') {
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
        data_convocacao: mapped.data_convocacao || undefined,
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

  const STEPS = [
    { id: 'select', label: 'Arquivo', icon: Upload },
    { id: 'sheets', label: 'Abas', icon: Layers },
    { id: 'mapping', label: 'Mapeamento', icon: Database },
    { id: 'preview', label: 'Prévia', icon: Search },
    { id: 'summary', label: 'Conclusão', icon: CheckCircle2 },
  ];

  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) reset(); onOpenChange(val); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b bg-background">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>Importar Banco de Talentos</DialogTitle>
                  <DialogDescription>Siga as etapas para importar a base atual do banco de talentos.</DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between px-2 py-4 bg-muted/20 rounded-xl">
              {STEPS.map((s, idx) => {
                const Icon = s.icon;
                const isActive = idx === currentStepIndex;
                const isCompleted = idx < currentStepIndex;
                return (
                  <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-1.5 flex-1 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isActive ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 
                        isCompleted ? 'bg-green-500 text-white' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                        {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                      </div>
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {s.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`h-[2px] w-full flex-1 mx-[-10%] mb-4 ${idx < currentStepIndex ? 'bg-green-500' : 'bg-muted'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 bg-background/50">
          {step === 'select' && (
            <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed rounded-2xl border-border hover:border-primary/50 transition-all bg-muted/20 cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
              <div className="bg-background p-6 rounded-full shadow-md mb-6 group-hover:scale-110 transition-transform"><Upload className="h-10 w-10 text-primary" /></div>
              <h3 className="text-xl font-bold">Selecione o arquivo Excel</h3>
              <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">Arraste e solte o arquivo ou clique aqui para selecionar do seu computador</p>
              <Button variant="outline" className="mt-8">Procurar Arquivo</Button>
            </div>
          )}

          {step === 'sheets' && workbook && (
            <div className="space-y-6">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">Instruções:</p>
                  <p>Selecione a aba da planilha que contém os dados. Abaixo você pode visualizar as primeiras 10 linhas para confirmar se é a aba correta e ajustar a linha do cabeçalho.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {workbook.SheetNames.map(name => (
                  <button key={name} onClick={() => {
                    console.log("Aba selecionada:", name);
                    setSelectedSheets([name]);
                  }} className={`p-4 border-2 rounded-xl flex flex-col items-start gap-2 transition-all hover:shadow-md ${selectedSheets.includes(name) ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-lg' : 'border-border bg-card'}`}>
                    <div className="flex items-center justify-between w-full">
                      <Layers className={`h-6 w-6 ${selectedSheets.includes(name) ? 'text-primary' : 'text-muted-foreground'}`} />
                      {selectedSheets.includes(name) && <CheckCircle2 className="h-5 w-5 text-primary animate-in zoom-in" />}
                    </div>
                    <span className={`font-bold text-sm truncate w-full text-left ${selectedSheets.includes(name) ? 'text-primary' : ''}`}>{name}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-bold">Pré-visualização: <span className="text-primary">{selectedSheets[0]}</span></h4>
                  </div>
                  <div className="flex items-center gap-3 bg-muted/40 px-3 py-1.5 rounded-lg">
                    <label className="text-xs font-bold text-muted-foreground">Linha do cabeçalho:</label>
                    <Select value={String(headerRow + 1)} onValueChange={(val) => setHeaderRow(Number(val) - 1)}>
                      <SelectTrigger className="w-24 h-8 text-xs font-semibold border-none shadow-none bg-transparent hover:bg-muted/50 transition-colors"><SelectValue /></SelectTrigger>
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
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex items-start gap-3 mb-4">
                <Database className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Mapeamento de Colunas:</p>
                  <p>Relacione as colunas da sua planilha com os campos do sistema. Campos marcados com <span className="text-destructive font-bold">*</span> são obrigatórios.</p>
                </div>
              </div>
              <div className="border rounded-xl overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[300px]">Campo do Sistema</TableHead>
                      <TableHead>Coluna no Excel</TableHead>
                      <TableHead className="w-[120px] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => {
                      const mapping = mappings.find(m => m.system === field.key);
                      const isRequired = REQUIRED_FIELDS.some(f => f.key === field.key);
                      return (
                        <TableRow key={field.key} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{field.label}{isRequired && <span className="text-destructive ml-1">*</span>}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">{field.key.replace(/_/g, ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-2">
                              <Select value={mapping?.excel || ''} onValueChange={(val) => setMappings(prev => prev.map(m => m.system === field.key ? { ...m, excel: val } : m))}>
                                <SelectTrigger className={`h-9 ${!mapping?.excel && isRequired ? 'border-destructive/50 bg-destructive/5' : 'bg-background'}`}>
                                  <SelectValue placeholder="Selecione a coluna..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="no_mapping" className="text-muted-foreground italic">Não mapear</SelectItem>
                                  {(rawPreview[headerRow] || []).map((h, i) => {
                                    const label = (h !== null && h !== undefined && String(h).trim() !== '') ? String(h).trim() : `Coluna ${i + 1}`;
                                    // Verificamos se há duplicados e mostramos o índice se necessário para diferenciar no dropdown
                                    const isDuplicate = (rawPreview[headerRow] || []).filter(x => String(x).trim() === String(h).trim()).length > 1;
                                    const displayLabel = isDuplicate ? `${label} (Posição ${i + 1})` : label;
                                    return <SelectItem key={i} value={label}>{displayLabel}</SelectItem>;
                                  })}
                                </SelectContent>
                              </Select>

                              {mapping?.excel && mapping.excel !== 'no_mapping' && mapping.isDate && (
                                <div className="flex flex-col gap-1.5 p-2 bg-muted/30 rounded-lg border border-border/50">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                      <Calendar className="h-3 w-3" /> Formato de origem
                                    </label>
                                    {(() => {
                                      const colIdx = rawPreview[headerRow].indexOf(mapping.excel);
                                      const sampleVal = rawPreview.find((r, i) => i > headerRow && r[colIdx])?.[colIdx];
                                      if (sampleVal && !isNaN(Number(sampleVal)) && Number(sampleVal) > 30000 && mapping.format !== 'excel_serial') {
                                        return (
                                          <div className="flex items-center gap-1 text-[9px] text-amber-600 font-bold bg-amber-50 px-1 rounded border border-amber-100 animate-pulse">
                                            Excel Serial?
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  <Select 
                                    value={mapping.format || 'auto'} 
                                    onValueChange={(val) => setMappings(prev => prev.map(m => m.system === field.key ? { ...m, format: val } : m))}
                                  >
                                    <SelectTrigger className="h-7 text-xs bg-background border-muted-foreground/20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DATE_FORMATS.map(f => (
                                        <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-center align-top">
                            {mapping?.excel && mapping.excel !== 'no_mapping' ? (
                              <div className="bg-green-100 text-green-700 p-1.5 rounded-full inline-flex items-center justify-center mt-1"><Check className="h-3.5 w-3.5" /></div>
                            ) : isRequired ? (
                              <div className="mt-1 flex justify-center">
                                <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 uppercase font-bold tracking-tight">Obrigatório</Badge>
                              </div>
                            ) : (
                              <div className="mt-1 flex justify-center">
                                <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground border-border uppercase font-medium">Opcional</Badge>
                              </div>
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
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold">Prévia dos Dados Validada</h3>
                  <p className="text-sm text-muted-foreground">Revise como os dados serão importados para o sistema.</p>
                </div>
                <Badge variant="secondary" className="px-3 py-1 font-semibold">
                  {previewData.length} registros para importar
                </Badge>
              </div>
              <div className="border rounded-xl overflow-hidden bg-card">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead>Cargo / Candidato</TableHead>
                        <TableHead>Unidade / Seção</TableHead>
                        <TableHead>Edital / Processo</TableHead>
                        <TableHead>Datas (Pub / Val / Conv)</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, idx) => {
                        const hasErrors = row.__errors && Object.keys(row.__errors).length > 0;
                        return (
                          <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-sm">{row.nome || 'Não informado'}</span>
                                <span className="text-xs text-muted-foreground">{row.cargo}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-xs">
                                <span>{row.unidade}</span>
                                <span className="text-muted-foreground">{row.secao}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-xs">
                                <span>Edital: {row.numero_edital}</span>
                                {row.numero_processo && <span className="text-muted-foreground">Proc: {row.numero_processo}</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-xs gap-1">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-muted-foreground">Pub:</span>
                                  <span className={`font-medium ${row.__errors?.data_abertura_edital ? 'text-destructive font-bold' : ''}`}>
                                    {row.data_abertura_edital || '-'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-muted-foreground">Val:</span>
                                  <span className={`font-medium ${row.__errors?.data_validade ? 'text-destructive font-bold' : ''}`}>
                                    {row.data_validade || '-'}
                                  </span>
                                </div>
                                {row.data_convocacao && (
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Conv:</span>
                                    <span className={`font-medium ${row.__errors?.data_convocacao ? 'text-destructive font-bold' : ''}`}>
                                      {row.data_convocacao}
                                    </span>
                                  </div>
                                )}
                                {row.is_prorrogado && <Badge variant="outline" className="text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-200 w-fit">Prorrogado</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {hasErrors ? (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}

          {step === 'summary' && importSummary && (
            <div className="space-y-8 flex flex-col items-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Importação Concluída!</h2>
                <p className="text-muted-foreground max-w-sm">A base do banco de talentos foi atualizada com sucesso no sistema.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <div className="bg-muted/30 p-4 rounded-2xl border text-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Total Processado</span>
                  <p className="text-2xl font-bold text-primary">{importSummary.total_lidos}</p>
                </div>
                <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100 text-center">
                  <span className="text-xs font-medium text-green-600 uppercase">Novos Registros</span>
                  <p className="text-2xl font-bold text-green-700">{importSummary.total_novos}</p>
                </div>
              </div>
              <Button size="lg" className="px-12 rounded-full mt-4 shadow-lg hover:shadow-xl transition-all" onClick={() => onOpenChange(false)}>Concluir e Fechar</Button>
            </div>
          )}
        </div>

        {step !== 'summary' && (
          <DialogFooter className="p-6 border-t bg-muted/20 flex flex-col gap-4 sm:flex-row items-center justify-between sm:justify-between">
            <Button variant="ghost" onClick={() => { 
              if (step === 'select') onOpenChange(false); 
              else if (step === 'sheets') setStep('select');
              else if (step === 'mapping') setStep('sheets');
              else if (step === 'preview') setStep('mapping');
            }} className="rounded-xl px-6">
              {step === 'select' ? 'Cancelar' : 'Voltar'}
            </Button>
            
            <div className="flex gap-3">
              {step === 'sheets' && (
                <Button 
                  onClick={() => {
                    console.log("Clicou no botão Próximo: Mapear colunas");
                    startMapping();
                  }} 
                  disabled={selectedSheets.length === 0}
                  className="rounded-xl px-8 shadow-sm font-bold"
                >
                  Próximo: Mapear colunas <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === 'mapping' && (
                <Button onClick={() => {
                  console.log("Clicou no botão Visualizar Prévia");
                  const missingRequired = REQUIRED_FIELDS.filter(f => !mappings.find(m => m.system === f.key)?.excel || mappings.find(m => m.system === f.key)?.excel === 'no_mapping');
                  if (missingRequired.length > 0) {
                    toast.error(`Mapeie os campos obrigatórios: ${missingRequired.map(f => f.label).join(', ')}`);
                    return;
                  }
                  generatePreview();
                }} className="rounded-xl px-8 shadow-sm font-bold">
                  Visualizar Prévia <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === 'preview' && (
                <Button onClick={processImport} disabled={isProcessing} className="rounded-xl px-10 shadow-md bg-green-600 hover:bg-green-700 text-white border-none font-bold">
                  {isProcessing ? (
                    <>Processando... <div className="ml-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /></>
                  ) : (
                    <>Confirmar Importação <Check className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}

        {/* Visual Debug Bar */}
        <div className="px-6 py-2 bg-slate-900 text-[10px] text-slate-400 flex items-center gap-4 border-t border-slate-800">
          <span>Aba: <span className="text-white font-mono">{selectedSheets[0] || 'Nenhuma'}</span></span>
          <span className="text-slate-700">|</span>
          <span>Header: <span className="text-white font-mono">Linha {headerRow + 1}</span></span>
          <span className="text-slate-700">|</span>
          <span>Etapa: <span className="text-primary font-bold uppercase">{step}</span></span>
          <div className="flex-1" />
          <span>Registros Detectados: <span className="text-white font-mono">{rawPreview.length}</span></span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
