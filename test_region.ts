
import { getRegionForUnit } from './src/lib/vagaUtils.ts';

console.log('Region for CHS:', getRegionForUnit('CHS'));
console.log('Region for HDS:', getRegionForUnit('HDS'));
console.log('Region for unknown:', getRegionForUnit('Some Random Unit'));
