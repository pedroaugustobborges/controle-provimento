
import { normalizeUnitName, getRegionForUnit, filterByRegionAndUnit, getValidVacancyBase } from './src/lib/vagaUtils.ts';

async function run() {
    const { supabase } = await import('./src/integrations/supabase/client.ts');
    
    const { data: allVagas } = await supabase.from('vagas').select('*');
    const { data: allBancos } = await supabase.from('banco_candidatos').select('*');
    
    if (!allVagas || !allBancos) return;

    // Simulate Dashboard logic
    const filterDashboardRecords = (records, selectedRegion, selectedUnits) => {
        if (selectedRegion === 'all') {
            return records;
        }
        const regionFiltered = filterByRegionAndUnit(records, selectedRegion, 'all');
        const activeUnits = selectedUnits.filter((unit) => unit && unit !== 'all');
        if (activeUnits.length === 0) return regionFiltered;
        
        const matchedRecords = new Set();
        activeUnits.forEach((unit) => {
            filterByRegionAndUnit(regionFiltered, 'all', unit).forEach((record) => {
                matchedRecords.add(record);
            });
        });
        return regionFiltered.filter((record) => matchedRecords.has(record));
    };

    const testScenario = (region, units) => {
        const baseVagas = filterDashboardRecords(allVagas, region, units);
        const validVagas = getValidVacancyBase(baseVagas, 'TODOS', 'TODOS');
        
        const baseBancos = filterDashboardRecords(allBancos, region, units);
        
        return {
            vagasCount: validVagas.length,
            bancosCount: baseBancos.length,
            totalCount: validVagas.length + baseBancos.length
        };
    };

    console.log('--- TEST RESULTS ---');
    
    const res1 = testScenario('all', ['all']);
    console.log('Scenario: Todas as regiões');
    console.log(`- Vagas: ${res1.vagasCount}`);
    console.log(`- Bancos: ${res1.bancosCount}`);
    console.log(`- Total: ${res1.totalCount}`);

    const res2 = testScenario('Goiás e Vitória', ['all']);
    console.log('\nScenario: Goiás e Vitória');
    console.log(`- Vagas: ${res2.vagasCount}`);
    console.log(`- Bancos: ${res2.bancosCount}`);
    console.log(`- Total: ${res2.totalCount}`);

    const res3 = testScenario('Outras unidades', ['all']);
    console.log('\nScenario: Outras unidades');
    console.log(`- Vagas: ${res3.vagasCount}`);
    console.log(`- Bancos: ${res3.bancosCount}`);
    console.log(`- Total: ${res3.totalCount}`);
}

run();
