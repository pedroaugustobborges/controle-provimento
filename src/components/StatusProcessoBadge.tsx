import { Play, Hourglass, XCircle, PauseCircle, BadgeCheck, Route, Milestone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { StatusProcesso } from '@/types/vaga';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

export interface StatusConfig {
  /** Background fill hex */
  bg: string;
  /** Text / icon hex */
  text: string;
  /** Border hex */
  border: string;
  /** Vivid dot hex (used for compact indicators) */
  dotHex: string;
  /** Hover shadow rgba */
  shadowColor: string;
  /** Lucide icon for this status */
  Icon: LucideIcon;
  /** Human-readable label */
  label: string;
}

/** Central source-of-truth for every StatusProcesso visual.
 *  Import this wherever status colours / icons are needed. */
export const STATUS_CONFIG: Record<StatusProcesso, StatusConfig> = {
  'Em Andamento': {
    bg: '#FEF3C7',
    text: '#B45309',
    border: '#FCD34D',
    dotHex: '#D97706',
    shadowColor: 'rgba(252, 211, 77, 0.5)',
    Icon: Play,
    label: 'Em Andamento',
  },
  'Solicitada': {
    bg: '#DCFCE7',
    text: '#166534',
    border: '#86EFAC',
    dotHex: '#16A34A',
    shadowColor: 'rgba(134, 239, 172, 0.5)',
    Icon: Hourglass,
    label: 'Solicitada',
  },
  'Cancelada': {
    bg: '#FEE2E2',
    text: '#B91C1C',
    border: '#FCA5A5',
    dotHex: '#DC2626',
    shadowColor: 'rgba(252, 165, 165, 0.5)',
    Icon: XCircle,
    label: 'Cancelada',
  },
  'Suspensa': {
    bg: '#DBEAFE',
    text: '#1D4ED8',
    border: '#93C5FD',
    dotHex: '#2563EB',
    shadowColor: 'rgba(147, 197, 253, 0.5)',
    Icon: PauseCircle,
    label: 'Suspensa',
  },
  'Concluída': {
    bg: '#EDE9FE',
    text: '#6D28D9',
    border: '#C4B5FD',
    dotHex: '#7C3AED',
    shadowColor: 'rgba(196, 181, 253, 0.5)',
    Icon: BadgeCheck,
    label: 'Concluída',
  },
};

/** Fallback config for unknown / missing status values. */
const FALLBACK_CONFIG: StatusConfig = {
  bg: '#F8FAFC',
  text: '#64748B',
  border: '#E2E8F0',
  dotHex: '#94A3B8',
  shadowColor: 'rgba(148, 163, 184, 0.4)',
  Icon: Play,
  label: 'Sem Status',
};

/** Returns the config for a given StatusProcesso string (with safe fallback). */
export function getStatusProcessoConfig(status?: string | null): StatusConfig {
  if (!status) return FALLBACK_CONFIG;
  return STATUS_CONFIG[status as StatusProcesso] ?? FALLBACK_CONFIG;
}

// ─── Internal pill atom ───────────────────────────────────────────────────────

function PillBadge({
  config,
  label,
}: {
  config: StatusConfig;
  label: string;
}) {
  const { bg, text, border, shadowColor, Icon } = config;
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

// ─── Public component ─────────────────────────────────────────────────────────

interface Props {
  /** StatusProcesso value or any string fallback */
  status?: StatusProcesso | string | null;
  /** Optional tratativa disclosed on hover */
  tratativa?: string | null;
  /** Optional etapa disclosed on hover */
  etapa?: string | null;
}

/**
 * Pill badge for StatusProcesso.
 * - Shows only the badge at rest — clean, compact.
 * - On hover reveals a card with Tratativa and Etapa (if provided).
 * - Fully accessible: role="status", tabIndex, keyboard-focus ring.
 * - Data-driven via STATUS_CONFIG — add new statuses there only.
 */
export function StatusProcessoBadge({ status, tratativa, etapa }: Props) {
  const config = getStatusProcessoConfig(status);
  const label = config.label === 'Sem Status' && status ? status : config.label;
  const hasDetails = !!(tratativa || etapa);

  if (!hasDetails) {
    return <PillBadge config={config} label={label} />;
  }

  const { bg, text, border, Icon } = config;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <span style={{ display: 'inline-block', cursor: 'default' }}>
          <PillBadge config={config} label={label} />
        </span>
      </HoverCardTrigger>

      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-52 p-0 overflow-hidden rounded-xl border-0"
        style={{ boxShadow: `0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px ${border}` }}
      >
        {/* Coloured header matching the status */}
        <div
          style={{ background: bg, borderBottom: `1px solid ${border}` }}
          className="px-3 py-2.5 flex items-center gap-2"
        >
          <Icon size={13} style={{ color: text }} aria-hidden="true" />
          <span style={{ color: text }} className="text-[12px] font-bold tracking-wide">
            {label}
          </span>
        </div>

        {/* Detail rows */}
        <div className="px-3 py-3 space-y-3 bg-white">
          {tratativa && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1">
                Tratativa
              </p>
              <div className="flex items-start gap-1.5">
                <Route size={11} className="text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-[12px] font-medium text-slate-700 leading-tight">{tratativa}</p>
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
                <p className="text-[12px] font-medium text-slate-700 leading-tight">{etapa}</p>
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
