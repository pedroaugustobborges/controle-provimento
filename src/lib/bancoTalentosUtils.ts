import { BancoTalentos } from '@/types/vaga';
import { parse, isAfter, addYears, isValid, format } from 'date-fns';

export interface CalculationResult {
  status: string;
  motivo: string;
  dataReferencia: string;
  debugGroup: 'Cadastro Reserva' | 'Convocados' | 'Prorrogados por "SIM"' | 'Prorrogados por data manual' | 'Vencidos por validade normal' | 'Vencidos por prorrogação expirada';
}

export function calculateBancoStatus(banco: Partial<BancoTalentos>): CalculationResult {
  const now = new Date();
  const statusOriginal = (banco.status || banco.status_original || '').toUpperCase();
  
  // 1. Status Convocado
  if (statusOriginal === 'CONVOCADO') {
    return {
      status: 'CONVOCADO',
      motivo: 'Registro já estava com status CONVOCADO',
      dataReferencia: banco.data_convocacao || format(now, 'yyyy-MM-dd'),
      debugGroup: 'Convocados'
    };
  }

  // 2. Prorrogação por data manual (Prioridade sobre "SIM")
  const prorrogacao = (banco.prorrogacao || '').trim().toUpperCase();
  const isDataManual = prorrogacao !== 'SIM' && prorrogacao !== '' && prorrogacao !== 'NÃO' && prorrogacao !== 'NAO';
  
  if (statusOriginal === 'CADASTRO RESERVA' && isDataManual) {
    // Tentar converter prorrogacao em data
    let dataManual: Date | null = null;
    const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy'];
    
    for (const f of formats) {
      const parsed = parse(prorrogacao.toLowerCase(), f, new Date());
      if (isValid(parsed)) {
        dataManual = parsed;
        break;
      }
    }

    if (dataManual) {
      const isVigente = isAfter(dataManual, now);
      return {
        status: isVigente ? 'prorrogado' : 'VENCIDO',
        motivo: `Prorrogação por data manual: ${prorrogacao}`,
        dataReferencia: format(dataManual, 'yyyy-MM-dd'),
        debugGroup: isVigente ? 'Prorrogados por data manual' : 'Vencidos por prorrogação expirada'
      };
    }
  }

  // 3. Prorrogação por "SIM"
  if (statusOriginal === 'CADASTRO RESERVA' && prorrogacao === 'SIM' && banco.data_publicacao) {
    const dataPublicacao = new Date(banco.data_publicacao);
    if (isValid(dataPublicacao)) {
      const dataProrrogacao = addYears(dataPublicacao, 1);
      const isVigente = isAfter(dataProrrogacao, now);
      return {
        status: isVigente ? 'prorrogado' : 'VENCIDO',
        motivo: 'Prorrogação por "SIM" (1 ano após publicação)',
        dataReferencia: format(dataProrrogacao, 'yyyy-MM-dd'),
        debugGroup: isVigente ? 'Prorrogados por "SIM"' : 'Vencidos por prorrogação expirada'
      };
    }
  }

  // 4. Cadastro Reserva sem prorrogação (Validade Normal)
  if (statusOriginal === 'CADASTRO RESERVA' && banco.data_validade) {
    const dataValidade = new Date(banco.data_validade);
    if (isValid(dataValidade)) {
      const isVigente = isAfter(dataValidade, now);
      return {
        status: isVigente ? 'CADASTRO RESERVA' : 'VENCIDO',
        motivo: 'Validade normal do edital',
        dataReferencia: format(dataValidade, 'yyyy-MM-dd'),
        debugGroup: isVigente ? 'Cadastro Reserva' : 'Vencidos por validade normal'
      };
    }
  }

  // Fallback
  return {
    status: statusOriginal === 'CADASTRO RESERVA' ? 'CADASTRO RESERVA' : (statusOriginal || 'nenhum'),
    motivo: 'Regra padrão / Fallback',
    dataReferencia: banco.data_validade || format(now, 'yyyy-MM-dd'),
    debugGroup: statusOriginal === 'CADASTRO RESERVA' ? 'Cadastro Reserva' : 'Vencidos por validade normal'
  };
}

export function calculateStats(bancos: BancoTalentos[]) {
  const stats = {
    'Cadastro Reserva': 0,
    'Convocados': 0,
    'Prorrogados por "SIM"': 0,
    'Prorrogados por data manual': 0,
    'Vencidos por validade normal': 0,
    'Vencidos por prorrogação expirada': 0,
    // Totais Consolidados
    'Total Cadastro Reserva': 0,
    'Total Convocados': 0,
    'Total Prorrogados': 0,
    'Total Vencidos': 0
  };

  bancos.forEach(b => {
    const result = calculateBancoStatus(b);
    stats[result.debugGroup]++;
    
    // Agrupamento consolidado
    if (result.status === 'CADASTRO RESERVA') stats['Total Cadastro Reserva']++;
    else if (result.status === 'CONVOCADO') stats['Total Convocados']++;
    else if (result.status === 'prorrogado') stats['Total Prorrogados']++;
    else if (result.status === 'VENCIDO') stats['Total Vencidos']++;
  });

  return stats;
}
