import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from 'lucide-react';

export type EntrevistaTipo = 'unica' | 'duas_datas' | 'periodo';

export interface EntrevistaConfig {
  tipo: EntrevistaTipo;
  datas: string[]; // ISO yyyy-mm-dd
}

interface Props {
  value: EntrevistaConfig;
  onChange: (next: EntrevistaConfig) => void;
  /** Classe extra para os inputs (ex.: bg-white) */
  inputClassName?: string;
  /** Label do bloco (default: "Entrevistas") */
  label?: string;
}

export function EntrevistaDateField({ value, onChange, inputClassName = 'bg-white', label = 'Entrevistas' }: Props) {
  const tipo = value?.tipo ?? 'unica';
  const datas = value?.datas ?? [];

  const setTipo = (novoTipo: EntrevistaTipo) => {
    let novasDatas = [...datas];
    if (novoTipo === 'unica') novasDatas = novasDatas.slice(0, 1);
    else if (novasDatas.length < 2) novasDatas = [...novasDatas, '', ''].slice(0, 2);
    else novasDatas = novasDatas.slice(0, 2);
    onChange({ tipo: novoTipo, datas: novasDatas });
  };

  const setDataAt = (idx: number, val: string) => {
    const arr = [...datas];
    while (arr.length <= idx) arr.push('');
    arr[idx] = val;
    onChange({ tipo, datas: arr });
  };

  return (
    <div className="space-y-2 col-span-1 sm:col-span-2 p-3 rounded-md border border-amber-200 bg-amber-50/40">
      <div className="flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-amber-700" />
        <Label className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">{label}</Label>
      </div>

      <RadioGroup
        value={tipo}
        onValueChange={(v) => setTipo(v as EntrevistaTipo)}
        className="flex flex-wrap gap-3"
      >
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <RadioGroupItem value="unica" id="entrevista-unica" />
          <span>Data única</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <RadioGroupItem value="duas_datas" id="entrevista-duas" />
          <span>Duas datas</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <RadioGroupItem value="periodo" id="entrevista-periodo" />
          <span>Período</span>
        </label>
      </RadioGroup>

      {tipo === 'unica' && (
        <Input
          type="date"
          value={datas[0] || ''}
          onChange={(e) => setDataAt(0, e.target.value)}
          className={inputClassName}
        />
      )}

      {tipo === 'duas_datas' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase">Dia 1</Label>
            <Input
              type="date"
              value={datas[0] || ''}
              onChange={(e) => setDataAt(0, e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase">Dia 2</Label>
            <Input
              type="date"
              value={datas[1] || ''}
              onChange={(e) => setDataAt(1, e.target.value)}
              className={inputClassName}
            />
          </div>
        </div>
      )}

      {tipo === 'periodo' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase">Início</Label>
            <Input
              type="date"
              value={datas[0] || ''}
              onChange={(e) => setDataAt(0, e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase">Fim</Label>
            <Input
              type="date"
              value={datas[1] || ''}
              onChange={(e) => setDataAt(1, e.target.value)}
              className={inputClassName}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Helper: deriva config a partir do valor antigo (string ISO) + opcional config existente */
export function deriveEntrevistaConfig(
  legacyDate: string | undefined,
  saved: EntrevistaConfig | undefined
): EntrevistaConfig {
  if (saved && Array.isArray(saved.datas) && saved.tipo) return saved;
  return { tipo: 'unica', datas: [legacyDate || ''] };
}

/** Helper: para compatibilidade, retorna a 1ª data da config (para preencher data_entrevistas) */
export function primaryEntrevistaDate(cfg: EntrevistaConfig | undefined): string {
  if (!cfg) return '';
  return cfg.datas?.[0] || '';
}
