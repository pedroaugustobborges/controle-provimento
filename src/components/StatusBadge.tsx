import { STATUS_LABELS } from '@/types/vaga';
import { getStatusColor } from '@/lib/vagaUtils';
import type { StatusGeral } from '@/types/vaga';

export function StatusBadge({ status }: { status: StatusGeral }) {
  return (
    <span className={`status-badge ${getStatusColor(status)}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
