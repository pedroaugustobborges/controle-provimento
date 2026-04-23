import { Check, Loader2, AlertTriangle, CloudOff, Pencil } from 'lucide-react';
import type { SaveStatus } from '@/hooks/useAutoSave';
import { cn } from '@/lib/utils';

interface Props {
  status: SaveStatus;
  className?: string;
  pendingCount?: number;
}

export function SaveStatusIndicator({ status, className, pendingCount = 0 }: Props) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  if (offline || pendingCount > 0) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-warning', className)}>
        <CloudOff className="h-3.5 w-3.5" />
        {offline ? 'Offline' : `${pendingCount} pendente(s)`} — salvarei quando voltar
      </span>
    );
  }

  switch (status) {
    case 'saving':
      return (
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground', className)}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…
        </span>
      );
    case 'saved':
      return (
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-success', className)}>
          <Check className="h-3.5 w-3.5" /> Salvo
        </span>
      );
    case 'error':
      return (
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600', className)}>
          <AlertTriangle className="h-3.5 w-3.5" /> Erro — tentando novamente
        </span>
      );
    case 'dirty':
      return (
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-primary', className)}>
          <Pencil className="h-3.5 w-3.5" /> Editando…
        </span>
      );
    default:
      return null;
  }
}
