import { useState, useMemo } from 'react';
import { Check, Search, Building2, X, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Data ──────────────────────────────────────────────────────────────────────

export const UNIDADES_GRUPOS: { label: string; color: string; dot: string; units: string[] }[] = [
  {
    label: 'Goiás e Espírito Santo',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    units: [
      'CRER', 'HUGOL', 'HECAD', 'HDS', 'AGIR',
      'TEIA GOIÂNIA', 'TEIA ANÁPOLIS', 'TEIA APARECIDA', 'TEIA CANEDO',
      'SUÁ', 'SÃO PEDRO', 'JATAÍ', 'POLICLÍNICA', 'VITÓRIA',
    ],
  },
  {
    label: 'Outras Unidades',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
    units: [
      'HRD', 'HRC', 'HRCAC I', 'HRCAC II', 'HMSA',
      'TEIA CEN', 'TEIA PIN', 'CHS',
      'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3',
    ],
  },
];

export const ALL_UNIDADES: string[] = UNIDADES_GRUPOS.flatMap(g => g.units);

// ── Component ────────────────────────────────────────────────────────────────

interface UnidadesPickerProps {
  value: string[];
  onChange: (units: string[]) => void;
}

export function UnidadesPicker({ value, onChange }: UnidadesPickerProps) {
  const [search, setSearch] = useState('');

  const filteredGrupos = useMemo(() => {
    if (!search.trim()) return UNIDADES_GRUPOS;
    const q = search.toLowerCase();
    return UNIDADES_GRUPOS.map(g => ({
      ...g,
      units: g.units.filter(u => u.toLowerCase().includes(q)),
    })).filter(g => g.units.length > 0);
  }, [search]);

  const toggle = (unit: string) => {
    onChange(
      value.includes(unit) ? value.filter(u => u !== unit) : [...value, unit]
    );
  };

  const selectAll = () => onChange([...ALL_UNIDADES]);
  const clearAll = () => onChange([]);

  const allSelected = value.length === ALL_UNIDADES.length;
  const noneSelected = value.length === 0;

  return (
    <div className="space-y-3">
      {/* Header row: count + quick actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary/60" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Unidades com acesso
          </span>
          {value.length > 0 && (
            <Badge className="h-5 px-1.5 text-[10px] font-black bg-primary text-white border-0 rounded-full">
              {value.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 text-[11px] font-bold px-2 rounded-lg transition-colors',
              allSelected
                ? 'bg-primary/10 text-primary hover:bg-primary/15'
                : 'text-slate-500 hover:bg-slate-100'
            )}
            onClick={selectAll}
          >
            <Check className="h-3 w-3 mr-1" />
            Todas
          </Button>
          {!noneSelected && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] font-bold px-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              onClick={clearAll}
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <Input
          type="text"
          placeholder="Buscar unidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm bg-white border-slate-200 focus-visible:ring-primary/30 rounded-xl"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Unit grid */}
      <div className="max-h-[260px] overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
        {filteredGrupos.length === 0 && (
          <p className="text-center text-xs text-slate-400 italic py-6">
            Nenhuma unidade encontrada para "{search}"
          </p>
        )}
        {filteredGrupos.map(grupo => (
          <div key={grupo.label} className="space-y-2">
            {/* Region label */}
            <div className="flex items-center gap-2">
              <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', grupo.dot)} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {grupo.label}
              </span>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] text-slate-400 font-medium">
                {grupo.units.filter(u => value.includes(u)).length}/{grupo.units.length}
              </span>
              <button
                type="button"
                className="text-[10px] font-bold text-primary/70 hover:text-primary transition-colors"
                onClick={() => {
                  const allGrpSelected = grupo.units.every(u => value.includes(u));
                  if (allGrpSelected) {
                    onChange(value.filter(u => !grupo.units.includes(u)));
                  } else {
                    onChange([...new Set([...value, ...grupo.units])]);
                  }
                }}
              >
                {grupo.units.every(u => value.includes(u)) ? 'Desmarcar' : 'Todas'}
              </button>
            </div>

            {/* Chip grid */}
            <div className="flex flex-wrap gap-1.5">
              {grupo.units.map(unit => {
                const selected = value.includes(unit);
                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => toggle(unit)}
                    className={cn(
                      'relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-150 select-none',
                      selected
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20 scale-[1.02]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                    )}
                  >
                    {selected && <Check className="h-3 w-3 shrink-0" />}
                    {unit}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer summary */}
      {value.length > 0 && (
        <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 8).map(u => (
              <span key={u} className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {u}
                <button type="button" onClick={() => toggle(u)} className="hover:text-red-500 transition-colors">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {value.length > 8 && (
              <span className="inline-flex items-center bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                +{value.length - 8} mais
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
