
import { normalizeUnitName, getRegionForUnit, filterByRegionAndUnit } from './src/lib/vagaUtils.ts';

const mockVagas = [
  { unidade: 'HDS', cargo: 'Vaga 1' },
  { unidade: 'CHS', cargo: 'Vaga 2' },
  { unidade: 'UNIDADE DESCONHECIDA', cargo: 'Vaga 3' }
];

console.log('--- TEST 1: All regions ---');
const res1 = filterByRegionAndUnit(mockVagas, 'all', 'all');
console.log('Result 1 (length):', res1.length);
console.log('Result 1 units:', res1.map(v => v.unidade));

console.log('\n--- TEST 2: Goiás e Vitória ---');
const res2 = filterByRegionAndUnit(mockVagas, 'Goiás e Vitória', 'all');
console.log('Result 2 (length):', res2.length);
console.log('Result 2 units:', res2.map(v => v.unidade));

console.log('\n--- TEST 3: Outras unidades ---');
const res3 = filterByRegionAndUnit(mockVagas, 'Outras unidades', 'all');
console.log('Result 3 (length):', res3.length);
console.log('Result 3 units:', res3.map(v => v.unidade));
