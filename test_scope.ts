
import { normalizeUnitName, getRegionForUnit, getCategoriaStatus, calcDiasAberto } from './src/lib/vagaUtils.ts';

const vagas = [
  { unidade: 'HDS', cargo: 'Vaga 1', status: 'EM ANDAMENTO' },
  { unidade: 'HUGOL', cargo: 'Vaga 2', status: 'EM ANDAMENTO' }
];

const filteredBancos = [
  { unidade: 'HDS', cargo: 'Banco 1', status: 'CADASTRO RESERVA' },
  { unidade: 'CHS', cargo: 'Banco 2', status: 'CADASTRO RESERVA' }
];

const unitMap = new Map();

const ensureEntry = (unitName) => {
  const normalizedUnit = normalizeUnitName(unitName);
  if (!normalizedUnit) return null;

  const existing = unitMap.get(normalizedUnit);
  if (existing) return existing;

  const created = {
    name: normalizedUnit,
    region: getRegionForUnit(normalizedUnit),
    vagas: 0,
    vagasAbertas: 0,
    bancos: 0,
    bancosDisponiveis: 0,
    pendencias: 0,
  };

  unitMap.set(normalizedUnit, created);
  return created;
};

vagas.forEach((vaga) => {
  const entry = ensureEntry(vaga.unidade);
  if (!entry) return;
  entry.vagas += 1;
  const categoria = getCategoriaStatus(vaga);
  if (categoria !== 'concluidas' && categoria !== 'vagas_interrompidas') {
    entry.vagasAbertas += 1;
  }
});

filteredBancos.forEach((banco) => {
  const entry = ensureEntry(banco.unidade);
  if (!entry) return;
  const status = String(banco.status || '').toUpperCase();
  entry.bancos += 1;
  if (status !== 'VENCIDO' && status !== 'CONVOCADO') {
    entry.bancosDisponiveis += 1;
  }
});

const strategicScopeByUnit = Array.from(unitMap.values())
  .map((entry) => ({
    ...entry,
    total: entry.vagas + entry.bancos,
    ativos: entry.vagasAbertas + entry.bancosDisponiveis,
  }))
  .filter((entry) => entry.total > 0 || entry.pendencias > 0);

console.log('--- TEST: strategicScopeByUnit ---');
strategicScopeByUnit.forEach(u => {
    console.log(`Unit: ${u.name}, Region: ${u.region}, Total: ${u.total}`);
});
