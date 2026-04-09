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
  'VAGAS - BASE GERAL'
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
          let totalProcessed = 0;

          VAGA_SHEETS.forEach(sheetName => {
            const sheet = wb.Sheets[sheetName];
            if (!sheet) return;

            const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
            
            for (let i = 2; i < rawRows.length; i++) { // Dados iniciam na linha 3 (index 2)
              const row = rawRows[i];
              if (!row) continue;

              const cargo = String(row[4] || '').trim(); // Coluna E (index 4)
              if (!cargo) continue;

              totalProcessed++;

              // Novo mapeamento conforme Item 1 e 6:
              // 0: ABERTURA (A)
              // 1: RECEBIMENTO (B)
              // 2: UNIDADE (C)
              // 3: REQUISIÇÃO (D)
              // 4: CARGO (E)
              // 5: TIPO (F)
              // 6: VAGAS (G)
              // 7: STATUS (H)
              // 8: DATA CONVOCAÇÃO (I)
              // 9: HORÁRIO CONVOCAÇÃO (J)
              // 10: CANDIDATO CONVOCADO CONVOCAÇÃO (K)
              // 11: CLASSIFICAÇÃO CONVOCAÇÃO (L)
              // 12: FORMA CONVOCAÇÃO (M)
              // 13: STATUS OITIVA CONVOCAÇÃO (N)
              // 14: SEÇÃO (O)
              // 15: ADMISSÃO ENVIADA - ACOMPANHAMENTO (P)
              // 16: ADMISSÃO EFETIVADA - ACOMPANHAMENTO (Q)
              // 17: DETALHES - ACOMPANHAMENTO (R)
              // 18: OBSERVAÇÃO - ACOMPANHAMENTO (S)

              const dataAbertura = row[0] ? convertDateValue(row[0], 'auto').formatted : '';
              const dataRecebimento = row[1] ? convertDateValue(row[1], 'auto').formatted : '';
              const unitInRow = String(row[2] || '').trim();
              const requisicao = String(row[3] || '');
              const rawTipo = String(row[5] || '').toLowerCase();
              const numVagas = Number(row[6]) || 1;
              const statusRaw = String(row[7] || '');
              
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
        let totalProcessed = 0;

        VAGA_SHEETS.forEach(sheetName => {
          const sheet = wb.Sheets[sheetName];
          if (!sheet) return;

          const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          
          for (let i = 2; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row) continue;

            const cargo = String(row[4] || '').trim();
            if (!cargo) continue;

            totalProcessed++;

            const dataAbertura = row[0] ? convertDateValue(row[0], 'auto').formatted : '';
            const dataRecebimento = row[1] ? convertDateValue(row[1], 'auto').formatted : '';
            const unitInRow = String(row[2] || '').trim();
            const requisicao = String(row[3] || '');
            const rawTipo = String(row[5] || '').toLowerCase();
            const numVagas = Number(row[6]) || 1;
            const statusRaw = String(row[7] || '');
            
            const dataConv = row[8] ? convertDateValue(row[8], 'auto').formatted : '';
            const horaConv = String(row[9] || '');
            const candConv = String(row[10] || '');
            const classConv = String(row[11] || '');
            const formaConv = String(row[12] || '');
            const oitivaConv = String(row[13] || '');
            const secao = String(row[14] || '');
            
            const admEnviada = String(row[15] || '');
            const admEfetivada = String(row[16] || '');
            const detalhesAcomp = String(row[17] || '');
            const obsAcomp = String(row[18] || '');

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
              id: `vaga-${batchId}-${totalProcessed}`,
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
              source_sheet: sheetName,
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
                id: `h-${Date.now()}-${totalProcessed}`,
                data: now.split('T')[0],
                descricao: 'Importado da nova Base Geral de Vagas',
                usuario: 'Sistema'
              }]
            });
          }
        });

        useVagasStore.setState({ vagas: newVagas });
        const byUnit: Record<string, number> = {};
        newVagas.forEach(v => {
          byUnit[v.unidade] = (byUnit[v.unidade] || 0) + 1;
        });

        const totalVagasDashboard = getValidVacancyBase(newVagas, 'TODOS', 'TODOS').length;
        setSummary({
          type: 'vagas',
          total: newVagas.length,
          dashboardTotal: totalVagasDashboard,
          fileName: selectedFile.name,
          byUnit
        });
        
        addImportHistory({
          id: batchId,
          usuario: 'Sistema',
          total_lidos: totalProcessed,
          total_novos: newVagas.length,
          total_atualizados: 0,
          total_ignorados: 0,
          total_erros: 0,
          status: 'concluido',
          tipo_importacao: 'vagas',
          arquivo: selectedFile.name,
          data_hora: now
        });
        
        toast.success(`Importação de Vagas: ${newVagas.length} registros inseridos.`);

      } else if (importType === 'banco') {
        const sheet = wb.Sheets['BANCO GERAL'];
        if (!sheet) {
          toast.error("Aba 'BANCO GERAL' não encontrada.");
          reset();
          return;
        }

        const data = XLSX.utils.sheet_to_json<any>(sheet);
        const newBancos: BancoTalentos[] = [];
        let countCR = 0, countConv = 0, countVenc = 0;

        data.forEach((row, i) => {
          const statusRaw = String(row['STATUS'] || row['status'] || '').toUpperCase().trim();
          let status: 'CADASTRO RESERVA' | 'CONVOCADO' | 'VENCIDO' | 'valido' | 'prorrogado' | 'nenhum' = 'nenhum';

          if (statusRaw === 'CADASTRO RESERVA') { status = 'CADASTRO RESERVA'; countCR++; }
          else if (statusRaw === 'CONVOCADO') { status = 'CONVOCADO'; countConv++; }
          else if (statusRaw === 'VENCIDO') { status = 'VENCIDO'; countVenc++; }

          newBancos.push({
            id: `banco-${batchId}-${i}`,
            cargo: String(row['CARGO'] || row['cargo'] || ''),
            unidade: String(row['UNIDADE'] || row['unidade'] || ''),
            status: status,
            numero_edital: String(row['EDITAL'] || row['edital'] || ''),
            data_abertura_edital: now.split('T')[0],
            data_validade: row['VALIDADE'] ? convertDateValue(row['VALIDADE'], 'auto').formatted : '',
            is_prorrogado: false,
            observacoes: '',
            status_import: statusRaw,
            import_batch_id: batchId,
            data_importacao: now,
            origem_importacao: selectedFile.name,
          });
        });

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
          <DialogTitle>Importação de Dados (Nova Lógica)</DialogTitle>
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

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Processando dados...</h3>
              <p className="text-sm text-muted-foreground mt-2">Aplicando filtros rigorosos e contando registros.</p>
            </div>
          )}

          {step === 'summary' && summary && (
            <div className="space-y-6">
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 flex flex-col items-center text-center">
                <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold text-primary">Importação Concluída!</h3>
                <p className="text-sm text-muted-foreground mt-1">{summary.fileName}</p>
                
                <div className="mt-6 grid grid-cols-1 gap-4 w-full max-w-sm">
                  <div className="bg-background p-4 rounded-lg border border-border shadow-sm flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Total de Registros:</span>
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
              
              {summary.type === 'vagas' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Info className="h-5 w-5 text-emerald-500 shrink-0" />
                    <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">
                      Auditoria de Importação - Registros por Unidade
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-8">
                    {Object.entries(summary.byUnit || {}).map(([unit, count]) => (
                      <div key={unit} className="flex justify-between items-center text-[10px] bg-white/50 p-1.5 rounded border border-emerald-100">
                        <span className="font-bold text-emerald-800">{unit}</span>
                        <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-full font-black">{count as number}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-emerald-600 mt-1 italic text-center">
                    * Todos os registros acima possuem cargo preenchido e foram integrados à base operacional.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
