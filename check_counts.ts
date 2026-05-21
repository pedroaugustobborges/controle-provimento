
import { normalizeUnitName, getRegionForUnit } from './src/lib/vagaUtils.ts';

async function run() {
    const { supabase } = await import('./src/integrations/supabase/client.ts');
    
    const { data: vagas } = await supabase.from('vagas').select('unidade');
    const { data: bancos } = await supabase.from('banco_candidatos').select('unidade');
    
    const regions = new Map();
    
    vagas?.forEach(v => {
        const region = getRegionForUnit(v.unidade);
        regions.set(region, (regions.get(region) || 0) + 1);
    });
    
    console.log('--- Vagas by Region ---');
    console.log(Object.fromEntries(regions));
    
    regions.clear();
    bancos?.forEach(b => {
        const region = getRegionForUnit(b.unidade);
        regions.set(region, (regions.get(region) || 0) + 1);
    });
    
    console.log('--- Bancos by Region ---');
    console.log(Object.fromEntries(regions));
}

run();
