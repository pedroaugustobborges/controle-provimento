import { STATUS_LABELS, STATUS_DISPLAY_MAP } from '@/types/vaga';
import { getStatusColor } from '@/lib/vagaUtils';
import type { StatusGeral } from '@/types/vaga';

export function StatusBadge({ status }: { status: StatusGeral }) {
  if (!status || status === ('' as StatusGeral)) {
    return (
      <span className="status-badge bg-gray-100 text-gray-600">
        Sem Status
      </span>
    );
  }

  const displayLabel = STATUS_DISPLAY_MAP[status] || STATUS_LABELS[status] || status || 'Sem Status';

  return (
    <span className={`status-badge ${getStatusColor(status)}`}>
      {displayLabel}
    </span>
  );
}
