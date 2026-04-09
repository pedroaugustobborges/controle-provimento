import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, FileSpreadsheet, CheckCircle2, ArrowRight, 
  Database, Layers, Check, X, Info
} from 'lucide-react';
import { useVagasStore } from '@/store/vagasStore';
import { Vaga, StatusVaga, TipoVaga, BancoTalentos } from '@/types/vaga';
import { getResponsavelPorUnidade } from '@/data/equipe';
import { toast } from 'sonner';
import { normalizeStatus, getValidVacancyBase } from '@/lib/vagaUtils';
import { convertDateValue } from '@/lib/dateImportUtils';

type Step = 'select' | 'confirm' | 'processing' | 'summary';

const VAGA_SHEETS = [
  'VAGAS - BASE GERAL',
  'VAGAS (PROPOSTA)',
  'VAGAS',
  'BASE GERAL',
  'Planilha1',
  'Sheet1'
];

const UNIT_MAPPING: Record<string, string> = {
  // Mapeamentos de unidade conforme item 8
  'HECAD': 'HECAD',
  'CRER': 'CRER',
  'AGIR': 'AGIR',
  'HUGOL': 'HUGOL',
  'HDS': 'HDS',
  'POLICLINICA': 'POLICLÍNICA',
  'VITORIA': 'VITÓRIA',
  'JATAI': 'JATAÍ',
};

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
  const { addVagas, addBancos, addImportHistory, clearVagas, clearBancos } = useVagasStore();
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [detectedType, setDetectedType] = useState<'vagas' | 'banco' | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [confidence, setConfidence] = useState<'high' | 'low'>('low');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('select');
    setFile(null);
    setSummary(null);
    setIsProcessing(false);
    setDetectedType(null);
    setWorkbook(null);
    setConfidence('low');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      detectImportType(selectedFile);
    }
  };

  const detectImportType = async (selectedFile: File) => {
    setIsProcessing(true);
    setStep('processing');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);

        const fileName = selectedFile.name.toLowerCase();
        const sheetNames = wb.SheetNames;
        
        const hasVagaSheet = sheetNames.some(name => VAGA_SHEETS.includes(name));
        const hasBancoSheet = sheetNames.includes('BANCO GERAL');

        let type: 'vagas' | 'banco' | null = null;
        let conf: 'high' | 'low' = 'low';
        let criteria = [];

        // Detecção por Planilhas
        if (hasVagaSheet) {
          const sheet = wb.Sheets[VAGA_SHEETS.find(name => sheetNames.includes(name))!];
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z10');
          const firstRow = [];
          for (let col = range.s.c; col <= Math.min(range.e.c, 10); col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
            if (cell) firstRow.push(String(cell.v).toUpperCase());
          }
          
          const hasVagaHeaders = firstRow.includes('ABERTURA') || firstRow.includes('CARGO') || firstRow.includes('UNIDADE');
          if (hasVagaHeaders) {
            type = 'vagas';
            conf = 'high';
          } else {
            type = 'vagas';
            conf = 'low';
          }
        } else if (hasBancoSheet) {
          const sheet = wb.Sheets['BANCO GERAL'];
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z10');
          const firstRow = [];
          for (let col = range.s.c; col <= Math.min(range.e.c, 10); col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
            if (cell) firstRow.push(String(cell.v).toUpperCase());
          }
          const hasBancoHeaders = firstRow.includes('CARGO') && firstRow.includes('STATUS');
          if (hasBancoHeaders) {
            type = 'banco';
            conf = 'high';
          } else {
            type = 'banco';
            conf = 'low';
          }
        } 
        
        // Refinamento por nome de arquivo se necessário
        if (!type) {
          if (fileName.includes('vagas') || fileName.includes('proposta') || fileName.endsWith('.xlsm')) {
            type = 'vagas';
            conf = 'low';
          } else if (fileName.includes('banco') || fileName.includes('talentos') || fileName.endsWith('.xlsx')) {
            type = 'banco';
            conf = 'low';
          }
        }

        setDetectedType(type);
        setConfidence(conf);
        setStep('confirm');
      } catch (error) {
        console.error(error);
        toast.error("Erro ao ler o arquivo.");
        reset();
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const processFile = async (importType: 'vagas' | 'banco') => {
    if (!workbook || !file) return;

    setIsProcessing(true);
    setStep('processing');

    try {
      const wb = workbook;
      const selectedFile = file;
      const now = new Date().toISOString();
      const batchId = `IMPORT-${Date.now()}`;

      if (importType === 'vagas') {
        const newVagas: Vaga[] = [];
        let totalRowsFound = 0;
        let discardedCargoEmpty = 0;
        let discardedOther = 0;
        let sheetFoundName = '';

        // Try to find the best sheet
        let sheetToProcess = null;
        for (const name of VAGA_SHEETS) {
          if (wb.SheetNames.includes(name)) {
            sheetToProcess = wb.Sheets[name];
            sheetFoundName = name;
            break;
          }
        }

        // If not found in defaults, search for any sheet containing "VAGA" or "BASE GERAL" or "PROPOSTA"
        if (!sheetToProcess) {
          const fallbackName = wb.SheetNames.find(n => 
            n.toUpperCase().includes('VAGA') || 
            n.toUpperCase().includes('BASE GERAL') || 
            n.toUpperCase().includes('PROPOSTA')
          );
          if (fallbackName) {
            sheetToProcess = wb.Sheets[fallbackName];
            sheetFoundName = fallbackName;
          }
        }

        if (!sheetToProcess) {
          setSummary({
            type: 'error',
            message: 'Nenhuma aba de VAGAS compatível encontrada no arquivo.',
            fileName: selectedFile.name,
            sheetsAvailable: wb.SheetNames
          });
          setStep('summary');
          return;
        }

        const rawRows = XLSX.utils.sheet_to_json<any[]>(sheetToProcess, { header: 1 });
        
        // Find header row and mapping
        let headerRowIndex = 1; // Default fallback
        let mapping = {
          abertura: 0, recebimento: 1, unidade: 2, requisicao: 3, cargo: 4,
          tipo: 5, vagas: 6, status: 7, dataConv: 8, horaConv: 9,
          candidato: 10, classificacao: 11, forma: 12, oitiva: 13,
          secao: 14, admEnviada: 15, admEfetivada: 16, detalhes: 17, obs: 18
        };

        // Try to find real headers in first 10 rows
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          const row = rawRows[i];
          if (!row || !Array.isArray(row)) continue;
          const rowStr = row.map(c => String(c || '').toUpperCase());
          if (rowStr.includes('CARGO') && (rowStr.includes('UNIDADE') || rowStr.includes('ABERTURA'))) {
            headerRowIndex = i;
            mapping = {
              abertura: rowStr.findIndex(c => c.includes('ABERTURA')),
              recebimento: rowStr.findIndex(c => c.includes('RECEBIMENTO')),
              unidade: rowStr.findIndex(c => c.includes('UNIDADE')),
              requisicao: rowStr.findIndex(c => c.includes('REQUISIÇÃO') || c.includes('REQUISICAO') || c.includes('Nº')),
              cargo: rowStr.findIndex(c => c.includes('CARGO')),
              tipo: rowStr.findIndex(c => c.includes('TIPO')),
              vagas: rowStr.findIndex(c => c.includes('VAGAS') || c.includes('QTDE') || c.includes('QUANTIDADE')),
              status: rowStr.findIndex(c => c.includes('STATUS')),
              dataConv: rowStr.findIndex(c => c.includes('DATA CONV')),
              horaConv: rowStr.findIndex(c => c.includes('HORA CONV')),
              candidato: rowStr.findIndex(c => c.includes('CANDIDATO')),
              classificacao: rowStr.findIndex(c => c.includes('CLASSIFICAÇÃO') || c.includes('CLASSIFICACAO')),
              forma: rowStr.findIndex(c => c.includes('FORMA CONV')),
              oitiva: rowStr.findIndex(c => c.includes('OITIVA')),
              secao: rowStr.findIndex(c => c.includes('SEÇÃO') || c.includes('SECAO') || c.includes('SETOR')),
              admEnviada: rowStr.findIndex(c => c.includes('ADM ENVIADA')),
              admEfetivada: rowStr.findIndex(c => c.includes('ADM EFETIVADA')),
              detalhes: rowStr.findIndex(c => c.includes('DETALHES')),
              obs: rowStr.findIndex(c => c.includes('OBS')),
            };
            break;
          }
        }

        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || (Array.isArray(row) && row.length === 0)) continue;
          
          totalRowsFound++;

          const cargo = mapping.cargo !== -1 ? String(row[mapping.cargo] || '').trim() : '';
          if (!cargo) {
            discardedCargoEmpty++;
            continue;
          }

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

          newVagas.push({
            id: `vaga-${batchId}-${newVagas.length + 1}`,
            unidade: unitInRow,
            cargo,
            requisicao,
            numero_requisicao: requisicao,
            data_abertura: dataAbertura,
            data_recebimento: dataRecebimento,
            numero_vagas: numVagas,
            quantidade: numVagas,
            secao,
            tipo_vaga: tipoVaga,
            status: statusNormalized,
            status_geral: statusNormalized,
            analista_responsavel: defaultAnalista,
            assistentes: assistentes,
            observacoes_internas: obsAcomp,
            origem_importacao: selectedFile.name,
            data_importacao: now,
            lote_importacao: batchId,
            import_batch_id: batchId,
            source_sheet: sheetFoundName,
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
            historico: [{
              id: `h-${Date.now()}-${newVagas.length + 1}`,
              data: now.split('T')[0],
              descricao: 'Importado da nova Base Geral de Vagas',
              usuario: 'Sistema'
            }]
          });
        }

        if (newVagas.length === 0) {
          setSummary({
            type: 'warning',
            totalFound: totalRowsFound,
            discardedEmpty: discardedCargoEmpty,
            message: 'Nenhum registro válido foi encontrado para importar.',
            fileName: selectedFile.name,
            sheetName: sheetFoundName,
            headerFound: headerRowIndex !== -1
          });
          setStep('summary');
          return;
        }

        useVagasStore.setState({ vagas: newVagas });
        const byUnit: Record<string, number> = {};
        newVagas.forEach(v => {
          byUnit[v.unidade] = (byUnit[v.unidade] || 0) + 1;
        });

        const totalVagasDashboard = getValidVacancyBase(newVagas, 'TODOS', 'TODOS').length;
        setSummary({
          type: 'vagas',
          total: newVagas.length,
          totalFound: totalRowsFound,
          discardedEmpty: discardedCargoEmpty,
          dashboardTotal: totalVagasDashboard,
          fileName: selectedFile.name,
          sheetName: sheetFoundName,
          byUnit
        });
        
        addImportHistory({
          id: batchId,
          usuario: 'Sistema',
          total_lidos: totalRowsFound,
          total_novos: newVagas.length,
          total_atualizados: 0,
          total_ignorados: discardedCargoEmpty,
          total_erros: 0,
          status: 'concluido',
          tipo_importacao: 'vagas',
          arquivo: selectedFile.name,
          data_hora: now
        });
        
        toast.success(`Importação de Vagas: ${newVagas.length} registros inseridos.`);

      } else if (importType === 'banco') {
        const sheet = wb.Sheets['BANCO GERAL'] || wb.Sheets['BANCO'] || wb.Sheets[wb.SheetNames[0]];
        if (!sheet) {
          toast.error("Nenhuma aba compatível para Banco de Talentos encontrada.");
          reset();
          return;
        }

        const data = XLSX.utils.sheet_to_json<any>(sheet);
        const newBancos: BancoTalentos[] = [];
        let countCR = 0, countConv = 0, countVenc = 0;

        data.forEach((row, i) => {
          const statusRaw = String(row['STATUS'] || row['status'] || row['Situação'] || '').toUpperCase().trim();
          let status: 'CADASTRO RESERVA' | 'CONVOCADO' | 'VENCIDO' | 'valido' | 'prorrogado' | 'nenhum' = 'nenhum';

          if (statusRaw === 'CADASTRO RESERVA' || statusRaw.includes('RESERVA')) { status = 'CADASTRO RESERVA'; countCR++; }
          else if (statusRaw === 'CONVOCADO' || statusRaw.includes('CONVOC')) { status = 'CONVOCADO'; countConv++; }
          else if (statusRaw === 'VENCIDO' || statusRaw.includes('VENCID')) { status = 'VENCIDO'; countVenc++; }

          newBancos.push({
            id: `banco-${batchId}-${i}`,
            cargo: String(row['CARGO'] || row['cargo'] || row['Cargo'] || ''),
            unidade: String(row['UNIDADE'] || row['unidade'] || row['Unidade'] || ''),
            status: status,
            numero_edital: String(row['EDITAL'] || row['edital'] || row['Edital'] || row['Processo'] || ''),
            data_abertura_edital: now.split('T')[0],
            data_validade: (row['VALIDADE'] || row['Validade']) ? convertDateValue(row['VALIDADE'] || row['Validade'], 'auto').formatted : '',
            is_prorrogado: false,
            observacoes: '',
            status_import: statusRaw,
            import_batch_id: batchId,
            data_importacao: now,
            origem_importacao: selectedFile.name,
          });
        });

        if (newBancos.length === 0) {
          toast.warning("Nenhum registro encontrado para importar no Banco de Talentos.");
          reset();
          return;
        }

        clearBancos();
        addBancos(newBancos);
        setSummary({
          type: 'banco',
          total: newBancos.length,
          cr: countCR,
          conv: countConv,
          venc: countVenc,
          fileName: selectedFile.name
        });

        addImportHistory({
          id: batchId,
          usuario: 'Sistema',
          total_lidos: data.length,
          total_novos: newBancos.length,
          total_atualizados: 0,
          total_ignorados: 0,
          total_erros: 0,
          status: 'concluido',
          tipo_importacao: 'banco',
          arquivo: selectedFile.name,
          data_hora: now
        });

        toast.success(`Importação de Banco: ${newBancos.length} registros inseridos.`);
      }

      setStep('summary');
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar o arquivo.");
      reset();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) reset(); onOpenChange(val); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importação de Dados</DialogTitle>
          <DialogDescription>
            Importação simplificada e rigorosa conforme requisitos.
          </DialogDescription>
        </DialogHeader>

        <div className="py-8">
          {step === 'select' && (
            <div 
              className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl border-border hover:border-primary/50 transition-all cursor-pointer bg-muted/20"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xlsm" 
                onChange={handleFileChange} 
              />
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Clique para selecionar o arquivo</h3>
              <p className="text-sm text-muted-foreground mt-2">Arraste Proposta de Gestão (.xlsm) ou Banco de Dados (.xlsx)</p>
            </div>
          )}

          {step === 'confirm' && (
            <div className="flex flex-col items-center space-y-6">
              <div className="p-6 bg-muted/30 rounded-xl border border-border w-full text-center">
                <FileSpreadsheet className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">Arquivo: {file?.name}</h3>
                
                {detectedType ? (
                  <div className="space-y-4">
                    <p className="text-sm">
                      Tipo detectado automaticamente: 
                      <Badge variant={confidence === 'high' ? 'default' : 'secondary'} className="ml-2 uppercase">
                        {detectedType === 'vagas' ? 'Vagas (Proposta)' : 'Banco de Talentos'}
                      </Badge>
                    </p>
                    {confidence === 'low' && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                        <Info className="h-4 w-4 shrink-0" />
                        <p>A detecção automática tem baixa confiança. Por favor, confirme se o tipo está correto.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    <X className="h-4 w-4 shrink-0" />
                    <p>Não foi possível identificar o tipo do arquivo automaticamente.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                <Button 
                  variant={detectedType === 'vagas' ? 'default' : 'outline'}
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setDetectedType('vagas')}
                >
                  <Layers className="h-6 w-6" />
                  <span>Vagas (Proposta)</span>
                </Button>
                <Button 
                  variant={detectedType === 'banco' ? 'default' : 'outline'}
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setDetectedType('banco')}
                >
                  <Database className="h-6 w-6" />
                  <span>Banco de Talentos</span>
                </Button>
              </div>

              <div className="flex justify-end gap-3 w-full pt-4">
                <Button variant="ghost" onClick={reset}>Cancelar</Button>
                <Button 
                  disabled={!detectedType} 
                  onClick={() => processFile(detectedType!)}
                  className="px-8"
                >
                  Confirmar e Importar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Processando dados...</h3>
              <p className="text-sm text-muted-foreground mt-2">Aplicando filtros rigorosos e contando registros.</p>
            </div>
          )}

          {step === 'summary' && summary && (
            <div className="space-y-6">
              {summary.type === 'error' ? (
                <div className="bg-destructive/5 border border-destructive/10 rounded-xl p-6 flex flex-col items-center text-center">
                  <X className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-xl font-bold text-destructive">Falha na Importação</h3>
                  <p className="text-sm text-muted-foreground mt-2">{summary.message}</p>
                  <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-left w-full">
                    <p className="font-bold mb-1">Abas encontradas no arquivo:</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {summary.sheetsAvailable?.map((s: string) => (
                        <Badge key={s} variant="outline">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-8 flex gap-3">
                    <Button variant="outline" onClick={reset}>Tentar novamente</Button>
                    <Button onClick={() => onOpenChange(false)}>Fechar</Button>
                  </div>
                </div>
              ) : summary.type === 'warning' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col items-center text-center">
                  <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
                  <h3 className="text-xl font-bold text-amber-700">Atenção: 0 Registros</h3>
                  <p className="text-sm text-amber-600 mt-2">{summary.message}</p>
                  
                  <div className="mt-6 grid grid-cols-2 gap-4 w-full text-xs">
                    <div className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                      <p className="text-muted-foreground">Linhas encontradas</p>
                      <p className="text-lg font-bold">{summary.totalFound}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm text-red-600">
                      <p className="text-muted-foreground">Cargo vazio (puladas)</p>
                      <p className="text-lg font-bold">{summary.discardedEmpty}</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-white/50 border border-amber-100 rounded-lg text-left w-full text-[10px] space-y-1">
                    <p><strong>Aba lida:</strong> {summary.sheetName}</p>
                    <p><strong>Cabeçalho identificado:</strong> {summary.headerFound ? 'Sim' : 'Não'}</p>
                    <p className="mt-2 text-amber-800">Dica: Verifique se a coluna 'CARGO' está preenchida nas linhas de dados.</p>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <Button variant="outline" onClick={reset}>Tentar outro arquivo</Button>
                    <Button onClick={() => onOpenChange(false)}>Fechar</Button>
                  </div>
                </div>
              ) : (
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 flex flex-col items-center text-center">
                  <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-bold text-primary">Importação Concluída!</h3>
                  <p className="text-sm text-muted-foreground mt-1">{summary.fileName}</p>
                  
                  <div className="mt-6 grid grid-cols-1 gap-4 w-full max-w-sm">
                    <div className="bg-background p-4 rounded-lg border border-border shadow-sm flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Total de Registros Salvos:</span>
                      <span className="text-xl font-bold">{summary.total}</span>
                    </div>
                    
                    {summary.type === 'banco' && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-background p-3 rounded-lg border border-border shadow-sm flex flex-col items-center">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Reserva</span>
                          <span className="text-lg font-bold text-blue-600">{summary.cr}</span>
                        </div>
                        <div className="bg-background p-3 rounded-lg border border-border shadow-sm flex flex-col items-center">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Convoc.</span>
                          <span className="text-lg font-bold text-green-600">{summary.conv}</span>
                        </div>
                        <div className="bg-background p-3 rounded-lg border border-border shadow-sm flex flex-col items-center">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Vencido</span>
                          <span className="text-lg font-bold text-red-600">{summary.venc}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex gap-3">
                    <Button variant="outline" onClick={reset}>Importar outro</Button>
                    <Button onClick={() => onOpenChange(false)}>Fechar</Button>
                  </div>
                </div>
              )}
              
              {summary.type === 'vagas' && summary.total > 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Info className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div className="flex flex-col">
                      <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">
                        Auditoria de Importação - Detalhes
                      </p>
                      <p className="text-[10px] text-emerald-600">
                        Aba: <strong>{summary.sheetName}</strong> | Linhas brutas: {summary.totalFound} | Puladas: {summary.discardedEmpty}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-8">
                    {Object.entries(summary.byUnit || {}).map(([unit, count]) => (
                      <div key={unit} className="flex justify-between items-center text-[10px] bg-white/50 p-1.5 rounded border border-emerald-100">
                        <span className="font-bold text-emerald-800">{unit}</span>
                        <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-full font-black">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
