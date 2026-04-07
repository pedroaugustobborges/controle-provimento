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
  { label: 'Brasileiro (dd/mm/aaaa)', value: 'dd/MM/yyyy' },
  { label: 'Americano (mm/dd/aaaa)', value: 'MM/dd/yyyy' },
  { label: 'ISO (aaaa-mm-dd)', value: 'yyyy-MM-dd' },
  { label: 'Excel (número serial)', value: 'excel_serial' },
  { label: 'Auto-detectar', value: 'auto' },
];

const DATE_FIELDS = ['data_abertura_edital', 'data_validade', 'nova_data_validade', 'data_convocacao'];

const REQUIRED_FIELDS = [
  { key: 'unidade', label: 'Unidade' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'numero_edital', label: 'Número do edital' },
  { key: 'numero_processo', label: 'Número do processo' },
  { key: 'nome', label: 'Nome' },
  { key: 'classificacao', label: 'Classificação' },
  { key: 'quantidade_banco', label: 'Quantidade do banco' },
  { key: 'status_import', label: 'Status' },
  { key: 'data_abertura_edital', label: 'Data de Publicação' },
  { key: 'data_validade', label: 'Validade' },
];

const OPTIONAL_FIELDS = [
  { key: 'is_prorrogado', label: 'Prorrogação' },
  { key: 'numero_chamada', label: 'Número da chamada' },
  { key: 'numero_processo_seletivo', label: 'Número do processo seletivo' },
  { key: 'numero_vaga_aproveitamento', label: 'Número da vaga aproveitamento' },
  { key: 'data_convocacao', label: 'Data de Convocação' },
  { key: 'unidade_convocacao', label: 'Unidade da convocação' },
  { key: 'secao', label: 'Seção' },
  { key: 'observacoes', label: 'Observações' },
];

const FIELD_SYNONYMS: Record<string, string[]> = {
  unidade: ['unidade', 'filial', 'local'],
  cargo: ['cargo', 'função', 'vaga'],
  secao: ['seção', 'secao', 'setor', 'departamento'],
  numero_edital: ['edital', 'nº edital', 'número edital', 'EDITAL'],
  numero_processo: ['processo', 'nº processo', 'número processo', 'N° PROCESSO'],
  nome: ['nome', 'candidato', 'NOME'],
  classificacao: ['classificação', 'posicao', 'ranking', 'CLASSIFICAÇÃO'],
  quantidade_banco: ['quantidade banco', 'qntd banco', 'QNTD BANCO'],
  status_import: ['status', 'STATUS'],
  data_abertura_edital: ['abertura', 'data abertura', 'dt abertura', 'publicação', 'publicacao', 'data publicação', 'data publicacao', 'PUBLICAÇÃO'],
  data_validade: ['validade', 'data validade', 'dt validade', 'vencimento', 'VALIDADE'],
  is_prorrogado: ['prorrogado', 'prorrogação', 'PRORROGAÇÃO'],
  numero_chamada: ['chamada', 'nº chamada', 'número chamada', 'N° CHAMADA'],
  numero_processo_seletivo: ['processo seletivo', 'nº processo seletivo', 'N° PROCESSO SELETIVO'],
  numero_vaga_aproveitamento: ['vaga aproveitamento', 'nº vaga aproveitamento', 'N° VAGA APROVEITAMENTO'],
  data_convocacao: ['convocação', 'data convocação', 'convocacao', 'dt convocacao', 'convocado em', 'DATA CONVOCAÇÃO'],
  unidade_convocacao: ['unidade convocação', 'unidade convocacao', 'UNIDADE CONVOCAÇÃO'],
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
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ')    // substitui caracteres especiais por espaço
    .replace(/[\r\n]+/g, ' ')       // remove quebras de linha
    .replace(/\s+/g, ' ')           // normaliza espaços
    .trim();
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

const parseDateValue = (value: any, targetFormat: string): { 
  date: Date | null, 
  isValid: boolean, 
  formatted: string, 
  isExcelSerial?: boolean,
  formatUsed?: string 
} => {
  if (value === undefined || value === null || value === '') return { date: null, isValid: true, formatted: '' };
  
  let d: Date | null = null;
  let isExcelSerial = false;
  let formatUsed = targetFormat;

  // 1. Verificar se é número serial do Excel
  const numValue = Number(value);
  const looksLikeExcelSerial = !isNaN(numValue) && numValue > 30000 && numValue < 60000;

  if (targetFormat === 'excel_serial' || (targetFormat === 'auto' && looksLikeExcelSerial)) {
    d = addDays(new Date(1899, 11, 30), numValue);
    isExcelSerial = true;
    formatUsed = 'Excel (numérico)';
  } 
  // 2. Se já for um objeto Date
  else if (value instanceof Date) {
    d = value;
    formatUsed = 'Objeto Date';
  }
  // 3. Se for string (ou algo que possa ser convertido em string)
  else {
    const trimmed = String(value).trim();
    if (!trimmed || trimmed === '') return { date: null, isValid: true, formatted: '' };

    // Limpar delimitadores comuns para facilitar o parser
    const cleaned = trimmed.replace(/[\.-]/g, '/');
    
    // Lista de formatos para tentar, priorizando dd/mm/aaaa como solicitado
    const formatsToTry = targetFormat === 'auto' 
      ? ['dd/MM/yyyy', 'd/M/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'yyyy/MM/dd'] 
      : [targetFormat.replace(/[\.-]/g, '/')];

    for (const f of formatsToTry) {
      try {
        const parsed = parse(cleaned, f, new Date());
        if (isValid(parsed)) {
          // Validar se o ano é razoável (evitar interpretações absurdas)
          const year = parsed.getFullYear();
          if (year > 1900 && year < 2100) {
            d = parsed;
            formatUsed = f === 'dd/MM/yyyy' ? 'Brasileiro (dd/mm/aaaa)' : f;
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback para o parser nativo se tudo falhar
    if (!d) {
      const native = new Date(trimmed);
      if (isValid(native)) {
        d = native;
        formatUsed = 'Parser nativo';
      }
    }
  }

  if (d && isValid(d)) {
    return { 
      date: d, 
      isValid: true, 
      formatted: format(d, 'yyyy-MM-dd'),
      isExcelSerial,
      formatUsed
    };
  }
  
  // Se não for possível converter, retornamos o valor original para o usuário decidir
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
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [headerRow, setHeaderRow] = useState<number>(0);
  const [rawPreview, setRawPreview] = useState<any[][]>([]);
  const [fileId, setFileId] = useState<string | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [totalDetectedRows, setTotalDetectedRows] = useState<number>(0);
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
      setIsLoadingFile(true);
      const id = `FILE-BT-${Date.now()}`;
      setFileId(id);
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const wb = XLSX.read(data, { type: 'array' });
          
          if (!wb.SheetNames || wb.SheetNames.length === 0) {
            throw new Error('O arquivo selecionado não possui planilhas válidas.');
          }

          addImportedFile({
            id,
            nome_original: selectedFile.name,
            nome_interno: id,
            tipo: selectedFile.type || 'application/vnd.ms-excel.sheet.macroEnabled.12',
            tamanho: selectedFile.size,
            data_upload: new Date().toISOString(),
            usuario: 'Ana Paula Oliveira',
            email_usuario: 'ana.oliveira@agir.org.br',
            modulo_origem: 'banco_talentos',
            status: 'enviado',
            // content: data as any // Removido para evitar estourar quota do localStorage e excesso de memória
          });
          setWorkbook(wb);
          setSelectedSheets([wb.SheetNames[0]]);
          // Don't jump to next step automatically
          // setStep('sheets');
          toast.success(`Arquivo "${selectedFile.name}" carregado com sucesso.`);
        } catch (error: any) {
          console.error('Erro ao ler arquivo:', error);
          let errorMsg = 'Não foi possível processar este arquivo Excel.';
          
          if (error?.message?.includes('password')) {
            errorMsg = 'Este arquivo está protegido por senha e não pode ser lido.';
          } else if (selectedFile.name.toLowerCase().endsWith('.xlsm')) {
            errorMsg = 'Ocorreu um problema ao ler o arquivo .xlsm. Verifique se o arquivo não está corrompido.';
          } else if (error?.message) {
            errorMsg = `Erro: ${error.message}`;
          }
          
          toast.error(errorMsg);
          setFile(null);
        } finally {
          setIsLoadingFile(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      
      reader.onerror = () => {
        setIsLoadingFile(false);
        toast.error('Ocorreu um erro técnico ao carregar o arquivo do disco.');
      };
      
      reader.readAsArrayBuffer(selectedFile);
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

      // 0. Contar registros totais
      const sheet = workbook!.Sheets[selectedSheets[0]];
      const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const count = Math.max(0, allRows.length - (headerRow + 1));
      setTotalDetectedRows(count);

      // 1. Extrair e tratar cabeçalhos
      const rawHeaders = rawPreview[headerRow] || [];
      const processedHeaders: string[] = [];
      const usedNames = new Map<string, number>();

      rawHeaders.forEach((c, i) => {
        // Fallback para nomes vazios e remoção de quebras de linha/espaços extras
        let name = (c !== null && c !== undefined && String(c).trim() !== '') 
          ? String(c).trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ')
          : `Coluna ${i + 1}`;
        
        // Tratar duplicados adicionando sufixo
        if (usedNames.has(name)) {
          const count = usedNames.get(name)! + 1;
          usedNames.set(name, count);
          name = `${name} (${count})`; // Formato amigável: Nome (2)
        } else {
          usedNames.set(name, 1);
        }
        
        processedHeaders.push(name);
      });

      console.log("Colunas processadas:", processedHeaders);
      setDetectedHeaders(processedHeaders);

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
          format: DATE_FIELDS.includes(field.key) ? 'dd/MM/yyyy' : undefined, 
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
      setDetectedHeaders([]);
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
    try {
      const allData: any[] = [];
      selectedSheets.forEach(sheetName => {
        const data = XLSX.utils.sheet_to_json(workbook!.Sheets[sheetName], { 
          header: detectedHeaders, 
          range: headerRow + 1,
          defval: '' 
        });
        allData.push(...data);
      });

      setTotalDetectedRows(allData.length);

      const filteredData = allData.filter(row => {
        // Ignora linhas que estão completamente vazias nos campos mapeados
        return mappings.some(m => m.excel && m.excel !== 'no_mapping' && row[m.excel] != null && String(row[m.excel]).trim() !== '');
      });

      setTotalDetectedRows(filteredData.length);

      const mappedData = filteredData.map(row => {
        const result: any = { __errors: {}, __info: {} };
        mappings.forEach(m => {
          if (m.excel && m.excel !== 'no_mapping') {
            const val = row[m.excel];
            if (m.isDate) {
              const { isValid, formatted, formatUsed } = parseDateValue(val, m.format || 'dd/MM/yyyy');
              result[m.system] = formatted;
              if (formatUsed) result.__info[m.system] = formatUsed;
              if (!isValid && val) result.__errors[m.system] = "Formato de data não reconhecido";
            } else { 
              result[m.system] = val; 
            }
          }
        });

        // Validação de campos obrigatórios
        REQUIRED_FIELDS.forEach(field => {
          if (!result[field.key] || result[field.key] === '') {
            result.__errors[field.key] = "Campo obrigatório ausente";
          }
        });

        return result;
      });

      setPreviewData(mappedData.slice(0, 50));
      setStep('preview');
    } catch (error) {
      console.error("Erro ao gerar prévia:", error);
      toast.error("Erro ao processar prévia dos dados. Verifique o mapeamento.");
    }
  };

  const processImport = () => {
    setIsProcessing(true);
    try {
      const allRowsRaw = [];
      selectedSheets.forEach(sheetName => {
        const data = XLSX.utils.sheet_to_json(workbook!.Sheets[sheetName], { 
          header: detectedHeaders, 
          range: headerRow + 1,
          defval: '' 
        });
        allRowsRaw.push(...data);
      });

      const allData = allRowsRaw.filter(row => {
        return mappings.some(m => m.excel && m.excel !== 'no_mapping' && row[m.excel] != null && String(row[m.excel]).trim() !== '');
      });

      const emptyRowsCount = allRowsRaw.length - allData.length;
      const now = new Date();
      const newBancos: BancoTalentos[] = [];
      let totalErros = 0;
      let missingFieldsRows = 0;
      let dateErrorRows = 0;

      const filteredData = allData.filter(row => {
        return mappings.some(m => m.excel && m.excel !== 'no_mapping' && row[m.excel] != null && String(row[m.excel]).trim() !== '');
      });

      filteredData.forEach((row, i) => {
        const mapped: any = {};
        let hasErrorInRow = false;
        let hasMissingRequired = false;

        mappings.forEach(m => {
          if (m.excel && m.excel !== 'no_mapping') {
            const rawVal = row[m.excel];
            if (m.isDate) {
              const dateResult = parseDateValue(rawVal, m.format || 'dd/MM/yyyy');
              mapped[m.system] = dateResult.formatted;
              if (!dateResult.isValid && rawVal) {
                hasErrorInRow = true;
                dateErrorRows++;
              }
            } else if (m.system === 'is_prorrogado') {
              const val = String(rawVal || '').toLowerCase();
              mapped[m.system] = val === 'sim' || val === 's' || val === 'true' || val === '1' || val === 'checked';
            } else {
              mapped[m.system] = String(rawVal || '').trim();
            }
          }
        });

        // Validar campos obrigatórios
        REQUIRED_FIELDS.forEach(field => {
          if (!mapped[field.key] || mapped[field.key] === '') {
            hasMissingRequired = true;
          }
        });

        if (hasMissingRequired) {
          missingFieldsRows++;
          totalErros++;
          return; // Pula este registro se faltar campo obrigatório
        }

        // Determinar status baseado em validade
        let status: 'valido' | 'vencido' | 'prorrogado' = 'valido';
        const dateStr = mapped.nova_data_validade || mapped.data_validade;
        
        // Se a data estiver em formato brasileiro dd/mm/aaaa, vamos converter para aaaa-mm-dd para o objeto Date
        let dateToParse = dateStr;
        if (dateStr && dateStr.includes('/') && dateStr.split('/')[0].length === 2) {
          const parts = dateStr.split('/');
          dateToParse = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        if (dateToParse) {
          const expiryDate = new Date(dateToParse);
          if (isValid(expiryDate)) {
            status = expiryDate > now ? (mapped.is_prorrogado ? 'prorrogado' : 'valido') : 'vencido';
          }
        }

        newBancos.push({
          id: `imp-bt-${Date.now()}-${i}`,
          unidade: mapped.unidade || 'HGG',
          cargo: mapped.cargo || 'Não informado',
          secao: mapped.secao || '',
          numero_edital: mapped.numero_edital || '000/0000',
          numero_processo: mapped.numero_processo || '',
          nome: mapped.nome || '',
          classificacao: mapped.classificacao || '',
          quantidade_banco: mapped.quantidade_banco || '',
          status_import: mapped.status_import || '',
          data_abertura_edital: mapped.data_abertura_edital || '',
          data_validade: mapped.data_validade || '',
          is_prorrogado: !!mapped.is_prorrogado,
          nova_data_validade: mapped.nova_data_validade || undefined,
          data_convocacao: mapped.data_convocacao || undefined,
          unidade_convocacao: mapped.unidade_convocacao || '',
          numero_chamada: mapped.numero_chamada || '',
          numero_processo_seletivo: mapped.numero_processo_seletivo || '',
          numero_vaga_aproveitamento: mapped.numero_vaga_aproveitamento || '',
          observacoes: mapped.observacoes || '',
          status: status,
        });
      });

      if (newBancos.length === 0) {
        setIsProcessing(false);
        if (missingFieldsRows > 0) {
          toast.error(`Não foi possível importar. Há campos obrigatórios ausentes em todas as ${allData.length} linhas.`);
        } else {
          toast.error("Nenhum dado válido encontrado para importação.");
        }
        return;
      }

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
        total_atualizados: 0, 
        total_ignorados: totalErros, 
        total_erros: totalErros,
        status: totalErros > 0 ? 'concluido_alertas' : 'concluido',
        referencia_arquivo: fileId || undefined,
        observacoes: totalErros > 0 
          ? `Importação concluída com ${totalErros} falhas. ${missingFieldsRows} linhas ignoradas por falta de campos obrigatórios.` 
          : 'Importação realizada com sucesso.'
      });

      if (fileId) updateImportedFile(fileId, { status: 'processado' });
      
      setImportSummary({ 
        total_planilha: allRowsRaw.length,
        total_lidos: allData.length, 
        total_novos: newBancos.length,
        total_erros: totalErros,
        total_vazios: emptyRowsCount,
        total_alertas_data: dateErrorRows
      });
      
      setStep('summary');
      setIsProcessing(false);
      
      if (totalErros > 0) {
        toast.warning(`Importação concluída: ${newBancos.length} salvos, ${totalErros} ignorados por erros.`);
      } else {
        toast.success('Banco de talentos importado com sucesso!');
      }
    } catch (error: any) {
      console.error("Erro ao processar importação:", error);
      setIsProcessing(false);
      let errorMsg = error.message || "Ocorreu um erro ao salvar os dados importados.";
      if (errorMsg.includes('quota') || errorMsg.includes('Storage')) {
        errorMsg = "O volume de dados desta importação é grande demais para o armazenamento leve do navegador. Os dados foram processados em memória mas a persistência local falhou.";
      }
      toast.error(`Falha na persistência: ${errorMsg}`);
    }
  };

  const reset = () => {
    setStep('select'); setFile(null); setWorkbook(null); setSelectedSheets([]); setMappings([]); setPreviewData([]); setImportSummary(null); setHeaderRow(0); setRawPreview([]); setDetectedHeaders([]); setTotalDetectedRows(0);
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
            <div className="space-y-6">
              {!file || isLoadingFile ? (
                <div 
                  className={`flex flex-col items-center justify-center h-80 border-2 border-dashed rounded-2xl border-border hover:border-primary/50 transition-all bg-muted/20 cursor-pointer group ${isLoadingFile ? 'opacity-70 pointer-events-none' : ''}`} 
                  onClick={() => !isLoadingFile && fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xlsx, .xls, .xlsm, .csv" 
                    onChange={handleFileChange} 
                  />
                  
                  {isLoadingFile ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                      <div className="h-16 w-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-6" />
                      <h3 className="text-xl font-bold text-foreground">Lendo arquivo...</h3>
                      <p className="text-sm text-muted-foreground mt-2 text-center px-6">
                        {file?.name} ({(file?.size || 0) / 1024 > 1024 ? `${((file?.size || 0) / (1024 * 1024)).toFixed(2)} MB` : `${((file?.size || 0) / 1024).toFixed(2)} KB`})
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-4 uppercase font-bold tracking-widest">Aguarde o processamento</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-background p-6 rounded-full shadow-md mb-6 group-hover:scale-110 transition-transform">
                        <Upload className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">Selecione o arquivo do Banco</h3>
                      <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs px-4">Arraste e solte o arquivo aqui ou clique para navegar no seu dispositivo</p>
                      <div className="mt-8 flex flex-col items-center gap-2">
                        <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest">Formatos Aceitos</p>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-[10px] bg-background">.XLSX</Badge>
                          <Badge variant="secondary" className="text-[10px] bg-background">.XLSM</Badge>
                          <Badge variant="secondary" className="text-[10px] bg-background">.XLS</Badge>
                          <Badge variant="secondary" className="text-[10px] bg-background">.CSV</Badge>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="animate-in fade-in zoom-in duration-300">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-8 flex flex-col items-center text-center">
                    <div className="bg-green-100 p-5 rounded-full mb-6">
                      <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-900 mb-2">Arquivo carregado!</h3>
                    <p className="text-sm text-green-700 mb-8 max-w-md">
                      Detectamos as abas e o conteúdo do arquivo. Clique em continuar para selecionar a aba de importação.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-6 w-full max-w-xl bg-white p-8 rounded-2xl border border-green-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2">
                         <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pronto</Badge>
                      </div>
                      
                      <div className="text-left space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Arquivo</p>
                        <p className="text-sm font-bold truncate text-foreground">{file.name}</p>
                      </div>
                      <div className="text-left space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Formato</p>
                        <p className="text-sm font-bold text-foreground uppercase">{file.name.split('.').pop()}</p>
                      </div>
                      <div className="text-left space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tamanho</p>
                        <p className="text-sm font-bold text-foreground">
                          {file.size / 1024 > 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${(file.size / 1024).toFixed(2)} KB`}
                        </p>
                      </div>
                      <div className="text-left space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total de Abas</p>
                        <p className="text-sm font-bold text-foreground">{workbook?.SheetNames.length || 0} abas encontradas</p>
                      </div>
                      
                      <div className="text-left col-span-2 pt-4 border-t">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Lista de Abas</p>
                        <div className="flex flex-wrap gap-2">
                          {workbook?.SheetNames.slice(0, 5).map((name, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] py-0.5">{name}</Badge>
                          ))}
                          {workbook?.SheetNames && workbook.SheetNames.length > 5 && (
                            <span className="text-[10px] text-muted-foreground font-medium self-center">+{workbook.SheetNames.length - 5} mais...</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-10 flex gap-4 w-full justify-center">
                      <Button variant="outline" onClick={() => reset()} className="gap-2 px-6">
                        <X className="h-4 w-4" /> Trocar arquivo
                      </Button>
                      <Button onClick={() => setStep('sheets')} className="gap-2 px-10 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                        Continuar para Abas <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'sheets' && workbook && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Arquivo carregado</p>
                    <p className="text-base font-bold text-foreground">{file?.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {(file?.size || 0) / 1024 > 1024 ? `${((file?.size || 0) / (1024 * 1024)).toFixed(2)} MB` : `${((file?.size || 0) / 1024).toFixed(2)} KB`} • {workbook?.SheetNames.length || 0} abas encontradas
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('select')} className="text-xs h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5 hover:border-destructive/30 transition-all font-bold uppercase tracking-wider">
                  Remover e trocar
                </Button>
              </div>

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
                                  {detectedHeaders.map((h, i) => (
                                    <SelectItem key={i} value={h}>{h}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {mapping?.excel && mapping.excel !== 'no_mapping' && mapping.isDate && (
                                <div className="flex flex-col gap-1.5 p-2 bg-muted/30 rounded-lg border border-border/50">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                      <Calendar className="h-3 w-3" /> Formato de origem
                                    </label>
                                    {(() => {
                                      const colIdx = detectedHeaders.indexOf(mapping.excel);
                                      if (colIdx === -1) return null;
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
                  {totalDetectedRows} registros detectados ({previewData.length} na prévia)
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
                              <div className="flex flex-col text-[10px] gap-1 max-w-[180px]">
                                <div className="flex flex-col gap-0.5 border-b border-muted pb-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground uppercase font-bold text-[9px]">Publicação:</span>
                                    <span className={`font-bold ${row.__errors?.data_abertura_edital ? 'text-destructive' : 'text-slate-700'}`}>
                                      {row.data_abertura_edital || '-'}
                                    </span>
                                  </div>
                                  {row.__info?.data_abertura_edital && !row.__errors?.data_abertura_edital && (
                                    <span className="text-[9px] text-green-600 font-medium leading-tight">✓ {row.__info.data_abertura_edital}</span>
                                  )}
                                  {row.__errors?.data_abertura_edital && (
                                    <span className="text-[9px] text-destructive font-bold leading-tight">⚠ {row.__errors.data_abertura_edital}</span>
                                  )}
                                </div>

                                <div className="flex flex-col gap-0.5 border-b border-muted pb-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground uppercase font-bold text-[9px]">Validade:</span>
                                    <span className={`font-bold ${row.__errors?.data_validade ? 'text-destructive' : 'text-slate-700'}`}>
                                      {row.data_validade || '-'}
                                    </span>
                                  </div>
                                  {row.__info?.data_validade && !row.__errors?.data_validade && (
                                    <span className="text-[9px] text-green-600 font-medium leading-tight">✓ {row.__info.data_validade}</span>
                                  )}
                                  {row.__errors?.data_validade && (
                                    <span className="text-[9px] text-destructive font-bold leading-tight">⚠ {row.__errors.data_validade}</span>
                                  )}
                                </div>

                                {row.data_convocacao && (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground uppercase font-bold text-[9px]">Convocação:</span>
                                      <span className={`font-bold ${row.__errors?.data_convocacao ? 'text-destructive' : 'text-slate-700'}`}>
                                        {row.data_convocacao}
                                      </span>
                                    </div>
                                    {row.__info?.data_convocacao && !row.__errors?.data_convocacao && (
                                      <span className="text-[9px] text-green-600 font-medium leading-tight">✓ {row.__info.data_convocacao}</span>
                                    )}
                                    {row.__errors?.data_convocacao && (
                                      <span className="text-[9px] text-destructive font-bold leading-tight">⚠ {row.__errors.data_convocacao}</span>
                                    )}
                                  </div>
                                )}
                                
                                {row.is_prorrogado && <Badge variant="outline" className="text-[8px] h-3.5 bg-blue-50 text-blue-700 border-blue-200 w-fit px-1">Prorrogado</Badge>}
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
            <div className="space-y-8 flex flex-col items-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-slate-900">Importação Concluída!</h2>
                <p className="text-muted-foreground max-w-sm">A base do banco de talentos foi atualizada com sucesso no sistema.</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl px-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total na Planilha</span>
                  <p className="text-2xl font-black text-slate-900">{importSummary.total_planilha}</p>
                  <p className="text-[9px] text-slate-400 mt-1">{importSummary.total_vazios} linhas vazias ignoradas</p>
                </div>
                
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 text-center flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Registros Lidos</span>
                  <p className="text-2xl font-black text-blue-700">{importSummary.total_lidos}</p>
                  <p className="text-[9px] text-blue-400 mt-1">Válidos para processamento</p>
                </div>

                <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100 text-center flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Importados</span>
                  <p className="text-2xl font-black text-green-700">{importSummary.total_novos}</p>
                  <p className="text-[9px] text-green-400 mt-1">Salvos no sistema</p>
                </div>

                <div className={`p-5 rounded-2xl border text-center flex flex-col justify-center ${importSummary.total_erros > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${importSummary.total_erros > 0 ? 'text-red-600' : 'text-slate-400'}`}>Falhas</span>
                  <p className={`text-2xl font-black ${importSummary.total_erros > 0 ? 'text-red-700' : 'text-slate-500'}`}>{importSummary.total_erros}</p>
                  <p className={`text-[9px] mt-1 ${importSummary.total_erros > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {importSummary.total_erros > 0 ? 'Campos obrigatórios ausentes' : 'Nenhuma falha crítica'}
                  </p>
                </div>
              </div>

              {importSummary.total_alertas_data > 0 && (
                <div className="w-full max-w-4xl px-4">
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 font-bold">Aviso de Datas</AlertTitle>
                    <AlertDescription className="text-amber-700 text-xs">
                      {importSummary.total_alertas_data} registros possuem datas que não puderam ser convertidas automaticamente. 
                      Estes registros <strong>foram importados</strong> com o valor original para evitar perda de dados, mas podem precisar de revisão manual no sistema.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="flex flex-col items-center gap-4 mt-4">
                <Button size="lg" className="px-16 rounded-full shadow-lg hover:shadow-xl transition-all h-12 text-base font-bold" onClick={() => onOpenChange(false)}>
                  Concluir e Ir para o Banco
                </Button>
                <p className="text-xs text-muted-foreground italic">Dica: Você pode filtrar por "data de importação" para conferir os novos registros.</p>
              </div>
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
          <span>Registros Detectados: <span className="text-white font-mono">{totalDetectedRows}</span></span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
