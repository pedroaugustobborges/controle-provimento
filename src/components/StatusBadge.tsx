import { STATUS_LABELS } from '@/types/vaga';
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

  return (
    <span className={`status-badge ${getStatusColor(status)}`}>
      {STATUS_LABELS[status] || 'Sem Status'}
    </span>
  );
}
