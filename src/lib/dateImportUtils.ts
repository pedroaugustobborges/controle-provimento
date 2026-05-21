import { format, parse, isValid, addDays } from 'date-fns';

export type DateFormat = 'dd/MM/yyyy' | 'excel_serial' | 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'auto';

export interface DateConversionResult {
  date: Date | null;
  isValid: boolean;
  formatted: string; // ISO yyyy-MM-dd for internal storage
  display: string;   // Brasileiro dd/MM/yyyy for presentation
  formatUsed: string;
  isExcelSerial?: boolean;
}

/**
 * Converts an Excel serial number to a JS Date object.
 * Uses the 1899-12-30 base (Excel 1900 system).
 */
export function excelSerialToDate(serial: number): Date {
  // Excel incorrectly treats 1900 as a leap year, so we use 1899-12-30 as base
  return addDays(new Date(1899, 11, 30), serial);
}

/**
 * Analyzes a sample of values to detect the predominant date format in a column.
 */
export function detectColumnFormat(values: any[]): DateFormat {
  const samples = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '').slice(0, 50);
  if (samples.length === 0) return 'dd/MM/yyyy';

  const counts: Record<DateFormat, number> = {
    'dd/MM/yyyy': 0,
    'excel_serial': 0,
    'yyyy-MM-dd': 0,
    'MM/dd/yyyy': 0,
    'auto': 0
  };

  samples.forEach(val => {
    // Check if it's a number in the Excel serial range (~20,000 to ~60,000)
    const num = Number(val);
    if (!isNaN(num) && num > 20000 && num < 60000) {
      counts['excel_serial']++;
      return;
    }

    const str = String(val).trim();
    if (!str) return;

    // Check ISO (yyyy-MM-dd)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      counts['yyyy-MM-dd']++;
      return;
    }

    // Check dd/mm/aaaa or mm/dd/aaaa
    const parts = str.split(/[\/\-.]/);
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      if (p0 > 12 && p0 <= 31 && p1 <= 12) {
        // Definitely dd/mm/aaaa (day > 12)
        counts['dd/MM/yyyy']++;
      } else if (p1 > 12 && p1 <= 31 && p0 <= 12) {
        // Definitely mm/dd/aaaa (month > 12 is impossible for month, so it's day)
        counts['MM/dd/yyyy']++;
      } else if (p0 <= 12 && p1 <= 12) {
        // Ambiguous, but prioritize Brazilian (dd/mm/aaaa)
        counts['dd/MM/yyyy']++;
      }
    }
  });

  // Find the format with the most hits
  let bestFormat: DateFormat = 'dd/MM/yyyy';
  let maxCount = -1;

  // Order of priority in case of ties (as per requirement)
  const priority: DateFormat[] = ['dd/MM/yyyy', 'excel_serial', 'yyyy-MM-dd', 'MM/dd/yyyy'];
  
  priority.forEach(fmt => {
    if (counts[fmt] > maxCount) {
      maxCount = counts[fmt];
      bestFormat = fmt;
    }
  });

  return bestFormat;
}

/**
 * Converts a single value to a Date object and standardized strings.
 */
export function convertDateValue(value: any, targetFormat: DateFormat = 'auto'): DateConversionResult {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { date: null, isValid: true, formatted: '', display: '', formatUsed: 'Vazio' };
  }

  let d: Date | null = null;
  let isExcelSerial = false;
  let formatUsed = '';

  const numValue = typeof value === 'number' ? value : Number(value);
  const looksLikeExcelSerial = !isNaN(numValue) && numValue > 10000 && numValue < 100000;

  // 1. Try Excel Serial if specifically target serial or looks like one and format is auto
  if (targetFormat === 'excel_serial' || (targetFormat === 'auto' && looksLikeExcelSerial)) {
    d = excelSerialToDate(numValue);
    if (isValid(d)) {
      isExcelSerial = true;
      formatUsed = 'Serial Excel';
    } else {
      d = null;
    }
  }

  // 2. If it's already a Date object
  if (!d && value instanceof Date) {
    d = value;
    formatUsed = 'Objeto Date';
  }

  // 3. Try parsing string formats
  if (!d) {
    const str = String(value).trim();
    if (!str) return { date: null, isValid: true, formatted: '', display: '', formatUsed: 'Vazio' };

    // Regex para identificar se parece com dd/mm/aaaa
    const isBrazilianFormat = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(str);
    
    // Lista de formatos para tentar, priorizando dd/MM/yyyy se houver indicação
    let formatsToTry: string[] = [];
    if (targetFormat === 'auto') {
      if (isBrazilianFormat) {
        formatsToTry = ['dd/MM/yyyy', 'dd/MM/yy', 'dd-MM-yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'];
      } else {
        formatsToTry = ['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'dd-MM-yyyy'];
      }
    } else {
      formatsToTry = [targetFormat];
    }

    const cleaned = str.replace(/[\.-]/g, '/');
    
    for (const f of formatsToTry) {
      try {
        const normalizedF = f.replace(/[\.-]/g, '/');
        // Usamos parse da date-fns, mas precisamos normalizar o valor se tiver - ou .
        const parsed = parse(cleaned, normalizedF, new Date());
        if (isValid(parsed)) {
          const year = parsed.getFullYear();
          // Aceitamos anos entre 1900 e 2100 para ser razoável
          if (year > 1900 && year < 2100) {
            d = parsed;
            formatUsed = f;
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback nativo (menos confiável para dd/mm/aaaa mas bom para ISO)
    if (!d && isNaN(Number(str))) {
      const native = new Date(str);
      if (isValid(native)) {
        d = native;
        formatUsed = 'Nativo';
      }
    }
  }

  if (d && isValid(d)) {
    return {
      date: d,
      isValid: true,
      formatted: format(d, 'yyyy-MM-dd'),
      display: format(d, 'dd/MM/yyyy'),
      formatUsed: formatUsed === 'dd/MM/yyyy' ? 'dd/mm/aaaa (brasileiro)' : 
                 formatUsed === 'Serial Excel' ? 'serial Excel' :
                 formatUsed === 'yyyy-MM-dd' ? 'aaaa-mm-dd (ISO)' :
                 formatUsed === 'MM/dd/yyyy' ? 'mm/dd/aaaa (americano)' :
                 `Detectado: ${formatUsed}`,
      isExcelSerial
    };
  }

  return { 
    date: null, 
    isValid: false, 
    formatted: String(value), 
    display: String(value), 
    formatUsed: 'Inválido' 
  };
}

export const DATE_FORMAT_LABELS: Record<string, string> = {
  'dd/MM/yyyy': 'dd/mm/aaaa (brasileiro)',
  'excel_serial': 'serial Excel',
  'yyyy-MM-dd': 'aaaa-mm-dd (ISO)',
  'MM/dd/yyyy': 'mm/dd/aaaa (americano)',
  'auto': 'Auto-detectar'
};
