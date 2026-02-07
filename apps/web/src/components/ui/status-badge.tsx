import { Badge } from '@/components/ui/badge'
import type { Status } from '@/types/api.types'

interface StatusBadgeProps {
  status: Status
}

const statusLabels: Record<Status, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={status === 'active' ? 'default' : 'secondary'}>
      {statusLabels[status]}
    </Badge>
  )
}
