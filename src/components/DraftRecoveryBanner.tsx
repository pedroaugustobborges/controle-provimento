import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  count: number;
  onRecover: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryBanner({ count, onRecover, onDiscard }: Props) {
  if (count <= 0) return null;
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p className="text-sm font-semibold">
          {count === 1
            ? 'Encontramos 1 alteração não salva da sua sessão anterior.'
            : `Encontramos ${count} alterações não salvas da sua sessão anterior.`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onDiscard} className="h-8 text-xs">
          <X className="h-3.5 w-3.5 mr-1" /> Descartar
        </Button>
        <Button size="sm" onClick={onRecover} className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white">
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Recuperar
        </Button>
      </div>
    </div>
  );
}
