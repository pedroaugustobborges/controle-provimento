import { BancoTalentos } from '@/types/vaga';
import { parse, isAfter, addYears, isValid, format } from 'date-fns';

export interface CalculationResult {
  status: string;
  motivo: string;
  dataReferencia: string;
  debugGroup: 'Cadastro Reserva' | 'Convocados' | 'Prorrogados por "SIM"' | 'Prorrogados por data manual' | 'Prorrogados por status original' | 'Vencidos por validade normal' | 'Vencidos por prorrogação expirada' | 'Vencidos por status original';
}

function tryParseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  const iso = new Date(v);
  if (isValid(iso) && !isNaN(iso.getTime())) return iso;
  const br = parse(v, 'dd/MM/yyyy', new Date());
  if (isValid(br)) return br;
  const us = parse(v, 'MM/dd/yyyy', new Date());
  if (isValid(us)) return us;
  return null;
}

function isProrrogacaoDataManual(prorrogacao: string | undefined | null): boolean {
  if (!prorrogacao) return false;
  const v = prorrogacao.trim().toUpperCase();
  if (!v || v === 'SIM' || v === 'NÃO' || v === 'NAO' || v === 'N' || v === 'FALSE' || v === '0') return false;
  return tryParseDate(v) !== null;
}

function isProrrogacaoSim(prorrogacao: string | undefined | null): boolean {
  if (!prorrogacao) return false;
  return prorrogacao.trim().toUpperCase() === 'SIM';
}

export function calculateBancoStatus(banco: Partial<BancoTalentos>): CalculationResult {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const statusRef = (banco.status_original || banco.status || '').toUpperCase().trim();
  const prorrogacao = banco.prorrogacao || '';

  // 1. CONVOCADO
  if (statusRef === 'CONVOCADO') {
    return { status: 'CONVOCADO', motivo: 'Status original = CONVOCADO', dataReferencia: banco.data_convocacao || today, debugGroup: 'Convocados' };
  }

  // 2. PRORROGAÇÃO POR DATA MANUAL (prioridade sobre SIM)
  if (isProrrogacaoDataManual(prorrogacao)) {
    const dataManual = tryParseDate(prorrogacao);
    if (dataManual) {
      const vigente = isAfter(dataManual, now);
      return {
        status: vigente ? 'PRORROGADO' : 'VENCIDO',
        motivo: `Prorrogação por data manual: ${prorrogacao}`,
        dataReferencia: format(dataManual, 'yyyy-MM-dd'),
        debugGroup: vigente ? 'Prorrogados por data manual' : 'Vencidos por prorrogação expirada'
      };
    }
  }

  // 3. PRORROGAÇÃO POR "SIM"
  if (isProrrogacaoSim(prorrogacao) && banco.data_publicacao) {
    const dataPub = tryParseDate(banco.data_publicacao);
    if (dataPub) {
      const limite = addYears(dataPub, 1);
      const vigente = isAfter(limite, now);
      return {
        status: vigente ? 'PRORROGADO' : 'VENCIDO',
        motivo: `Prorrogação SIM (1 ano após publicação ${format(dataPub, 'dd/MM/yyyy')})`,
        dataReferencia: format(limite, 'yyyy-MM-dd'),
        debugGroup: vigente ? 'Prorrogados por "SIM"' : 'Vencidos por prorrogação expirada'
      };
    }
  }

  // 4. STATUS ORIGINAL = PRORROGADO (sem coluna prorrogacao preenchida)
  if (statusRef === 'PRORROGADO') {
    const dataVal = tryParseDate(banco.data_validade);
    if (dataVal) {
      const vigente = isAfter(dataVal, now);
      return {
        status: vigente ? 'PRORROGADO' : 'VENCIDO',
        motivo: `Status original PRORROGADO, validade ${format(dataVal, 'dd/MM/yyyy')}`,
        dataReferencia: format(dataVal, 'yyyy-MM-dd'),
        debugGroup: vigente ? 'Prorrogados por status original' : 'Vencidos por prorrogação expirada'
      };
    }
    return { status: 'PRORROGADO', motivo: 'Status original PRORROGADO (sem validade)', dataReferencia: today, debugGroup: 'Prorrogados por status original' };
  }

  // 5. STATUS ORIGINAL = VENCIDO
  if (statusRef === 'VENCIDO') {
    const dataVal = tryParseDate(banco.data_validade);
    if (dataVal && isAfter(dataVal, now)) {
      return { status: 'CADASTRO RESERVA', motivo: `Status era VENCIDO mas validade ${format(dataVal, 'dd/MM/yyyy')} ainda vigente`, dataReferencia: format(dataVal, 'yyyy-MM-dd'), debugGroup: 'Cadastro Reserva' };
    }
    return { status: 'VENCIDO', motivo: 'Status original VENCIDO confirmado', dataReferencia: dataVal ? format(dataVal, 'yyyy-MM-dd') : today, debugGroup: 'Vencidos por status original' };
  }

  // 6. CADASTRO RESERVA com is_prorrogado=true (legado)
  if (banco.is_prorrogado && banco.data_validade) {
    const dataVal = tryParseDate(banco.data_validade);
    if (dataVal) {
      const vigente = isAfter(dataVal, now);
      return {
        status: vigente ? 'PRORROGADO' : 'VENCIDO',
        motivo: `Flag is_prorrogado=true, validade ${format(dataVal, 'dd/MM/yyyy')}`,
        dataReferencia: format(dataVal, 'yyyy-MM-dd'),
        debugGroup: vigente ? 'Prorrogados por status original' : 'Vencidos por prorrogação expirada'
      };
    }
  }

  // 7. CADASTRO RESERVA - VALIDADE NORMAL
  const dataVal = tryParseDate(banco.data_validade);
  if (dataVal) {
    const vigente = isAfter(dataVal, now);
    return {
      status: vigente ? 'CADASTRO RESERVA' : 'VENCIDO',
      motivo: vigente ? 'Validade normal vigente' : `Validade ${format(dataVal, 'dd/MM/yyyy')} expirada`,
      dataReferencia: format(dataVal, 'yyyy-MM-dd'),
      debugGroup: vigente ? 'Cadastro Reserva' : 'Vencidos por validade normal'
    };
  }

  // FALLBACK
  return { status: statusRef || 'INDETERMINADO', motivo: 'Sem dados suficientes para cálculo', dataReferencia: today, debugGroup: 'Cadastro Reserva' };
}

export interface AuditStats {
  'Cadastro Reserva': number;
  'Convocados': number;
  'Prorrogados por "SIM"': number;
  'Prorrogados por data manual': number;
  'Prorrogados por status original': number;
  'Vencidos por validade normal': number;
  'Vencidos por prorrogação expirada': number;
  'Vencidos por status original': number;
  'Total Cadastro Reserva': number;
  'Total Convocados': number;
  'Total Prorrogados': number;
  'Total Vencidos': number;
}

export function calculateStats(bancos: Partial<BancoTalentos>[]): AuditStats {
  const stats: AuditStats = {
    'Cadastro Reserva': 0, 'Convocados': 0,
    'Prorrogados por "SIM"': 0, 'Prorrogados por data manual': 0, 'Prorrogados por status original': 0,
    'Vencidos por validade normal': 0, 'Vencidos por prorrogação expirada': 0, 'Vencidos por status original': 0,
    'Total Cadastro Reserva': 0, 'Total Convocados': 0, 'Total Prorrogados': 0, 'Total Vencidos': 0,
  };

  bancos.forEach(b => {
    const result = calculateBancoStatus(b);
    stats[result.debugGroup]++;
    const s = result.status.toUpperCase();
    if (s === 'CADASTRO RESERVA') stats['Total Cadastro Reserva']++;
    else if (s === 'CONVOCADO') stats['Total Convocados']++;
    else if (s === 'PRORROGADO') stats['Total Prorrogados']++;
    else if (s === 'VENCIDO') stats['Total Vencidos']++;
  });

  return stats;
}
