import { Play, Hourglass, XCircle, PauseCircle, BadgeCheck, Route, Milestone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { StatusProcesso } from '@/types/vaga';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface StatusConfig {
  bg: string;
  text: string;
  border: string;
  shadowColor: string;
  Icon: LucideIcon;
  label: string;
}

const STATUS_CONFIG: Record<StatusProcesso, StatusConfig> = {
  'Em Andamento': {
    bg: '#FEF3C7',
    text: '#B45309',
    border: '#FCD34D',
    shadowColor: 'rgba(252, 211, 77, 0.5)',
    Icon: Play,
    label: 'Em Andamento',
  },
  'Solicitada': {
    bg: '#DCFCE7',
    text: '#166534',
    border: '#86EFAC',
    shadowColor: 'rgba(134, 239, 172, 0.5)',
    Icon: Hourglass,
    label: 'Solicitada',
  },
  'Cancelada': {
    bg: '#FEE2E2',
    text: '#B91C1C',
    border: '#FCA5A5',
    shadowColor: 'rgba(252, 165, 165, 0.5)',
    Icon: XCircle,
    label: 'Cancelada',
  },
  'Suspensa': {
    bg: '#DBEAFE',
    text: '#1D4ED8',
    border: '#93C5FD',
    shadowColor: 'rgba(147, 197, 253, 0.5)',
    Icon: PauseCircle,
    label: 'Suspensa',
  },
  'Concluída': {
    bg: '#EDE9FE',
    text: '#6D28D9',
    border: '#C4B5FD',
    shadowColor: 'rgba(196, 181, 253, 0.5)',
    Icon: BadgeCheck,
    label: 'Concluída',
  },
};

interface Props {
  status?: StatusProcesso | string | null;
  tratativa?: string | null;
  etapa?: string | null;
}

function Badge({
  config,
  status,
}: {
  config: StatusConfig | undefined;
  status: string | null | undefined;
}) {
  if (!config) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 9999,
          fontSize: 13,
          fontWeight: 600,
          border: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          color: '#64748B',
          whiteSpace: 'nowrap',
          cursor: 'default',
        }}
        role="status"
        aria-label={`Status: ${status || 'Sem status'}`}
      >
        {status || 'Sem Status'}
      </span>
    );
  }

  const { bg, text, border, shadowColor, Icon, label } = config;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 9999,
        fontSize: 13,
        fontWeight: 600,
        border: `1px solid ${border}`,
        backgroundColor: bg,
        color: text,
        whiteSpace: 'nowrap',
        cursor: 'default',
        transition: 'box-shadow 200ms ease',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLSpanElement).style.boxShadow = `0 2px 10px ${shadowColor}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLSpanElement).style.boxShadow = 'none';
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLSpanElement).style.boxShadow = `0 0 0 2px ${border}`;
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLSpanElement).style.boxShadow = 'none';
      }}
      role="status"
      aria-label={`Status: ${label}`}
      tabIndex={0}
    >
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * Pill badge for StatusProcesso with optional hover card
 * disclosing Tratativa and Etapa details.
 * Shows only the badge at first glance — hover reveals workflow context.
 */
export function StatusProcessoBadge({ status, tratativa, etapa }: Props) {
  const config = status ? STATUS_CONFIG[status as StatusProcesso] : undefined;
  const hasDetails = !!(tratativa || etapa);

  if (!hasDetails) {
    return <Badge config={config} status={status} />;
  }

  const { bg, text, border, Icon, label } = config ?? {
    bg: '#F8FAFC',
    text: '#64748B',
    border: '#E2E8F0',
    Icon: Play,
    label: status || 'Sem Status',
  };

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        {/* wrapper needed so asChild can forward refs to the span */}
        <span style={{ display: 'inline-block', cursor: 'default' }}>
          <Badge config={config} status={status} />
        </span>
      </HoverCardTrigger>

      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-52 p-0 overflow-hidden shadow-xl border-0 rounded-xl"
        style={{ boxShadow: `0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px ${border}` }}
      >
        {/* ── Coloured header matching the status ─────────────────── */}
        <div
          style={{ background: bg, borderBottom: `1px solid ${border}` }}
          className="px-3 py-2.5 flex items-center gap-2"
        >
          <Icon size={13} style={{ color: text }} aria-hidden="true" />
          <span style={{ color: text }} className="text-[12px] font-bold tracking-wide">
            {label}
          </span>
        </div>

        {/* ── Detail rows ──────────────────────────────────────────── */}
        <div className="px-3 py-3 space-y-3 bg-white">
          {tratativa && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1">
                Tratativa
              </p>
              <div className="flex items-start gap-1.5">
                <Route size={11} className="text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-[12px] font-medium text-slate-700 leading-tight">
                  {tratativa}
                </p>
              </div>
            </div>
          )}

          {etapa && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1">
                Etapa
              </p>
              <div className="flex items-start gap-1.5">
                <Milestone size={11} className="text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-[12px] font-medium text-slate-700 leading-tight">
                  {etapa}
                </p>
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
