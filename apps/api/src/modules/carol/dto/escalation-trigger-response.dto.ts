export class EscalationTriggerResponseDto {
  id: string
  clinicId: string
  name: string
  description: string | null
  conditionType: string
  conditionParams: Record<string, unknown> | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date | null
}
