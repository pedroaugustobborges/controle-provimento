
import { normalizeUnitName, filterByRegionAndUnit, UNIDADES_POR_REGIAO } from './src/lib/vagaUtils';

const mockBancos = [
  { unidade: 'CHS', status: 'CADASTRO RESERVA' },
  { unidade: 'HMSA', status: 'CADASTRO RESERVA' },
  { unidade: 'HRD', status: 'CADASTRO RESERVA' },
  { unidade: 'HRC', status: 'CADASTRO RESERVA' },
  { unidade: 'HUGOL', status: 'CADASTRO RESERVA' }
];

console.log('UNIDADES_POR_REGIAO:', UNIDADES_POR_REGIAO);

const filtered = filterByRegionAndUnit(mockBancos, 'Outras unidades', 'all');
console.log('Filtered for "Outras unidades":', filtered);

const filteredAll = filterByRegionAndUnit(mockBancos, 'all', 'all');
console.log('Filtered for "all":', filteredAll);
