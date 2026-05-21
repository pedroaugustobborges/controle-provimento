import { supabase } from "@/integrations/supabase/client";
import { format, addDays, subDays, isWeekend, parseISO, isSameDay } from "date-fns";

export interface Holiday {
  date: string;
  name: string;
  type: 'national' | 'municipal' | 'estadual';
}

const nationalHolidaysCache: Record<number, Holiday[]> = {};

export const UNIT_LOCATION_MAP: Record<string, { city: string; state: string }> = {
  'HECAD': { city: 'Goiânia', state: 'GO' },
  'CRER': { city: 'Goiânia', state: 'GO' },
  'AGIR': { city: 'Goiânia', state: 'GO' },
  'HUGOL': { city: 'Goiânia', state: 'GO' },
  'HDS': { city: 'Goiânia', state: 'GO' },
  'TEIA GOIÂNIA': { city: 'Goiânia', state: 'GO' },
  'POLICLÍNICA': { city: 'Goiânia', state: 'GO' },
  'JATAÍ': { city: 'Jataí', state: 'GO' },
  'TEIA APARECIDA': { city: 'Aparecida de Goiânia', state: 'GO' },
  'TEIA CANEDO': { city: 'Senador Canedo', state: 'GO' },
  'TEIA ANÁPOLIS': { city: 'Anápolis', state: 'GO' },
  'SUÁ': { city: 'Vitória', state: 'ES' },
  'SÃO PEDRO': { city: 'Vitória', state: 'ES' },
  'VITÓRIA': { city: 'Vitória', state: 'ES' },
};

async function fetchNationalHolidays(year: number): Promise<Holiday[]> {
  if (nationalHolidaysCache[year]) return nationalHolidaysCache[year];

  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
    if (!response.ok) throw new Error('Failed to fetch national holidays');
    const data = await response.json();
    const holidays = data.map((h: any) => ({
      date: h.date,
      name: h.name,
      type: 'national'
    }));
    nationalHolidaysCache[year] = holidays;
    return holidays;
  } catch (error) {
    console.error('Error fetching national holidays:', error);
    return [];
  }
}

async function fetchLocalHolidays(city: string, state: string, year: number): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from('feriados_locais')
    .select('*')
    .eq('estado', state)
    .or(`cidade.eq.${city},tipo.eq.estadual`)
    .gte('data', `${year}-01-01`)
    .lte('data', `${year}-12-31`);

  if (error) {
    console.error('Error fetching local holidays:', error);
    return [];
  }

  return data.map(h => ({
    date: h.data,
    name: h.nome,
    type: h.tipo as any
  }));
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  holidayName?: string;
  conflictType?: 'holiday' | 'eve' | 'day_after';
}

export async function validateDate(dateStr: string, unitName: string): Promise<ValidationResult> {
  if (!dateStr) return { isValid: true };

  const date = parseISO(dateStr);
  const year = date.getFullYear();
  const location = UNIT_LOCATION_MAP[unitName.toUpperCase()] || { city: '', state: '' };

  const nationalHolidays = await fetchNationalHolidays(year);
  const localHolidays = location.city ? await fetchLocalHolidays(location.city, location.state, year) : [];
  
  const allHolidays = [...nationalHolidays, ...localHolidays];

  // Regra: feriados que caem em sábado ou domingo não devem disparar a trava
  const activeHolidays = allHolidays.filter(h => {
    const hDate = parseISO(h.date);
    return !isWeekend(hDate);
  });

  for (const holiday of activeHolidays) {
    const holidayDate = parseISO(holiday.date);

    // 1. Feriado em si
    if (isSameDay(date, holidayDate)) {
      return {
        isValid: false,
        holidayName: holiday.name,
        conflictType: 'holiday',
        message: `coincide com ${holiday.type === 'national' ? 'feriado nacional' : 'feriado municipal/estadual'}: ${holiday.name}`
      };
    }

    // 2. Véspera de feriado (dia útil imediatamente anterior)
    // Se o feriado é na segunda, a véspera é na sexta? User disse "dia útil imediatamente anterior".
    // "o dia útil (segunda a sexta) imediatamente anterior ao feriado"
    let eve = subDays(holidayDate, 1);
    while (isWeekend(eve)) {
      eve = subDays(eve, 1);
    }
    
    if (isSameDay(date, eve)) {
      return {
        isValid: false,
        holidayName: holiday.name,
        conflictType: 'eve',
        message: `é véspera de feriado: ${holiday.name}`
      };
    }

    // 3. Dia seguinte ao feriado (dia útil imediatamente posterior)
    let next = addDays(holidayDate, 1);
    while (isWeekend(next)) {
      next = addDays(next, 1);
    }

    if (isSameDay(date, next)) {
      return {
        isValid: false,
        holidayName: holiday.name,
        conflictType: 'day_after',
        message: `é dia posterior a feriado: ${holiday.name}`
      };
    }
  }

  return { isValid: true };
}
