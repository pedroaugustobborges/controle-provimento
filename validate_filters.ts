
import { normalizeUnitName, getRegionForUnit, filterByRegionAndUnit, getValidVacancyBase } from './src/lib/vagaUtils.ts';

async function run() {
    const { supabase } = await import('./src/integrations/supabase/client.ts');
    
    const { data: allVagas } = await supabase.from('vagas').select('*');
    const { data: allBancos } = await supabase.from('banco_candidatos').select('*');
    
    if (!allVagas || !allBancos) return;

    const testScenario = (region, units) => {
        const filteredVagas = filterByRegionAndUnit(allVagas, region, units[0]);
        const validVagas = getValidVacancyBase(filteredVagas, 'TODOS', 'TODOS');
        
        const filteredBancos = filterByRegionAndUnit(allBancos, region, units[0]);
        
        return {
            vagasCount: validVagas.length,
            bancosCount: filteredBancos.length,
            units: [...new Set(validVagas.map(v => normalizeUnitName(v.unidade)))],
            bancoUnits: [...new Set(filteredBancos.map(b => normalizeUnitName(b.unidade)))]
        };
    };

    console.log('--- SCENARIO 1: Todas as regiões ---');
    const res1 = testScenario('all', ['all']);
    console.log('Vagas:', res1.vagasCount);
    console.log('Bancos:', res1.bancosCount);
    console.log('Unique Units (Vagas):', res1.units.length);
    console.log('Unique Units (Bancos):', res1.bancoUnits.length);

    console.log('\n--- SCENARIO 2: Goiás e Vitória ---');
    const res2 = testScenario('Goiás e Vitória', ['all']);
    console.log('Vagas:', res2.vagasCount);
    console.log('Bancos:', res2.bancosCount);
    console.log('Unique Units (Vagas):', res2.units.length);

    console.log('\n--- SCENARIO 3: Outras unidades ---');
    const res3 = testScenario('Outras unidades', ['all']);
    console.log('Vagas:', res3.vagasCount);
    console.log('Bancos:', res3.bancosCount);
    console.log('Unique Units (Vagas):', res3.units.length);
    console.log('Unique Units (Bancos):', res3.bancoUnits.length);
}

run();
