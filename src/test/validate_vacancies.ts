import { mockVagas } from '../data/mockData';
import { countVacancies } from '../lib/vagaUtils';

function runValidation() {
  console.log('--- START VACANCY COUNT VALIDATION ---');
  
  // Test Case 1: Selected unit: CRER, Selected month: TODOS
  const case1 = countVacancies({
    records: mockVagas,
    selectedUnit: 'CRER',
    selectedMonth: 'TODOS'
  });
  
  // In mock data:
  // ID 4: CRER, cargo 'Fisioterapeuta' -> YES
  // ID 8: CRER, cargo 'Auxiliar Administrativo' -> YES
  // ID 9: CRER, cargo '' -> NO (empty cargo)
  // ID 10: CRER, cargo 'Enfermeiro' -> YES
  // Expected: 3
  
  console.log('Selected unit: CRER');
  console.log('Selected month: TODOS');
  console.log('Expected count: 3');
  console.log(`Platform count: ${case1}`);
  console.log(case1 === 3 ? '✅ MATCH' : '❌ MISMATCH');
  console.log('-----------------------------------');

  // Test Case 2: Selected unit: CRER, Selected month: MARÇO
  const case2 = countVacancies({
    records: mockVagas,
    selectedUnit: 'CRER',
    selectedMonth: 'MARÇO'
  });
  
  // In mock data:
  // ID 4: CRER, cargo 'Fisioterapeuta', date '2025-02-10' (FEVEREIRO) -> NO
  // ID 8: CRER, cargo 'Auxiliar Administrativo', date '2025-03-05' (MARÇO) -> YES
  // ID 9: CRER, cargo '', date '2025-03-10' (MARÇO) -> NO (empty cargo)
  // ID 10: CRER, cargo 'Enfermeiro', date '2025-03-15' (MARÇO) -> YES
  // Expected: 2
  
  console.log('Selected unit: CRER');
  console.log('Selected month: MARÇO');
  console.log('Expected count: 2');
  console.log(`Platform count: ${case2}`);
  console.log(case2 === 2 ? '✅ MATCH' : '❌ MISMATCH');
  console.log('-----------------------------------');

  // Test Case 3: All units (TODOS), Selected month: FEVEREIRO
  const case3 = countVacancies({
    records: mockVagas,
    selectedUnit: 'TODOS',
    selectedMonth: 'FEVEREIRO'
  });
  
  // In mock data:
  // ID 1: Hospital Central (GO), date '2025-01-15' -> NO
  // ID 2: Hospital das Clínicas, date '2025-02-03' -> YES
  // ID 3: Hospital Central (GO), date '2025-01-20' -> NO
  // ID 4: CRER, date '2025-02-10' -> YES
  // ID 5: JATAÍ, date '2025-02-15' -> YES
  // ID 6: VITÓRIA, date '2025-02-18' -> YES
  // ID 7: Teia Canedo, date '2025-02-20' -> YES
  // Expected: 5
  
  console.log('Selected unit: TODOS');
  console.log('Selected month: FEVEREIRO');
  console.log('Expected count: 5');
  console.log(`Platform count: ${case3}`);
  console.log(case3 === 5 ? '✅ MATCH' : '❌ MISMATCH');
  console.log('--- END VACANCY COUNT VALIDATION ---');
}

runValidation();
