import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, FileSpreadsheet, CheckCircle2, ArrowRight, 
  Database, Layers, Check, X, Info, AlertCircle, FileText, Search, List
} from 'lucide-react';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { DatabaseService } from '@/services/databaseService';
import { Vaga, StatusVaga, TipoVaga, BancoTalentos } from '@/types/vaga';
import { getResponsavelPorUnidade } from '@/data/equipe';
import { toast } from 'sonner';
import { normalizeStatus, getValidVacancyBase } from '@/lib/vagaUtils';
import { convertDateValue } from '@/lib/dateImportUtils';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

type Step = 'select' | 'analysis' | 'validation' | 'processing' | 'summary';

const VAGA_SHEETS = [
  'VAGAS - BASE GERAL',
  'VAGAS (PROPOSTA)',
  'VAGAS',
  'BASE GERAL',
  'Planilha1',
  'Sheet1'
];

const VAGA_REQUIRED_COLUMNS = [
  'ABERTURA',
  'RECEBIMENTO',
  'UNIDADE',
  'REQUISIÇÃO',
  'CARGO',
  'TIPO',
  'VAGAS',
  'STATUS'
];

const BANCO_REQUIRED_COLUMNS = [
  'CARGO',
  'UNIDADE',
  'STATUS',
  'EDITAL'
];

interface ImportExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reprocessFile?: any; 
}

export function ImportExcelDialog({ 
  open, 
  onOpenChange,
  reprocessFile 
}: ImportExcelDialogProps) {
  const { addVagas, addBancos, addImportHistory, clearBancosPorRegiao, setVagas, clearBancos, fetchImportHistory } = useVagasStore();
  const { currentUser } = useAdminStore();
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestedType, setSuggestedType] = useState<'vagas' | 'banco' | null>(null);
  const [chosenType, setChosenType] = useState<'vagas' | 'banco' | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<'GO_ES' | 'OUTRAS_UNIDADES' | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [confidence, setConfidence] = useState<'high' | 'low'>('low');
  const [fileMetadata, setFileMetadata] = useState<{
    name: string;
    sheets: string[];
    headers: string[];
    rowCount: number;
    targetSheet: string;
    headerRow: number;
  } | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    missingColumns: string[];
    foundColumns: string[];
    sheetUsed: string;
    headerRowUsed: number;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open && reprocessFile && !file) {
      setFile(reprocessFile);
      analyzeFile(reprocessFile);
    }
  }, [open, reprocessFile]);

  React.useEffect(() => {
    if (file && chosenType === 'banco') {
      const name = file.name.toUpperCase();
      if (name.includes('GO') || name.includes('ES')) {
        setSelectedRegion('GO_ES');
      } else if (name.includes('OUTRAS') || name.includes('BASE') || name.includes('GERAL')) {
        setSelectedRegion('OUTRAS_UNIDADES');
      }
    }
  }, [file, chosenType]);

  const reset = () => {
    setStep('select');
    setFile(null);
    setSummary(null);
    setError(null);
    setIsProcessing(false);
    setSuggestedType(null);
    setChosenType(null);
    setWorkbook(null);
    setConfidence('low');
    setFileMetadata(null);
    setValidationResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      analyzeFile(selectedFile);
    }
  };

  const analyzeFile = async (selectedFile: File) => {
    setIsProcessing(true);
    setStep('processing');
    setProgress(10);
    setProgressLabel("Lendo arquivo...");

    const reader = new FileReader();
    reader.onload = (evt) => {
      // Pequeno timeout para garantir que o UI renderize o estado de processamento
      setTimeout(() => {
        try {
          const data = evt.target?.result;
          const wb = XLSX.read(data, { type: 'array', cellDates: true, cellNF: false, cellText: false });
          setWorkbook(wb);
          setProgress(50);
          setProgressLabel("Analisando abas e colunas...");

          const sheetNames = wb.SheetNames;
          let targetSheet = sheetNames[0];
          let headers: string[] = [];
          let rowCount = 0;
          let headerRow = 0;

          const bancoGeralSheet = sheetNames.find(name => name.toUpperCase() === 'BANCO GERAL');
          const vagaSheetName = sheetNames.find(name => 
            VAGA_SHEETS.includes(name.toUpperCase()) || 
            name.toUpperCase().includes('VAGA') || 
            name.toUpperCase().includes('BASE GERAL')
          );

          if (bancoGeralSheet) {
            targetSheet = bancoGeralSheet;
            const sheet = wb.Sheets[bancoGeralSheet];
            const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
            headerRow = 0;
            const headerData = rawRows[headerRow];
            if (headerData) {
              headers = headerData.map(c => String(c || '').toUpperCase().trim());
            }
            rowCount = Math.max(0, rawRows.length - (headerRow + 1));
          } else if (vagaSheetName) {
            targetSheet = vagaSheetName;
            const sheet = wb.Sheets[vagaSheetName];
            const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
            headerRow = 1;
            const headerData = rawRows[headerRow];
            if (headerData) {
              headers = headerData.map(c => String(c || '').toUpperCase().trim());
            }
            rowCount = Math.max(0, rawRows.length - (headerRow + 1));
          } else {
            const sheet = wb.Sheets[targetSheet];
            const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
            headerRow = 0;
            const headerData = rawRows[headerRow];
            if (headerData) {
              headers = headerData.map(c => String(c || '').toUpperCase().trim());
            }
            rowCount = Math.max(0, rawRows.length - (headerRow + 1));
          }

          let type: 'vagas' | 'banco' | null = null;
          let conf: 'high' | 'low' = 'low';

          const hasVagaHeaders = VAGA_REQUIRED_COLUMNS.every(col => headers.includes(col));
          const hasSomeVagaHeaders = VAGA_REQUIRED_COLUMNS.filter(col => headers.includes(col)).length >= 4;
          const hasBancoHeaders = BANCO_REQUIRED_COLUMNS.every(col => headers.includes(col));

          if (hasVagaHeaders) {
            type = 'vagas';
            conf = 'high';
          } else if (hasBancoHeaders) {
            type = 'banco';
            conf = 'high';
          } else if (hasSomeVagaHeaders || targetSheet.toUpperCase().includes('VAGA')) {
            type = 'vagas';
            conf = 'low';
          } else if (targetSheet.toUpperCase().includes('BANCO')) {
            type = 'banco';
            conf = 'low';
          }

          setFileMetadata({
            name: selectedFile.name,
            sheets: sheetNames,
            headers,
            rowCount,
            targetSheet,
            headerRow
          });

          setSuggestedType(type);
          setConfidence(conf);
          setProgress(100);
          setStep('analysis');
        } catch (error) {
          console.error(error);
          toast.error("Erro ao analisar o arquivo.");
          reset();
        } finally {
          setIsProcessing(false);
          setProgress(0);
        }
      }, 100);
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const validateStructure = (type: 'vagas' | 'banco') => {
    if (!workbook || !fileMetadata) return;
    
    setChosenType(type);
    setIsProcessing(true);
    
    setTimeout(() => {
      try {
        const wb = workbook;
        let targetSheetName = fileMetadata.targetSheet;
        let headerRow = type === 'vagas' ? 1 : 0;
        
        // Se for Banco, priorizar BANCO GERAL
        if (type === 'banco') {
          const exactMatch = wb.SheetNames.find(n => n.toUpperCase() === 'BANCO GERAL');
          if (exactMatch) {
            targetSheetName = exactMatch;
            headerRow = 0; // Garantir linha 1 (index 0) para Banco Geral
          } else {
            const bancoSheetName = wb.SheetNames.find(n => n.toUpperCase().includes('BANCO'));
            if (bancoSheetName) targetSheetName = bancoSheetName;
          }
        }

        const sheet = wb.Sheets[targetSheetName];
        if (!sheet) {
          setValidationResult({
            valid: false,
            errors: [`Aba "${targetSheetName}" não encontrada no arquivo.`],
            missingColumns: [],
            foundColumns: [],
            sheetUsed: targetSheetName,
            headerRowUsed: headerRow
          });
          setStep('validation');
          setIsProcessing(false);
          return;
        }

        const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        const headers = (rawRows[headerRow] || []).map(c => String(c || '').toUpperCase().trim());
        
        const required = type === 'vagas' ? VAGA_REQUIRED_COLUMNS : BANCO_REQUIRED_COLUMNS;
        const missing = required.filter(col => !headers.includes(col));
        
        if (missing.length === 0) {
          setValidationResult({
            valid: true,
            errors: [],
            missingColumns: [],
            foundColumns: headers,
            sheetUsed: targetSheetName,
            headerRowUsed: headerRow
          });
        } else {
          setValidationResult({
            valid: false,
            errors: [`A estrutura do arquivo não corresponde ao tipo ${type === 'vagas' ? 'Vagas' : 'Banco'}.`],
            missingColumns: missing,
            foundColumns: headers,
            sheetUsed: targetSheetName,
            headerRowUsed: headerRow
          });
        }
        
        setStep('validation');
      } catch (error) {
        console.error(error);
        toast.error("Erro ao validar estrutura.");
      } finally {
        setIsProcessing(false);
      }
    }, 500);
  };

  const processImport = async () => {
    if (!workbook || !file || !chosenType || !validationResult) return;

    setIsProcessing(true);
    setStep('processing');
    setProgress(0);
    setProgressLabel("Preparando dados para importação robusta...");

    try {
      const wb = workbook;
      const selectedFile = file;
      const now = new Date().toISOString();
      const batchId = `IMPORT-${Date.now()}`;
      const { sheetUsed, headerRowUsed } = validationResult;
      const sheet = wb.Sheets[sheetUsed];
      
      // Use raw: true but keep cell formatting if possible
      const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });
      const totalToProcess = rawRows.length - (headerRowUsed + 1);
      
      if (totalToProcess <= 0) {
        throw new Error("Nenhum dado encontrado na aba selecionada.");
      }

      const headers = (rawRows[headerRowUsed] || []).map(c => String(c || '').toUpperCase().trim());
      const processedItems: any[] = [];

      setProgressLabel(`Mapeando ${totalToProcess} registros...`);

      if (chosenType === 'vagas') {
        const mapping = {
          abertura: headers.indexOf('ABERTURA'),
          recebimento: headers.indexOf('RECEBIMENTO'),
          unidade: headers.indexOf('UNIDADE'),
          requisicao: headers.indexOf('REQUISIÇÃO'),
          cargo: headers.indexOf('CARGO'),
          tipo: headers.indexOf('TIPO'),
          vagas: headers.indexOf('VAGAS'),
          status: headers.indexOf('STATUS'),
          dataConv: headers.indexOf('DATA CONVOCAÇÃO'),
          horaConv: headers.indexOf('HORÁRIO CONVOCAÇÃO'),
          candidato: headers.indexOf('CANDIDATO CONVOCADO CONVOCAÇÃO'),
          classificacao: headers.indexOf('CLASSIFICAÇÃO CONVOCAÇÃO'),
          forma: headers.indexOf('FORMA CONVOCAÇÃO'),
          oitiva: headers.indexOf('STATUS OITIVA CONVOCAÇÃO'),
          secao: headers.indexOf('SEÇÃO'),
          admEnviada: headers.indexOf('ADMISSÃO ENVIADA - ACOMPANHAMENTO'),
          admEfetivada: headers.indexOf('ADMISSÃO EFETIVADA - ACOMPANHAMENTO'),
          detalhes: headers.indexOf('DETALHES - ACOMPANHAMENTO'),
          obs: headers.indexOf('OBSERVAÇÃO - ACOMPANHAMENTO'),
        };

        for (let i = headerRowUsed + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || (Array.isArray(row) && row.length === 0)) continue;
          
          const cargo = mapping.cargo !== -1 ? String(row[mapping.cargo] || '').trim() : '';
          if (!cargo) continue;

          const unitInRow = mapping.unidade !== -1 ? String(row[mapping.unidade] || '').trim() : 'NÃO INFORMADA';
          const requisicao = mapping.requisicao !== -1 ? String(row[mapping.requisicao] || '') : '';
          const rawTipo = mapping.tipo !== -1 ? String(row[mapping.tipo] || '').toLowerCase() : '';
          const numVagas = mapping.vagas !== -1 ? (Number(row[mapping.vagas]) || 1) : 1;
          const statusRaw = mapping.status !== -1 ? String(row[mapping.status] || '') : '';
          
          const dataAbertura = mapping.abertura !== -1 && row[mapping.abertura] ? convertDateValue(row[mapping.abertura], 'auto').formatted : '';
          const dataRecebimento = mapping.recebimento !== -1 && row[mapping.recebimento] ? convertDateValue(row[mapping.recebimento], 'auto').formatted : '';
          
          const dataConv = mapping.dataConv !== -1 && row[mapping.dataConv] ? convertDateValue(row[mapping.dataConv], 'auto').formatted : '';
          const horaConv = mapping.horaConv !== -1 ? String(row[mapping.horaConv] || '') : '';
          const candConv = mapping.candidato !== -1 ? String(row[mapping.candidato] || '') : '';
          const classConv = mapping.classificacao !== -1 ? String(row[mapping.classificacao] || '') : '';
          const formaConv = mapping.forma !== -1 ? String(row[mapping.forma] || '') : '';
          const oitivaConv = mapping.oitiva !== -1 ? String(row[mapping.oitiva] || '') : '';
          const secao = mapping.secao !== -1 ? String(row[mapping.secao] || '') : '';
          
          const admEnviada = mapping.admEnviada !== -1 ? String(row[mapping.admEnviada] || '') : '';
          const admEfetivada = mapping.admEfetivada !== -1 ? String(row[mapping.admEfetivada] || '') : '';
          const detalhesAcomp = mapping.detalhes !== -1 ? String(row[mapping.detalhes] || '') : '';
          const obsAcomp = mapping.obs !== -1 ? String(row[mapping.obs] || '') : '';

          let tipoVaga: TipoVaga = 'substituicao';
          if (rawTipo.includes('aumento')) tipoVaga = 'aumento';
          else if (rawTipo.includes('lideranca')) tipoVaga = 'lideranca';
          else if (rawTipo.includes('movimentacao')) tipoVaga = 'movimentacao_interna';
          else if (rawTipo.includes('quadro')) tipoVaga = 'quadro';
          else if (rawTipo.includes('banco')) tipoVaga = 'banco_talentos';
          else if (rawTipo.includes('edital')) tipoVaga = 'edital';

          const statusNormalized = normalizeStatus(statusRaw);
          const { analista: defaultAnalista, assistentes } = getResponsavelPorUnidade(unitInRow, tipoVaga);

          processedItems.push({
            unidade: unitInRow,
            cargo,
            requisicao,
            numero_requisicao: requisicao,
            data_abertura: dataAbertura,
            data_recebimento: dataRecebimento,
            data_criacao: now,
            numero_vagas: numVagas,
            quantidade: numVagas,
            secao,
            tipo_vaga: tipoVaga,
            status: statusNormalized,
            status_geral: statusNormalized,
            analista_responsavel: defaultAnalista,
            assistentes: assistentes,
            observacoes_internas: obsAcomp,
            origem: 'importada',
            origem_importacao: selectedFile.name,
            data_importacao: now,
            lote_importacao: batchId,
            import_batch_id: batchId,
            source_sheet: sheetUsed,
            source_row_index: i + 1,
            tem_banco_valido: false,
            data_convocacao_planilha: dataConv,
            horario_convocacao_planilha: horaConv,
            candidato_convocado_planilha: candConv,
            classificacao_convocacao_planilha: classConv,
            forma_convocacao_planilha: formaConv,
            status_oitiva_convocacao_planilha: oitivaConv,
            admissao_enviada_acompanhamento: admEnviada,
            admissao_efetivada_acompanhamento: admEfetivada,
            detalhes_acompanhamento: detalhesAcomp,
            historico: []
          });

          if (i % 500 === 0) {
            setProgress(Math.round((i / rawRows.length) * 15));
            // Tiny delay to keep UI alive during processing
            await new Promise(r => setTimeout(r, 0));
          }
        }
      } else if (chosenType === 'banco') {
        const mapping = {
          cargo: headers.indexOf('CARGO'),
          unidade: headers.indexOf('UNIDADE'),
          status: headers.indexOf('STATUS'),
          edital: headers.indexOf('EDITAL'),
          processoSeletivo: headers.indexOf('PROCESSO SELETIVO'),
          validade: headers.indexOf('VALIDADE'),
          prorrogacao: headers.indexOf('PRORROGAÇÃO'),
          nome: headers.indexOf('NOME'),
          classificacao: headers.indexOf('CLASSIFICAÇÃO'),
          quantidadeBanco: headers.findIndex(h => 
            h === 'QUANTIDADE DE BANCO' || h === 'QNTD BANCO' || h === 'QTD BANCO' || 
            h === 'QUANTIDADE BANCO' || h === 'QTD. BANCO'
          ),
          chamada: headers.indexOf('NÚMERO DE CHAMADA'),
          vagasAproveitamento: headers.indexOf('NÚMERO DE VAGAS DE APROVEITAMENTO'),
          dataConvocacao: headers.indexOf('DATA DE CONVOCAÇÃO'),
          unidadeConvocacao: headers.indexOf('UNIDADE DE CONVOCAÇÃO'),
        };

        for (let i = headerRowUsed + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || (Array.isArray(row) && row.length === 0)) continue;
          
          const cargo = mapping.cargo !== -1 ? String(row[mapping.cargo] || '').trim() : '';
          if (!cargo) continue;

          const statusRaw = mapping.status !== -1 ? String(row[mapping.status] || '').toUpperCase().trim() : '';
          let status: any = 'nenhum';
          if (statusRaw.includes('RESERVA')) status = 'CADASTRO RESERVA';
          else if (statusRaw.includes('CONVOC')) status = 'CONVOCADO';
          else if (statusRaw.includes('VENCID')) status = 'VENCIDO';

          const prorrogacaoRaw = mapping.prorrogacao !== -1 ? String(row[mapping.prorrogacao] || '').toUpperCase().trim() : '';
          const isProrrogado = prorrogacaoRaw === 'SIM';
          const validadeOriginal = mapping.validade !== -1 && row[mapping.validade] 
            ? convertDateValue(row[mapping.validade], 'auto').formatted 
            : '';
          
          let novaDataValidade = '';
          if (validadeOriginal && isProrrogado) {
            const date = new Date(validadeOriginal);
            if (!isNaN(date.getTime())) {
              date.setMonth(date.getMonth() + 6);
              novaDataValidade = date.toISOString().split('T')[0];
            }
          }

          processedItems.push({
            cargo,
            unidade: mapping.unidade !== -1 ? String(row[mapping.unidade] || '').trim() : '',
            status,
            numero_edital: mapping.edital !== -1 ? String(row[mapping.edital] || '').trim() : '',
            numero_processo_seletivo: mapping.processoSeletivo !== -1 ? String(row[mapping.processoSeletivo] || '').trim() : '',
            data_abertura_edital: now.split('T')[0],
            data_validade: validadeOriginal,
            is_prorrogado: isProrrogado,
            nova_data_validade: novaDataValidade,
            nome: mapping.nome !== -1 ? String(row[mapping.nome] || '').trim() : '',
            classificacao: mapping.classificacao !== -1 ? row[mapping.classificacao] : '',
            quantidade_banco: mapping.quantidadeBanco !== -1 ? row[mapping.quantidadeBanco] : '',
            numero_chamada: mapping.chamada !== -1 ? String(row[mapping.chamada] || '') : '',
            numero_vaga_aproveitamento: mapping.vagasAproveitamento !== -1 ? String(row[mapping.vagasAproveitamento] || '') : '',
            data_convocacao: mapping.dataConvocacao !== -1 && row[mapping.dataConvocacao] ? convertDateValue(row[mapping.dataConvocacao], 'auto').formatted : '',
            unidade_convocacao: mapping.unidadeConvocacao !== -1 ? String(row[mapping.unidadeConvocacao] || '').trim() : '',
            observacoes: '',
            status_import: statusRaw,
            import_batch_id: batchId,
            data_importacao: now,
            origem_importacao: selectedFile.name,
            regiao: selectedRegion || undefined
          });

          if (i % 500 === 0) {
            setProgress(Math.round((i / rawRows.length) * 15));
            await new Promise(r => setTimeout(r, 0));
          }
        }
      }

      // Step 2: Push to Supabase in chunks
      const result = await DatabaseService.importBySubstitution(
        chosenType,
        processedItems,
        currentUser?.id || 'import-user',
        (prog, label) => {
          setProgress(prog);
          setProgressLabel(label);
        }
      );

      if (result.error) throw result.error;

      // Update local state - only update with a subset for local use if needed
      // Actually, since we removed persistence, we should probably fetch from DB 
      // but for immediate feedback we can update the store with a limited view
      if (chosenType === 'vagas') {
        setVagas(processedItems.slice(0, 3000) as Vaga[]);
      } else {
        if (selectedRegion) clearBancosPorRegiao(selectedRegion);
        addBancos(processedItems.slice(0, 3000) as BancoTalentos[]);
      }

      addImportHistory({
        id: batchId,
        usuario: currentUser?.nome_completo || 'Sistema',
        total_lidos: rawRows.length - (headerRowUsed + 1),
        total_novos: result.count,
        total_atualizados: 0,
        total_ignorados: (rawRows.length - (headerRowUsed + 1)) - result.count,
        total_erros: 0,
        status: 'concluido',
        tipo_importacao: chosenType,
        arquivo: selectedFile.name,
        data_hora: now,
        aba_utilizada: sheetUsed,
        linha_cabecalho: headerRowUsed + 1
      } as any);

      setSummary({
        type: chosenType,
        total: result.count,
        totalFound: rawRows.length - (headerRowUsed + 1),
        fileName: selectedFile.name,
        sheetName: sheetUsed,
        manualType: chosenType,
        suggestedType: suggestedType,
        region: selectedRegion
      });

      toast.success(`Importação concluída com sucesso! ${result.count} registros inseridos.`);
      fetchImportHistory(); // Sync background history
      setStep('summary');

    } catch (err: any) {
      console.error(err);
      const friendlyMsg = err.message || "Erro técnico ao processar a importação.";
      setError(friendlyMsg);
      toast.error(`Falha na importação: ${friendlyMsg}`);
      // Do not reset() here to allow user to see what happened and maybe retry if we implement it.
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importação Confiável de Dados
          </DialogTitle>
          <DialogDescription>
            Fluxo de validação estrutural para evitar detecção errada de tipo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 'select' && (
            <div 
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Selecione o arquivo Excel</h3>
              <p className="text-sm text-gray-500 mb-6">Arraste ou clique para selecionar (.xlsx, .xlsm, .xls)</p>
              <Button variant="outline">Escolher Arquivo</Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xlsm, .xls"
                onChange={handleFileChange}
              />
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              {!error ? (
                <>
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                    {progress > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">
                        {progress}%
                      </div>
                    )}
                  </div>
                  <div className="w-full max-w-xs space-y-2 text-center">
                    <p className="text-sm font-medium text-gray-700">{progressLabel || "Processando e analisando o arquivo..."}</p>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-gray-500 italic">
                      Isso pode levar alguns instantes para arquivos grandes.
                    </p>
                  </div>
                </>
              ) : (
                <div className="w-full max-w-md bg-red-50 border border-red-200 rounded-xl p-8 text-center animate-in fade-in zoom-in duration-300">
                  <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-red-900 mb-2">Ops! Algo deu errado</h3>
                  <p className="text-sm text-red-700 mb-6">{error}</p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={reset}>Tentar com outro arquivo</Button>
                    <Button variant="destructive" onClick={() => { setError(null); processImport(); }}>Tentar novamente</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'analysis' && fileMetadata && (
            <div className="space-y-6">
              <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900">{fileMetadata.name}</h3>
                      <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm text-blue-800">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 opacity-70" />
                          <span>{fileMetadata.sheets.length} abas encontradas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4 opacity-70" />
                          <span>{fileMetadata.rowCount} linhas detectadas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 opacity-70" />
                          <span>Aba principal: {fileMetadata.targetSheet}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Sugestão de Tipo
                </h4>
                <div className="flex items-center gap-3">
                  {suggestedType ? (
                    <>
                      <Badge variant={confidence === 'high' ? 'default' : 'secondary'} className="text-sm py-1 px-3">
                        {suggestedType === 'vagas' ? 'Vagas' : 'Banco de Talentos'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Confiança: {confidence === 'high' ? 'Alta' : 'Baixa'} (baseada na estrutura)
                      </span>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">Tipo não identificado</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-base font-semibold text-gray-900">Confirme o tipo do arquivo:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
                    onClick={() => validateStructure('vagas')}
                  >
                    <Layers className="h-6 w-6" />
                    <span>Vagas</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
                    onClick={() => validateStructure('banco')}
                  >
                    <Database className="h-6 w-6" />
                    <span>Banco de Talentos</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 'validation' && validationResult && (
            <div className="space-y-6">
              <div className={`p-4 rounded-lg border flex items-start gap-4 ${validationResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {validationResult.valid ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 mt-1" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600 mt-1" />
                )}
                <div>
                  <h3 className={`font-semibold ${validationResult.valid ? 'text-green-900' : 'text-red-900'}`}>
                    {validationResult.valid ? 'Estrutura Validada!' : 'Estrutura Inválida'}
                  </h3>
                  <p className={`text-sm ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                    {validationResult.valid 
                      ? `O arquivo de ${chosenType === 'vagas' ? 'Vagas' : 'Banco'} possui todas as colunas obrigatórias.`
                      : validationResult.errors[0]}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Aba lida:</span>
                    <span className="font-medium">{validationResult.sheetUsed}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Linha de cabeçalho:</span>
                    <span className="font-medium">{validationResult.headerRowUsed + 1}</span>
                  </div>
                </div>

                {validationResult.missingColumns.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-red-700">Colunas obrigatórias ausentes:</span>
                    <div className="flex flex-wrap gap-2">
                      {validationResult.missingColumns.map(col => (
                        <Badge key={col} variant="destructive" className="font-mono text-xs">{col}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Colunas encontradas:</span>
                  <ScrollArea className="h-32 border rounded p-2 bg-white">
                    <div className="flex flex-wrap gap-2">
                      {validationResult.foundColumns.map(col => (
                        <Badge key={col} variant="outline" className="font-mono text-xs">{col}</Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {chosenType === 'banco' && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-bold text-amber-900">Origem/Região do Banco</span>
                  </div>
                  <p className="text-xs text-amber-700">
                    Selecione a região deste arquivo. Ao importar, apenas os registros desta região serão atualizados, preservando as outras bases.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button 
                      type="button"
                      variant={selectedRegion === 'GO_ES' ? 'default' : 'outline'}
                      className={`flex-1 text-xs h-9 ${selectedRegion === 'GO_ES' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                      onClick={() => setSelectedRegion('GO_ES')}
                    >
                      GO e ES
                    </Button>
                    <Button 
                      type="button"
                      variant={selectedRegion === 'OUTRAS_UNIDADES' ? 'default' : 'outline'}
                      className={`flex-1 text-xs h-9 ${selectedRegion === 'OUTRAS_UNIDADES' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                      onClick={() => setSelectedRegion('OUTRAS_UNIDADES')}
                    >
                      Outras Unidades
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('analysis')} className="flex-1">
                  Voltar e Escolher Outro Tipo
                </Button>
                <Button 
                  className="flex-1" 
                  disabled={!validationResult.valid || (chosenType === 'banco' && !selectedRegion)}
                  onClick={processImport}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Confirmar e Importar
                </Button>
              </div>
            </div>
          )}

          {step === 'summary' && summary && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Importação Concluída</h2>
                <p className="text-gray-500">Dados processados com sucesso.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl text-center">
                  <span className="text-sm text-gray-500 block mb-1">Registros Novos</span>
                  <span className="text-2xl font-bold text-primary">{summary.total}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl text-center">
                  <span className="text-sm text-gray-500 block mb-1">Linhas Lidas</span>
                  <span className="text-2xl font-bold text-gray-700">{summary.totalFound}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl text-center">
                  <span className="text-sm text-gray-500 block mb-1">Tipo</span>
                  <span className="text-sm font-semibold text-gray-900 block mt-2">
                    {summary.type === 'vagas' ? 'Vagas' : 'Banco'}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Log da Operação:</p>
                  <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>Arquivo: {summary.fileName}</li>
                    <li>Aba processada: {summary.sheetName}</li>
                    <li>Escolha manual: {summary.manualType === 'vagas' ? 'Vagas' : 'Banco'}</li>
                    <li>Sugestão do sistema: {summary.suggestedType ? (summary.suggestedType === 'vagas' ? 'Vagas' : 'Banco') : 'Nenhuma'}</li>
                    {summary.region && <li>Região: {summary.region === 'GO_ES' ? 'GO e ES' : 'Outras Unidades'}</li>}
                  </ul>
                </div>
              </div>

              <Button className="w-full h-12 text-lg" onClick={() => onOpenChange(false)}>
                Fechar e Ver Dashboard
              </Button>
            </div>
          )}
        </div>

        {step !== 'processing' && step !== 'summary' && step !== 'validation' && (
          <DialogFooter className="border-t pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
