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

type Step = 'select' | 'processing' | 'summary';

const VAGA_SHEETS = [
  'tb_HECAD', 'tb_CRER', 'tb_AGIR', 'tb_HUGOL', 'tb_HDS', 
  'tb_POLICLINICA', 'tb_VITORIA', 'tb_JATAI', 'tb_TEIA_ANAPOLIS', 
  'tb_TEIA_CANEDO', 'tb_TEIA_APARECIDA', 'tb_TEIA_GOIANIA',
  // Manter suporte aos nomes antigos por retrocompatibilidade se necessário
  'Vagas - HECAD', 'Vagas - CRER', 'Vagas - AGIR', 'Vagas - HUGOL', 
  'Vagas - HDS', 'Vagas - POLICLÍNICA', 'Vagas - VITÓRIA', 'Vagas - JATAÍ', 
  'Vagas - TEIA ANÁPOLIS', 'Vagas - TEIA CANEDO', 'Vagas - TEIA APARECIDA', 'Vagas - TEIA GOIÂNIA'
];

const UNIT_MAPPING: Record<string, string> = {
  'tb_HECAD': 'HECAD',
  'tb_CRER': 'CRER',
  'tb_AGIR': 'AGIR',
  'tb_HUGOL': 'HUGOL',
  'tb_HDS': 'HDS',
  'tb_POLICLINICA': 'POLICLÍNICA',
  'tb_VITORIA': 'VITÓRIA',
  'tb_JATAI': 'JATAÍ',
  'tb_TEIA_ANAPOLIS': 'TEIA ANÁPOLIS',
  'tb_TEIA_CANEDO': 'TEIA CANEDO',
  'tb_TEIA_APARECIDA': 'TEIA APARECIDA',
  'tb_TEIA_GOIANIA': 'TEIA GOIÂNIA',
  'Vagas - HECAD': 'HECAD',
  'Vagas - CRER': 'CRER',
  'Vagas - AGIR': 'AGIR',
  'Vagas - HUGOL': 'HUGOL',
  'Vagas - HDS': 'HDS',
  'Vagas - POLICLÍNICA': 'POLICLÍNICA',
  'Vagas - VITÓRIA': 'VITÓRIA',
  'Vagas - JATAÍ': 'JATAÍ',
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('select');
    setFile(null);
    setSummary(null);
    setIsProcessing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    setIsProcessing(true);
    setStep('processing');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const fileName = selectedFile.name.toLowerCase();
        const now = new Date().toISOString();
        const batchId = `IMPORT-${Date.now()}`;

        if (fileName.endsWith('.xlsm')) {
          const newVagas: Vaga[] = [];
          let totalProcessed = 0;

          VAGA_SHEETS.forEach(sheetName => {
            const sheet = wb.Sheets[sheetName];
            if (!sheet) return;

            const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
            let unitName = UNIT_MAPPING[sheetName] || sheetName.replace('Vagas - ', '');
            
            for (let i = 3; i < rawRows.length; i++) {
              const row = rawRows[i];
              if (!row) continue;

              const cargo = String(row[4] || '').trim(); // Coluna E (index 4)
              if (!cargo) continue;

              totalProcessed++;

              // Refinement for VITÓRIA sheet which contains SÃO PEDRO and SUÁ
              let finalUnit = unitName;
              if (sheetName === 'Vagas - VITÓRIA') {
                const rowString = JSON.stringify(row).toUpperCase();
                if (rowString.includes('SUÁ') || rowString.includes('SUA')) {
                  finalUnit = 'SUÁ';
                } else {
                  finalUnit = 'SÃO PEDRO';
                }
              }

              const dataAbertura = row[0] ? convertDateValue(row[0], 'auto').formatted : ''; // Coluna A (0)
              const dataRecebimento = row[1] ? convertDateValue(row[1], 'auto').formatted : ''; // Coluna B (1)
              const requisicao = String(row[2] || ''); // Coluna C (2)
              const secao = String(row[3] || ''); // Coluna D (3)
              const rawTipo = String(row[5] || '').toLowerCase(); // Coluna F (5)
              const numVagas = Number(row[6]) || 1; // Coluna G (6)
              const analista = String(row[7] || ''); // Coluna H (7)
              const statusRaw = String(row[8] || ''); // Coluna I (8)
              const vagaId = String(row[9] || ''); // Coluna J (9)
              const obs = String(row[10] || ''); // Coluna K (10)

              // Normalização do Tipo de Vaga
              let tipoVaga: TipoVaga = 'substituicao';
              if (rawTipo.includes('aumento')) tipoVaga = 'aumento';
              else if (rawTipo.includes('lideranca')) tipoVaga = 'lideranca';
              else if (rawTipo.includes('movimentacao')) tipoVaga = 'movimentacao_interna';

              const statusNormalized = normalizeStatus(statusRaw);
              const { analista: defaultAnalista, assistentes } = getResponsavelPorUnidade(finalUnit, tipoVaga);

              newVagas.push({
                id: `vaga-${batchId}-${totalProcessed}`,
                unidade: finalUnit,
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
                analista_responsavel: analista || defaultAnalista,
                assistentes: assistentes,
                vaga: vagaId,
                observacoes_internas: obs,
                origem_importacao: selectedFile.name,
                data_importacao: now,
                lote_importacao: batchId,
                import_batch_id: batchId,
                source_sheet: sheetName,
                source_row_index: i + 1,
                tem_banco_valido: false,
                historico: [{
                  id: `h-${Date.now()}-${totalProcessed}`,
                  data: now.split('T')[0],
                  descricao: 'Importado do arquivo Proposta de Gestão de Vagas',
                  usuario: 'Sistema'
                }]
              });
            }
          });

          // Regra de Ouro: SUBSTITUIÇÃO TOTAL - Feito de forma atômica
          const totalAntigoVagas = useVagasStore.getState().vagas.length;
          
          // Use a single set to avoid inconsistent states
          useVagasStore.setState({ vagas: newVagas });
          
          const totalNovoVagas = useVagasStore.getState().vagas.length;
          
          // Log detalhado conforme solicitado
          console.log(`[IMPORT VAGAS] Processo concluído.`);
          console.log(`- Registros antigos apagados: ${totalAntigoVagas}`);
          console.log(`- Registros lidos do arquivo: ${totalProcessed}`);
          console.log(`- Registros válidos inseridos: ${newVagas.length}`);
          console.log(`- Total final na base: ${totalNovoVagas}`);
          
          // Métrica específica solicitada para conferência
          const totalVagasDashboard = getValidVacancyBase(newVagas, 'TODOS', 'TODOS').length;
          console.log(`- TOTAL VAGAS (DASHBOARD): ${totalVagasDashboard}`);

          setSummary({
            type: 'vagas',
            total: newVagas.length,
            dashboardTotal: totalVagasDashboard,
            fileName: selectedFile.name
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
          
          toast.success(`Importação de Vagas: ${newVagas.length} registros inseridos em modo substituição.`);

        } else if (fileName.endsWith('.xlsx')) {
          const sheet = wb.Sheets['BANCO GERAL'];
          if (!sheet) {
            toast.error("Aba 'BANCO GERAL' não encontrada.");
            reset();
            return;
          }

          const data = XLSX.utils.sheet_to_json<any>(sheet);
          const newBancos: BancoTalentos[] = [];
          
          let countCR = 0;
          let countConv = 0;
          let countVenc = 0;

          data.forEach((row, i) => {
            const statusRaw = String(row['STATUS'] || row['status'] || '').toUpperCase().trim();
            let status: 'CADASTRO RESERVA' | 'CONVOCADO' | 'VENCIDO' | 'valido' | 'prorrogado' | 'nenhum' = 'nenhum';

            if (statusRaw === 'CADASTRO RESERVA') {
              status = 'CADASTRO RESERVA';
              countCR++;
            } else if (statusRaw === 'CONVOCADO') {
              status = 'CONVOCADO';
              countConv++;
            } else if (statusRaw === 'VENCIDO') {
              status = 'VENCIDO';
              countVenc++;
            }

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

          // Regra de Ouro: SUBSTITUIÇÃO TOTAL
          const totalAntigoBanco = useVagasStore.getState().bancos.length;
          clearBancos();
          addBancos(newBancos);
          const totalNovoBanco = useVagasStore.getState().bancos.length;
          
          // Log detalhado conforme solicitado
          console.log(`[IMPORT BANCO] Processo concluído.`);
          console.log(`- Registros antigos apagados: ${totalAntigoBanco}`);
          console.log(`- Registros lidos do arquivo: ${data.length}`);
          console.log(`- Registros válidos inseridos: ${newBancos.length}`);
          console.log(`- Total final na base: ${totalNovoBanco}`);
          console.log(`  * Cadastro Reserva: ${countCR}`);
          console.log(`  * Convocados: ${countConv}`);
          console.log(`  * Vencidos: ${countVenc}`);

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

          toast.success(`Importação de Banco: ${newBancos.length} registros inseridos em modo substituição.`);
        } else {
          toast.error("Formato de arquivo não suportado para esta operação.");
          reset();
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
    reader.readAsArrayBuffer(selectedFile);
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
              
              {summary.type === 'vagas' && summary.total !== 736 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                  <Info className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Atenção: O total de vagas ({summary.total}) difere do esperado (736). 
                    HUGOL: 246, CRER: 118, HECAD: 89, AGIR: 62, JATAÍ: 91, HDS: 30, SÃO PEDRO: 31, SUÁ: 23, POLICLÍNICA: 14, CANEDO: 11, GOIÂNIA: 9, ANÁPOLIS: 6, APARECIDA: 6.
                  </p>
                </div>
              )}
              {summary.type === 'banco' && summary.cr !== 579 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                  <Info className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Atenção: O total de Cadastro Reserva ({summary.cr}) difere do esperado (579).
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
