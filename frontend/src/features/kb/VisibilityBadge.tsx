import { SolidChip } from '@/components/ds'

import { VISIBILITY, type Visibility } from './kb-utils'

export function VisibilityBadge({ value }: { value: Visibility }) {
  const v = VISIBILITY[value]
  return (
    <SolidChip hue={v.hue} icon={v.icon} size="sm">
      {v.label}
    </SolidChip>
  )
}
