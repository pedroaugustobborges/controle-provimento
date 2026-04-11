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
import { autoMapColumns, getDefaultHeaderRow, VAGA_REQUIRED_COLUMNS, VAGA_OPTIONAL_COLUMNS, BANCO_REQUIRED_COLUMNS, BANCO_OPTIONAL_COLUMNS } from '@/lib/importUtils';
import { cn } from '@/lib/utils';
import { buildBancoImportObservation, ImportExecutionOptions, normalizeImportSystemKey } from '@/lib/importScopeUtils';

interface ImportStagedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: 'vagas' | 'banco';
}

type Step = 'type-selection' | 'select' | 'mapping' | 'processing' | 'result';

export function ImportStagedDialog({ open, onOpenChange, type: initialType }: ImportStagedDialogProps) {
  const { currentUser } = useAdminStore();
  const { fetchVagas, fetchBancos, fetchImportHistory } = useVagasStore();
  
  const [step, setStep] = useState<Step>('type-selection');
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'vagas' | 'banco'>('vagas');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sampleData, setSampleData] = useState<any[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [autoMappingErrors, setAutoMappingErrors] = useState<string[]>([]);
  const [importOptions, setImportOptions] = useState<ImportExecutionOptions>({
    bancoTipo: 'geral',
    bancoEscopo: 'goias',
    bancoModo: 'substituir',
  });
  
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
        setStep('type-selection');
        setFile(null);
        setWorkbook(null);
        setMappings([]);
        setAutoMappingErrors([]);
        setHeaderRow(getDefaultHeaderRow(initialType || 'vagas'));
        setImportType(initialType || 'vagas');
        setImportOptions({
          bancoTipo: 'geral',
          bancoEscopo: 'goias',
          bancoModo: 'substituir',
        });
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

  useEffect(() => {
    if (open) {
      setStep('type-selection');
    }
  }, [open]);

  const requiredFields = useMemo(
    () => (importType === 'vagas' ? VAGA_REQUIRED_COLUMNS : BANCO_REQUIRED_COLUMNS),
    [importType]
  );

  const allFields = useMemo(
    () => (importType === 'vagas' ? [...VAGA_REQUIRED_COLUMNS, ...VAGA_OPTIONAL_COLUMNS] : [...BANCO_REQUIRED_COLUMNS, ...BANCO_OPTIONAL_COLUMNS]),
    [importType]
  );

  const missingRequiredFields = useMemo(
    () => requiredFields.filter(field => !mappings.some(mapping => normalizeImportSystemKey(mapping.system) === field.key)),
    [mappings, requiredFields]
  );

  const applyAutomaticConfiguration = (
    workbookData: XLSX.WorkBook,
    sheetName: string,
    nextType: 'vagas' | 'banco'
  ) => {
    // Para a aba VAGAS_GERAL do arquivo VAGAS_UNIFICADO, o cabeçalho é sempre a primeira linha (índice 0)
    const isVagasGeral = sheetName.toUpperCase() === 'VAGAS_GERAL' && nextType === 'vagas';
    const defaultHeaderIndex = isVagasGeral ? 0 : getDefaultHeaderRow(nextType);
    
    const nextSampleData = workbookData.Sheets[sheetName]
      ? XLSX.utils.sheet_to_json<any[]>(workbookData.Sheets[sheetName], { header: 1 }).slice(0, 20)
      : [];

    setHeaderRow(defaultHeaderIndex);
    setSampleData(nextSampleData);

    const headers = (nextSampleData[defaultHeaderIndex] || [])
      .map((cell: any) => String(cell || '').trim());

    const nextMappings = autoMapColumns(headers, nextType).map(mapping => ({
      ...mapping,
      system: normalizeImportSystemKey(mapping.system),
    }));
    const nextRequiredFields = nextType === 'vagas' ? VAGA_REQUIRED_COLUMNS : BANCO_REQUIRED_COLUMNS;
    const missingFields = nextRequiredFields.filter(field => !nextMappings.some(mapping => mapping.system === field.key));

    setMappings(nextMappings);
    setAutoMappingErrors(missingFields.map(field => field.label));

    return { nextMappings, missingFields };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportProgress(p => ({ ...p, label: 'Lendo estrutura do arquivo...', percentage: 10 }));
    
    try {
      const { sheetNames, sampleData, workbook } = await ImportService.analyzeFile(selectedFile) as any;
      setWorkbook(workbook);
      setSheetNames(sheetNames);
      
      let defaultSheet = sheetNames[0];
      
      if (importType === 'banco') {
        const matched = sheetNames.find(name => String(name || '').toUpperCase() === 'BANCO_GERAL');
        if (matched) {
          defaultSheet = matched;
        } else {
          toast.error('O arquivo de Banco de Talentos deve conter uma aba chamada "BANCO_GERAL".');
        }
      } else {
        const matched = sheetNames.find(name => String(name || '').toUpperCase() === 'VAGAS_GERAL') ||
                        sheetNames.find(name => {
                          const nameStr = String(name || '').toUpperCase();
                          return ['VAGAS', 'GERAL', 'BASE'].some(k => nameStr.includes(k));
                        });
        if (matched) defaultSheet = matched;
      }
      
      setSelectedSheet(defaultSheet);
      const { nextMappings, missingFields } = applyAutomaticConfiguration(workbook, defaultSheet, importType);

      setStep('mapping');
      
      if (importType === 'vagas') {
        if (missingFields.length > 0) {
          toast.info("Verifique o mapeamento das colunas que não foram identificadas.");
        } else {
          toast.success("Mapeamento automático realizado com sucesso.");
        }
      }
    } catch (err: any) {
      toast.error(`Falha na leitura do arquivo: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const handleManualMapping = (systemKey: string, excelHeader: string) => {
    const updatedMappings = mappings.filter(m => normalizeImportSystemKey(m.system) !== normalizeImportSystemKey(systemKey));
    if (excelHeader && excelHeader !== 'none') {
      const isDate = systemKey.includes('data') || 
                     systemKey.includes('_data') || 
                     systemKey === 'data_abertura' || 
                     systemKey === 'data_recebimento' || 
                     systemKey === 'data_convocacao' || 
                     systemKey === 'data_validade';
      updatedMappings.push({
        excel: excelHeader,
        system: systemKey,
        isDate
      });
    }
    setMappings(updatedMappings);
  };

  const handleStartImport = async () => {
    if (!workbook || !selectedSheet || !currentUser) return;
    
    const missing = requiredFields.filter(field => !mappings.some(mapping => normalizeImportSystemKey(mapping.system) === field.key));
    
    if (missing.length > 0) {
      toast.error(`Não foi possível reconhecer automaticamente as colunas obrigatórias: ${missing.map(f => f.label).join(', ')}`);
      return;
    }

    if (importType === 'banco' && importOptions.bancoTipo === 'geral' && !importOptions.bancoEscopo) {
      toast.error('Selecione o escopo do banco geral antes de iniciar a importação.');
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
        options: importType === 'banco' ? importOptions : undefined,
        userId: currentUser.id,
        fileName: file?.name,
        userName: currentUser.nome_completo,
        userEmail: currentUser.email,
        onProgress: (p) => {
          setImportProgress(p);
          if (p.phase === 'success' || p.phase === 'error') {
            setStep('result');
            void Promise.all([
              importType === 'vagas' ? fetchVagas() : fetchBancos(),
              fetchImportHistory(),
            ]);
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

  const recognizedOptionalFields = useMemo(
    () => BANCO_OPTIONAL_COLUMNS.filter(field => mappings.some(mapping => normalizeImportSystemKey(mapping.system) === field.key)),
    [mappings]
  );

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
              { id: 'type-selection', label: 'Tipo', icon: ListChecks },
              { id: 'select', label: 'Upload', icon: Upload },
              { id: 'mapping', label: 'Mapeamento', icon: Settings },
              { id: 'processing', label: 'Importação', icon: Play },
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
          {step === 'type-selection' && (
            <div className="flex flex-col items-center justify-center h-80 space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-800">O que esse arquivo contém?</h3>
                <p className="text-slate-500 font-medium text-sm">Selecione o tipo de dado para que possamos processar corretamente.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
                <button 
                  onClick={() => { setImportType('banco'); setStep('select'); }}
                  className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="p-4 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
                    <Users className="h-10 w-10 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <span className="block font-black text-slate-800 text-lg">Banco de Talentos</span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cadastro Reserva</span>
                  </div>
                </button>

                <button 
                  onClick={() => { setImportType('vagas'); setStep('select'); }}
                  className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group"
                >
                  <div className="p-4 bg-indigo-50 rounded-2xl group-hover:bg-indigo-100 transition-colors">
                    <Briefcase className="h-10 w-10 text-indigo-600" />
                  </div>
                  <div className="text-center">
                    <span className="block font-black text-slate-800 text-lg">Vagas</span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Gestão de Vagas</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'select' && (
            <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400/50 transition-all cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xlsm" onChange={handleFileSelect} />
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                <Upload className="h-10 w-10 text-blue-600" />
              </div>
              <div className="text-center mt-6">
                <p className="font-black text-xl text-slate-800">Selecione o arquivo Excel</p>
                <p className="text-sm text-slate-500 font-medium mt-1">Arquivos .xlsx ou .xlsm</p>
              </div>
              
              <div className="mt-8 flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-full">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo Selecionado:</span>
                <Badge className={cn("font-black", importType === 'vagas' ? "bg-indigo-600" : "bg-blue-600")}>
                  {importType === 'vagas' ? 'Vagas' : 'Banco de Talentos'}
                </Badge>
                <Button variant="ghost" className="h-6 w-6 p-0 rounded-full hover:bg-slate-200" onClick={(e) => { e.stopPropagation(); setStep('type-selection'); }}>
                  <X className="h-3 w-3" />
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
                    if (!workbook) return;
                    try {
                      applyAutomaticConfiguration(workbook, val, importType);
                    } catch (err: any) {
                      toast.error(err.message || 'Não foi possível reler a aba selecionada.');
                    }
                  }}>
                    <SelectTrigger className="h-11 rounded-xl font-bold bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Configuração de Cabeçalho</label>
                  <div className="h-11 bg-slate-100 border border-slate-200 rounded-xl flex items-center px-4 font-bold text-slate-600 text-sm">
                    {importType === 'vagas' ? 'Busca automática de colunas' : 'Padrão BANCO_GERAL (Linha 1)'}
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
                      {mappings.length} colunas mapeadas
                    </Badge>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {requiredFields.map(field => {
                        const mapping = mappings.find(item => normalizeImportSystemKey(item.system) === field.key);
                        
                        return (
                          <div key={field.key} className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{field.label} *</label>
                              {!mapping && <span className="text-[10px] font-bold text-red-500">Obrigatório</span>}
                            </div>
                            <Select 
                              value={mapping?.excel || 'none'} 
                              onValueChange={(val) => handleManualMapping(field.key, val)}
                            >
                              <SelectTrigger className={cn(
                                "h-10 rounded-xl font-bold bg-white",
                                !mapping ? "border-red-200 shadow-sm shadow-red-50" : "border-slate-200"
                              )}>
                                <SelectValue placeholder="Selecione a coluna..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- Não Mapeado --</SelectItem>
                                {currentHeaders.map((h, i) => (
                                  <SelectItem key={`${h}-${i}`} value={h}>{h || `Coluna ${i+1}`}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>

                    {importType === 'vagas' && (
                      <div className="pt-4 border-t">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Campos Opcionais (Acompanhamento)</label>
                        <div className="grid md:grid-cols-3 gap-3">
                          {VAGA_OPTIONAL_COLUMNS.map(field => {
                            const mapping = mappings.find(item => normalizeImportSystemKey(item.system) === field.key);
                            return (
                              <div key={field.key} className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">{field.label}</label>
                                <Select 
                                  value={mapping?.excel || 'none'} 
                                  onValueChange={(val) => handleManualMapping(field.key, val)}
                                >
                                  <SelectTrigger className="h-8 rounded-lg font-bold bg-white text-xs border-slate-200">
                                    <SelectValue placeholder="Opcional..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-- Ignorar --</SelectItem>
                                    {currentHeaders.map((h, i) => (
                                      <SelectItem key={`${h}-${i}`} value={h}>{h || `Coluna ${i+1}`}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {importType === 'banco' && (
                <Card className="border-slate-100 shadow-sm overflow-hidden bg-slate-50/30">
                  <CardContent className="p-4 space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo do banco</label>
                        <Select value={importOptions.bancoTipo || 'geral'} onValueChange={(value) => setImportOptions(prev => ({
                          ...prev,
                          bancoTipo: value as ImportExecutionOptions['bancoTipo'],
                        }))}>
                          <SelectTrigger className="h-10 rounded-xl font-bold bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="geral">Banco geral</SelectItem>
                            <SelectItem value="por_unidades">Usar unidades da planilha</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Escopo</label>
                        <Select
                          value={importOptions.bancoTipo === 'geral' ? (importOptions.bancoEscopo || 'goias') : 'unidades_planilha'}
                          onValueChange={(value) => {
                            if (value === 'unidades_planilha') return;
                            setImportOptions(prev => ({ ...prev, bancoEscopo: value as ImportExecutionOptions['bancoEscopo'] }));
                          }}
                          disabled={importOptions.bancoTipo !== 'geral'}
                        >
                          <SelectTrigger className="h-10 rounded-xl font-bold bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="goias">Goiás</SelectItem>
                            <SelectItem value="espirito_santo">Espírito Santo</SelectItem>
                            <SelectItem value="demais_unidades">Demais unidades</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tratamento</label>
                        <Select value={importOptions.bancoModo || 'substituir'} onValueChange={(value) => setImportOptions(prev => ({
                          ...prev,
                          bancoModo: value as ImportExecutionOptions['bancoModo'],
                        }))}>
                          <SelectTrigger className="h-10 rounded-xl font-bold bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="substituir">Substituir dados do escopo</SelectItem>
                            <SelectItem value="adicionar">Somar aos dados existentes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center h-80 space-y-8 animate-in zoom-in-95 duration-500">
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirmados no banco</span>
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
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-slate-50/50 gap-2">
          {step === 'type-selection' && (
            <Button variant="ghost" className="h-11 px-6 rounded-xl font-bold" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}

          {step === 'select' && (
            <Button variant="outline" className="h-11 px-6 rounded-xl font-bold" onClick={() => setStep('type-selection')}>
              Voltar
            </Button>
          )}
          
          {step === 'mapping' && (
            <>
              <Button variant="outline" className="h-11 px-6 rounded-xl font-bold" onClick={() => setStep('select')}>
                Voltar
              </Button>
              <Button
                className="h-11 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 gap-2"
                onClick={handleStartImport}
                disabled={missingRequiredFields.length > 0}
              >
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
