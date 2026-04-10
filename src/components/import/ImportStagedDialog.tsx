import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, 
  Search, Info, Check, X, FileWarning, Database, Layers, Loader2, ListChecks,
  History, Settings, Play, DatabaseZap, Briefcase, Users, ChevronDown
} from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { useVagasStore } from '@/store/vagasStore';
import { toast } from 'sonner';
import { ImportService, ImportProgress, ColumnMapping } from '@/services/importService';
import { autoMapColumns, getDefaultHeaderRow, VAGA_REQUIRED_COLUMNS, BANCO_REQUIRED_COLUMNS, BANCO_OPTIONAL_COLUMNS } from '@/lib/importUtils';
import { cn } from '@/lib/utils';

interface ImportStagedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: 'vagas' | 'banco';
}

type Step = 'select' | 'mapping' | 'processing' | 'result';

export function ImportStagedDialog({ open, onOpenChange, type: initialType }: ImportStagedDialogProps) {
  const { currentUser } = useAdminStore();
  const { fetchVagas, fetchBancos, fetchImportHistory } = useVagasStore();
  
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'vagas' | 'banco'>(initialType || 'vagas');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sampleData, setSampleData] = useState<any[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    phase: 'upload',
    percentage: 0,
    label: '',
    processedRows: 0,
    totalRows: 0,
    errors: []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset when closing
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('select');
        setFile(null);
        setWorkbook(null);
        setMappings([]);
        setImportProgress({
          phase: 'upload',
          percentage: 0,
          label: '',
          processedRows: 0,
          totalRows: 0,
          errors: []
        });
      }, 300);
    }
  }, [open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportProgress(p => ({ ...p, label: 'Lendo estrutura do arquivo...', percentage: 10 }));
    
    try {
      const { sheetNames, sampleData, workbook } = await ImportService.analyzeFile(selectedFile) as any;
      setWorkbook(workbook);
      setSheetNames(sheetNames);
      
      // Smart sheet selection
      let defaultSheet = sheetNames[0];
      const keywords = importType === 'vagas' ? ['VAGA', 'GERAL', 'BASE'] : ['BANCO', 'GERAL', 'RESERVA'];
      const matched = sheetNames.find(name => {
        const nameStr = String(name || '').toUpperCase();
        return keywords.some(k => nameStr.includes(k.toUpperCase()));
      });
      if (matched) defaultSheet = matched;
      
      setSelectedSheet(defaultSheet);
      const sheetData = sampleData[defaultSheet];
      if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
        throw new Error(`A aba "${defaultSheet}" selecionada parece estar vazia.`);
      }
      setSampleData(sheetData);
      
      // Use predefined header row based on type
      const defaultHeaderIndex = getDefaultHeaderRow(importType);
      setHeaderRow(defaultHeaderIndex);
      
      // Auto mapping
      const headers = (sheetData[defaultHeaderIndex] || [])
        .map((c: any) => String(c || '').trim())
        .filter((h: string) => h !== '');
      
      if (headers.length === 0) {
        throw new Error(`Não foi possível identificar o cabeçalho na aba "${defaultSheet}". Revise a linha de cabeçalho.`);
      }

      const autoMappings = autoMapColumns(headers, importType);
      setMappings(autoMappings);
      
      // Check if all required fields are mapped - if so, skip mapping step and go straight to import
      const requiredFields = importType === 'vagas' ? VAGA_REQUIRED_COLUMNS : BANCO_REQUIRED_COLUMNS;
      const allRequiredMapped = requiredFields.every(f => autoMappings.some(m => m.system === f.key));
      
      if (allRequiredMapped) {
        // Auto-start import directly
        setStep('mapping');
        toast.success(`Mapeamento automático: ${autoMappings.length} colunas identificadas. Confira e clique "Iniciar Importação".`);
      } else {
        setStep('mapping');
      }
    } catch (err: any) {
      toast.error(`Falha na leitura do arquivo: ${err.message || 'Erro desconhecido'}`);
      console.error("Erro na leitura da estrutura:", err);
    }
  };

  const detectHeaderRow = (rows: any[][]) => {
    for (let i = 0; i < rows.length; i++) {
      const filled = rows[i].filter(c => c !== null && String(c).trim() !== '').length;
      if (filled > 3) return i;
    }
    return 0;
  };

  const handleStartImport = async () => {
    if (!workbook || !selectedSheet || !currentUser) return;
    
    // Validate required mappings
    const requiredFields = importType === 'vagas' ? VAGA_REQUIRED_COLUMNS : BANCO_REQUIRED_COLUMNS;
    const missing = requiredFields.filter(f => !mappings.some(m => m.system === f.key));
    
    if (missing.length > 0) {
      toast.error(`Mapeie as colunas obrigatórias: ${missing.map(f => f.label).join(', ')}`);
      return;
    }

    setStep('processing');
    
    try {
      await ImportService.processImportInChunks({
        type: importType,
        workbook,
        sheetName: selectedSheet,
        headerRow,
        mappings,
        userId: currentUser.id,
        onProgress: (p) => {
          setImportProgress(p);
          if (p.phase === 'success' || p.phase === 'error') {
            setStep('result');
            // Refresh stores
            if (importType === 'vagas') fetchVagas();
            else fetchBancos();
            fetchImportHistory();
          }
        }
      });
    } catch (err: any) {
      toast.error(`Erro fatal no processamento: ${err.message}`);
      setStep('result');
    }
  };

  const currentHeaders = useMemo(() => {
    if (!sampleData || sampleData.length <= headerRow) return [];
    return sampleData[headerRow].map(h => String(h || '').trim());
  }, [sampleData, headerRow]);

  const updateMapping = (systemKey: string, excelHeader: string) => {
    setMappings(prev => {
      const filtered = prev.filter(m => m.system !== systemKey);
      if (excelHeader === 'none') return filtered;
      
      const isDate = systemKey.includes('data') || systemKey === 'abertura' || systemKey === 'recebimento';
      return [...filtered, { system: systemKey, excel: excelHeader, isDate }];
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-slate-200/60 shadow-2xl">
        <DialogHeader className="p-6 border-b bg-slate-50/50">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <DatabaseZap className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Importação de Dados Robusta</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Arquitetura escalável para grandes volumes de dados
              </DialogDescription>
            </div>
          </div>
          
          {/* Phase Stepper */}
          <div className="flex items-center justify-between mt-6 px-10 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
            {[
              { id: 'select', label: 'Upload', icon: Upload },
              { id: 'mapping', label: 'Mapeamento', icon: ListChecks },
              { id: 'processing', label: 'Processamento', icon: Play },
              { id: 'result', label: 'Resultado', icon: CheckCircle2 },
            ].map((s, idx) => {
              const active = step === s.id;
              const completed = (idx === 0 && step !== 'select') || 
                               (idx === 1 && (step === 'processing' || step === 'result')) ||
                               (idx === 2 && step === 'result');
              
              return (
                <div key={s.id} className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    active ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-110" : 
                    completed ? "bg-green-500 border-green-500 text-white" : 
                    "bg-white border-slate-200 text-slate-400"
                  )}>
                    {completed ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    active ? "text-blue-600" : "text-slate-400"
                  )}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {step === 'select' && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400/50 transition-all cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileSelect} />
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <p className="mt-4 font-bold text-slate-700">Clique para selecionar ou arraste o arquivo</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Excel (.xlsx, .xls) ou CSV</p>
              
              <div className="mt-8 flex gap-3">
                <Button 
                  variant={importType === 'vagas' ? 'default' : 'outline'} 
                  className={cn("h-9 rounded-xl font-bold gap-2", importType === 'vagas' ? "bg-blue-600 shadow-md" : "")}
                  onClick={(e) => { e.stopPropagation(); setImportType('vagas'); }}
                >
                  <Briefcase className="h-4 w-4" /> Vagas
                </Button>
                <Button 
                  variant={importType === 'banco' ? 'default' : 'outline'} 
                  className={cn("h-9 rounded-xl font-bold gap-2", importType === 'banco' ? "bg-blue-600 shadow-md" : "")}
                  onClick={(e) => { e.stopPropagation(); setImportType('banco'); }}
                >
                  <Users className="h-4 w-4" /> Banco de Talentos
                </Button>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aba Selecionada</label>
                  <Select value={selectedSheet} onValueChange={(val) => {
                    setSelectedSheet(val);
                    const newSample = workbook!.Sheets[val] ? XLSX.utils.sheet_to_json<any[]>(workbook!.Sheets[val], { header: 1 }).slice(0, 20) : [];
                    setSampleData(newSample);
                    const newHeaders = (newSample[headerRow] || []).map((c: any) => String(c || '').trim());
                    setMappings(autoMapColumns(newHeaders, importType));
                  }}>
                    <SelectTrigger className="h-10 rounded-xl font-bold bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Linha do Cabeçalho</label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setHeaderRow(Math.max(0, headerRow - 1))}>
                      <ChevronDown className="h-4 w-4 rotate-180" />
                    </Button>
                    <div className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-700">
                      Linha {headerRow + 1}
                    </div>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setHeaderRow(headerRow + 1)}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Card className="border-slate-100 shadow-sm overflow-hidden bg-slate-50/30">
                <CardContent className="p-0">
                  <div className="p-4 bg-slate-50/80 border-b flex items-center justify-between">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-blue-600" />
                      Mapeamento de Colunas
                    </h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                      {mappings.length} de {importType === 'vagas' ? VAGA_REQUIRED_COLUMNS.length : BANCO_REQUIRED_COLUMNS.length} campos obrigatórios
                    </Badge>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b z-10">
                        <tr>
                          <th className="text-left p-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Campo do Sistema</th>
                          <th className="text-left p-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Coluna no Excel</th>
                          <th className="text-left p-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(importType === 'vagas' ? VAGA_REQUIRED_COLUMNS : [...BANCO_REQUIRED_COLUMNS, ...BANCO_OPTIONAL_COLUMNS]).map(field => {
                          const mapping = mappings.find(m => m.system === field.key);
                          const isRequired = importType === 'vagas' ? true : BANCO_REQUIRED_COLUMNS.some(f => f.key === field.key);
                          
                          return (
                            <tr key={field.key} className={cn("hover:bg-blue-50/30 transition-colors", !mapping && isRequired && "bg-red-50/30")}>
                              <td className="p-3">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-700">{field.label}</span>
                                  {isRequired && <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">Obrigatório</span>}
                                </div>
                              </td>
                              <td className="p-3">
                                <Select value={mapping?.excel || 'none'} onValueChange={(val) => updateMapping(field.key, val)}>
                                  <SelectTrigger className={cn("h-9 rounded-lg text-xs font-bold", mapping ? "bg-white" : "bg-slate-50 border-slate-300")}>
                                    <SelectValue placeholder="Selecionar coluna..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nenhum mapeamento</SelectItem>
                                    {currentHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3">
                                {mapping ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-bold">Mapeado</Badge>
                                ) : isRequired ? (
                                  <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 font-bold animate-pulse">Pendente</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-slate-400 border-slate-200 font-bold">Opcional</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center h-64 space-y-8 animate-in zoom-in-95 duration-500">
              <div className="relative">
                <div className="h-24 w-24 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-black text-blue-600">{importProgress.percentage}%</span>
                </div>
              </div>
              
              <div className="w-full max-w-md space-y-2 text-center">
                <p className="text-lg font-bold text-slate-800">{importProgress.label}</p>
                <Progress value={importProgress.percentage} className="h-2 rounded-full" />
                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>{importProgress.processedRows} processados</span>
                  <span>Total: {importProgress.totalRows}</span>
                </div>
              </div>

              {importProgress.errors.length > 0 && (
                <div className="w-full max-w-md p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Alertas recentes:</p>
                  <ul className="text-[10px] text-red-500 space-y-0.5">
                    {importProgress.errors.map((err, i) => <li key={i} className="truncate">• {err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={cn(
                  "h-20 w-20 rounded-full flex items-center justify-center shadow-xl",
                  importProgress.phase === 'success' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                )}>
                  {importProgress.phase === 'success' ? <CheckCircle2 className="h-10 w-10" /> : <AlertTriangle className="h-10 w-10" />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {importProgress.phase === 'success' ? 'Importação Concluída!' : 'Erro na Importação'}
                  </h2>
                  <p className="text-slate-500 font-medium">{importProgress.label}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="border-slate-100 bg-slate-50/50">
                  <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
                    <span className="text-3xl font-black text-blue-600">{importProgress.processedRows}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inseridos com Sucesso</span>
                  </CardContent>
                </Card>
                <Card className="border-slate-100 bg-slate-50/50">
                  <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
                    <span className={cn("text-3xl font-black", importProgress.errors.length > 0 ? "text-red-500" : "text-emerald-500")}>
                      {importProgress.errors.length}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alertas/Erros</span>
                  </CardContent>
                </Card>
              </div>

              {importProgress.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <History className="h-3 w-3" /> Log de Erros
                  </h4>
                  <ScrollArea className="h-32 border border-slate-200 rounded-xl bg-slate-50 p-3">
                    <div className="text-[11px] font-mono space-y-1">
                      {importProgress.errors.map((err, i) => (
                        <div key={i} className="flex gap-2 text-red-500">
                          <span className="shrink-0 font-bold">[{i+1}]</span>
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-slate-50/50 gap-2">
          {step === 'select' && (
            <Button variant="ghost" className="h-11 px-6 rounded-xl font-bold" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
          
          {step === 'mapping' && (
            <>
              <Button variant="outline" className="h-11 px-6 rounded-xl font-bold" onClick={() => setStep('select')}>
                Voltar
              </Button>
              <Button className="h-11 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 gap-2" onClick={handleStartImport}>
                Iniciar Importação <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 'processing' && (
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Por favor, aguarde a conclusão...
            </div>
          )}

          {step === 'result' && (
            <Button className="h-11 px-8 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white gap-2" onClick={() => onOpenChange(false)}>
              Concluir <Check className="h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
