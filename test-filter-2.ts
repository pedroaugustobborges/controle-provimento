
import { normalizeUnitName, filterByRegionAndUnit, UNIDADES_POR_REGIAO } from './src/lib/vagaUtils';

const mockBancos = [
  { unidade: 'CHS', status: 'CADASTRO RESERVA' },
  { unidade: 'HMSA', status: 'CADASTRO RESERVA' },
  { unidade: 'HRD', status: 'CADASTRO RESERVA' },
  { unidade: 'HRC', status: 'CADASTRO RESERVA' },
  { unidade: 'HUGOL', status: 'CADASTRO RESERVA' }
];

const region = 'Outras unidades';
const regionUpper = String(region).toUpperCase();
const matchingKey = Object.keys(UNIDADES_POR_REGIAO).find(k => k.toUpperCase() === regionUpper);
const unitsInRegion = matchingKey ? UNIDADES_POR_REGIAO[matchingKey] : [];

console.log('matchingKey:', matchingKey);
console.log('unitsInRegion:', unitsInRegion);

const allowedUnits = new Set<string>();
unitsInRegion.forEach(u => {
  allowedUnits.add(normalizeUnitName(u));
});
console.log('allowedUnits:', Array.from(allowedUnits));

const filtered = filterByRegionAndUnit(mockBancos, 'Outras unidades', 'all');
console.log('Filtered for "Outras unidades":', filtered);
