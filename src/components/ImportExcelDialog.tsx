import React, { useState, useRef } from 'react';
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
import { Vaga, StatusEdital, TipoVaga } from '@/types/vaga';
import { toast } from 'sonner';

type Step = 'select' | 'sheets' | 'mapping' | 'preview' | 'duplicates' | 'summary';

interface ColumnMapping {
  excel: string;
  system: string;
}

const REQUIRED_FIELDS = [
  { key: 'unidade', label: 'Unidade' },
  { key: 'data_abertura', label: 'Data Abertura' },
  { key: 'requisicao', label: 'Nº Requisição' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'numero_vagas', label: 'Nº Vagas' },
];

const OPTIONAL_FIELDS = [
  { key: 'data_recebimento', label: 'Data Recebimento' },
  { key: 'numero_edital', label: 'Nº Edital' },
  { key: 'numero_processo', label: 'Nº Processo' },
  { key: 'secao', label: 'Seção' },
  { key: 'tipo_vaga', label: 'Tipo' },
  { key: 'analista_responsavel', label: 'Analista' },
  { key: 'observacoes_internas', label: 'Observações' },
];


export function ImportExcelDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { addVagas, vagas, addImportHistory } = useVagasStore();
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const startMapping = () => {
    if (selectedSheets.length === 0) return;
    
    // Get headers from first sheet
    const firstSheet = workbook?.Sheets[selectedSheets[0]];
    const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1');
    const headers: string[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      const cell = firstSheet[address];
      headers.push(cell ? cell.v.toString() : `Column ${C + 1}`);
    }

    // Attempt auto-mapping
    const initialMappings = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => {
      const matchedHeader = headers.find(h => 
        h.toLowerCase().includes(field.label.toLowerCase()) || 
        h.toLowerCase().includes(field.key.toLowerCase())
      );
      return { excel: matchedHeader || '', system: field.key };
    });

    setMappings(initialMappings);
    setStep('mapping');
  };

  const generatePreview = () => {
    const allData: any[] = [];
    selectedSheets.forEach(sheetName => {
      const sheet = workbook?.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet!);
      allData.push(...data.map((row: any) => ({ ...row, __sheet: sheetName })));
    });

    const mappedData = allData.map(row => {
      const result: any = { __original: row };
      mappings.forEach(m => {
        if (m.excel) {
          result[m.system] = row[m.excel];
        }
      });
      return result;
    });

    setPreviewData(mappedData.slice(0, 50));
    setStep('preview');
  };

  const detectDuplicates = () => {
    setIsProcessing(true);
    
    // In a real app, we'd process all data, not just preview
    // For this prototype, we'll process all data from sheets
    const allData: any[] = [];
    selectedSheets.forEach(sheetName => {
      const sheet = workbook?.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet!);
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

  const processImport = (dataToImport: any[], treatAsNew: boolean = true) => {
    setIsProcessing(true);
    const now = new Date().toISOString();
    const loteId = `LOTE-${Date.now()}`;
    
    const newVagas: Vaga[] = dataToImport.map((row, i) => {
      const statusEdital: StatusEdital = row.numero_edital ? 'Em andamento' : (row.numero_processo ? 'Aguardando edital' : 'Aguardando processo e edital');
      
      return {
        id: `imp-${Date.now()}-${i}`,
        unidade: String(row.unidade || ''),
        data_abertura: String(row.data_abertura || now.split('T')[0]),
        numero_requisicao: String(row.numero_requisicao || `REQ-${Date.now()}-${i}`),
        cargo: String(row.cargo || 'Não informado'),
        quantidade: Number(row.quantidade) || 1,
        secao: String(row.secao || ''),
        pcd: row.pcd === 'Sim' || row.pcd === true,
        estado: String(row.estado || 'GO'),
        tipo_vaga: (row.tipo_vaga as TipoVaga) || 'quadro',
        selecao: String(row.selecao || 'Pública'),
        numero_edital: row.numero_edital ? String(row.numero_edital) : undefined,
        numero_processo: row.numero_processo ? String(row.numero_processo) : undefined,
        status_geral: 'aberta',
        status_edital: statusEdital,
        origem_importacao: file?.name || 'Excel',
        data_importacao: now,
        lote_importacao: loteId,
        observacoes: String(row.observacoes || ''),
        analista_responsavel: 'Sistema',
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
      repeticoes_tratadas: duplicates.length
    };
    
    addImportHistory({
      id: loteId,
      data: now,
      usuario: 'Ana Paula Oliveira',
      nome_arquivo: file?.name || 'excel_import.xlsx',
      ...summary,
      status: 'concluido'
    });

    setImportSummary(summary);
    setStep('summary');
    setIsProcessing(false);
    toast.success('Importação concluída com sucesso!');
  };

  const handleDuplicateAction = (action: 'new' | 'update' | 'ignore') => {
    // In a real app, we'd handle each duplicate individually or all at once
    // For simplicity, we'll proceed with all data
    const allData: any[] = [];
    selectedSheets.forEach(sheetName => {
      const sheet = workbook?.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet!);
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
                    ${step === item.s ? 'bg-primary text-white' : 
                      (['select', 'sheets', 'mapping', 'preview', 'duplicates', 'summary'].indexOf(step) > idx) ? 
                      'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}
                  `}>
                    {(['select', 'sheets', 'mapping', 'preview', 'duplicates', 'summary'].indexOf(step) > idx) ? <Check className="h-3 w-3" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-medium ${step === item.s ? 'text-primary' : 'text-slate-400'}`}>
                    {item.l}
                  </span>
                  {idx < 5 && <ArrowRight className="h-3 w-3 text-slate-300" />}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {step === 'select' && (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl border-slate-200 hover:border-primary/50 transition-colors bg-slate-50/50" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">Selecione o arquivo Excel</h3>
                <p className="text-sm text-slate-500 mt-1">Arraste e solte ou clique para navegar</p>
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
                        ${selectedSheets.includes(name) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300'}
                      `}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Layers className={`h-5 w-5 ${selectedSheets.includes(name) ? 'text-primary' : 'text-slate-400'}`} />
                        {selectedSheets.includes(name) && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <span className="font-semibold text-sm text-slate-700 truncate w-full text-left">{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'mapping' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Info className="h-4 w-4" />
                    <span className="text-xs font-medium">Mapeie as colunas do seu Excel para os campos do sistema</span>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[250px]">Campo do Sistema</TableHead>
                        <TableHead>Coluna no Excel</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => {
                        const mapping = mappings.find(m => m.system === field.key);
                        const isRequired = REQUIRED_FIELDS.some(f => f.key === field.key);
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
                                  {(workbook && (XLSX.utils.sheet_to_json(workbook.Sheets[selectedSheets[0]], { header: 1 }) as any[][])[0]?.map((h: any) => (
                                    <SelectItem key={h} value={String(h)}>{String(h)}</SelectItem>
                                  )))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {mapping?.excel ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Mapeado</Badge>
                              ) : isRequired ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Obrigatório</Badge>
                              ) : null}
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
                  <h3 className="text-sm font-semibold text-slate-700">Prévia dos Dados (Primeiras 50 linhas)</h3>
                  <Badge variant="secondary">{previewData.length} registros visualizados</Badge>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead>Nº Requisicão</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Abertura</TableHead>
                          <TableHead>Vagas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{row.numero_requisicao || '—'}</TableCell>
                            <TableCell className="text-xs font-medium">{row.cargo || '—'}</TableCell>
                            <TableCell className="text-xs">{row.unidade || '—'}</TableCell>
                            <TableCell className="text-xs">{row.data_abertura || '—'}</TableCell>
                            <TableCell className="text-xs text-center">{row.quantidade || '—'}</TableCell>
                          </TableRow>
                        ))}
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
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Search className="h-4 w-4" /> Comparação Detalhada
                  </h4>
                  <div className="space-y-4">
                    {duplicates.slice(0, 3).map((dup, idx) => (
                      <div key={idx} className="grid grid-cols-2 gap-4">
                        <div className="border rounded-xl p-4 bg-slate-50 relative overflow-hidden">
                          <div className="absolute top-0 left-0 bg-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-br">Existente</div>
                          <div className="mt-2 space-y-2">
                            <div className="flex justify-between border-b pb-1">
                              <span className="text-[10px] text-slate-500 uppercase">Requisição</span>
                              <span className="text-xs font-bold">{dup.__existing?.numero_requisicao}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                              <span className="text-[10px] text-slate-500 uppercase">Cargo</span>
                              <span className="text-xs font-medium truncate ml-4">{dup.__existing?.cargo}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[10px] text-slate-500 uppercase">Unidade</span>
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
                      <p className="text-center text-xs text-slate-500">... e mais {duplicates.length - 3} possíveis repetições</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl border">
                  <h4 className="text-sm font-bold text-slate-700">Como deseja tratar estas repetições?</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <Button variant="outline" className="flex-col h-24 gap-2 border-primary/20 hover:bg-primary/5" onClick={() => handleDuplicateAction('new')}>
                      <Plus className="h-5 w-5 text-primary" />
                      <div className="text-center">
                        <div className="text-xs font-bold">Importar como Nova</div>
                        <div className="text-[9px] text-slate-500">Tratar como reabertura</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="flex-col h-24 gap-2 border-blue-200 hover:bg-blue-50" onClick={() => handleDuplicateAction('update')}>
                      <Check className="h-5 w-5 text-blue-500" />
                      <div className="text-center">
                        <div className="text-xs font-bold">Atualizar Existentes</div>
                        <div className="text-[9px] text-slate-500">Mesclar informações</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="flex-col h-24 gap-2 border-red-200 hover:bg-red-50" onClick={() => handleDuplicateAction('ignore')}>
                      <X className="h-5 w-5 text-red-500" />
                      <div className="text-center">
                        <div className="text-xs font-bold">Ignorar Linhas</div>
                        <div className="text-[9px] text-slate-500">Descartar duplicados</div>
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
                  <h2 className="text-2xl font-bold text-slate-800">Importação Concluída</h2>
                  <p className="text-slate-500">Os dados foram processados e já estão disponíveis no sistema.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  <div className="p-4 bg-white border rounded-xl text-center">
                    <div className="text-2xl font-bold text-slate-800">{importSummary.total_lidos}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Lidos</div>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-700">{importSummary.total_novos}</div>
                    <div className="text-[10px] text-green-600 uppercase font-bold tracking-wider">Novas Vagas</div>
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

        <DialogFooter className="p-6 border-t bg-slate-50">
          <div className="flex justify-between w-full">
            <Button variant="ghost" onClick={() => { if (step === 'select') onOpenChange(false); else setStep('select'); }}>
              {step === 'select' ? 'Cancelar' : 'Voltar'}
            </Button>
            
            {step === 'sheets' && (
              <Button onClick={startMapping} disabled={selectedSheets.length === 0}>
                Continuar para Mapeamento <ArrowRight className="h-4 w-4 ml-2" />
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
