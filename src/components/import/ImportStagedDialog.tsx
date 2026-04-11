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
      setImportType(initialType || 'vagas');
      setHeaderRow(getDefaultHeaderRow(initialType || 'vagas'));
    }
  }, [open, initialType]);

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
    const defaultHeaderIndex = getDefaultHeaderRow(nextType);
    const nextSampleData = workbookData.Sheets[sheetName]
      ? XLSX.utils.sheet_to_json<any[]>(workbookData.Sheets[sheetName], { header: 1 }).slice(0, 20)
      : [];

    setHeaderRow(defaultHeaderIndex);
    setSampleData(nextSampleData);

    const headers = (nextSampleData[defaultHeaderIndex] || [])
      .map((cell: any) => String(cell || '').trim())
      .filter((value: string) => value !== '');

    if (headers.length === 0) {
      throw new Error(`Não foi possível identificar o cabeçalho na linha ${defaultHeaderIndex + 1} da aba "${sheetName}".`);
    }

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
      const { nextMappings, missingFields } = applyAutomaticConfiguration(workbook, defaultSheet, importType);

      setStep('mapping');
      if (missingFields.length > 0) {
        toast.error(`Não foi possível reconhecer automaticamente: ${missingFields.map(field => field.label).join(', ')}`);
      } else {
        toast.success(`Leitura automática concluída: ${nextMappings.length} colunas identificadas.`);
      }
    } catch (err: any) {
      toast.error(`Falha na leitura do arquivo: ${err.message || 'Erro desconhecido'}`);
      console.error("Erro na leitura da estrutura:", err);
    }
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
                    if (!workbook) return;

                    try {
                      applyAutomaticConfiguration(workbook, val, importType);
                    } catch (err: any) {
                      toast.error(err.message || 'Não foi possível reler a aba selecionada.');
                    }
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cabeçalho Pré-definido</label>
                  <div className="h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-700">
                    {importType === 'vagas' ? 'Linha 2 fixa para vagas' : 'Linha 1 fixa para banco'}
                  </div>
                </div>
              </div>

              <Card className="border-slate-100 shadow-sm overflow-hidden bg-slate-50/30">
                <CardContent className="p-0">
                  <div className="p-4 bg-slate-50/80 border-b flex items-center justify-between">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-blue-600" />
                      Reconhecimento Automático
                    </h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                      {allFields.filter(field => mappings.some(mapping => normalizeImportSystemKey(mapping.system) === field.key)).length} colunas reconhecidas
                    </Badge>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className={cn(
                      'rounded-xl border p-4',
                      missingRequiredFields.length === 0 ? 'border-emerald-100 bg-emerald-50/70' : 'border-red-100 bg-red-50/70'
                    )}>
                      <p className={cn(
                        'text-sm font-bold',
                        missingRequiredFields.length === 0 ? 'text-emerald-700' : 'text-red-600'
                      )}>
                        {missingRequiredFields.length === 0
                          ? 'Tudo certo: as colunas obrigatórias foram reconhecidas automaticamente.'
                          : `Faltou reconhecer automaticamente: ${autoMappingErrors.join(', ')}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Não é necessário mapear manualmente. O sistema usa o padrão fixo da planilha e reconhece os cabeçalhos automaticamente.
                      </p>
                      {importType === 'banco' && (
                        <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-blue-50/50 border border-blue-100 rounded-lg">
                          <Info className="h-3 w-3 text-blue-500" />
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                            Revalidação ativa: Coluna L (12ª) verificada para Prorrogação ("Sim")
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      {requiredFields.map(field => {
                        const mapping = mappings.find(item => normalizeImportSystemKey(item.system) === field.key);

                        return (
                          <div key={field.key} className={cn(
                            'rounded-xl border p-3 flex items-center justify-between gap-3',
                            mapping ? 'border-emerald-100 bg-white' : 'border-red-100 bg-white'
                          )}>
                            <div>
                              <p className="font-bold text-slate-700 text-sm">{field.label}</p>
                              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Obrigatório</p>
                            </div>
                            {mapping ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-bold max-w-[220px] truncate">
                                {mapping.excel}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 font-bold">Não encontrado</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {importType === 'banco' && recognizedOptionalFields.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Campos opcionais reconhecidos</p>
                        <div className="flex flex-wrap gap-2">
                          {recognizedOptionalFields.map(field => {
                            const mapping = mappings.find(item => normalizeImportSystemKey(item.system) === field.key);
                            return (
                              <Badge key={field.key} variant="outline" className="bg-white text-slate-600 border-slate-200 font-bold">
                                {field.label}: {mapping?.excel}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {currentHeaders.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cabeçalhos lidos</p>
                        <div className="flex flex-wrap gap-2">
                          {currentHeaders.filter(Boolean).map(header => (
                            <Badge key={header} variant="outline" className="bg-white text-slate-500 border-slate-200 font-medium">
                              {header}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {importType === 'banco' && (
                <Card className="border-slate-100 shadow-sm overflow-hidden bg-slate-50/30">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-700">Escopo do banco importado</h3>
                      <p className="text-xs text-slate-500 mt-1">Defina a observação do banco e como tratar os dados existentes.</p>
                    </div>

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

                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">Observação que será salva</p>
                      <p className="text-sm font-bold text-slate-700 mt-2">{buildBancoImportObservation(importOptions)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
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
