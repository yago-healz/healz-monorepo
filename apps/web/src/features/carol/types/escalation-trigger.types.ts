export type ConditionType =
  | 'out_of_scope'
  | 'keyword_detected'
  | 'max_attempts_exceeded'
  | 'explicit_request'
  | 'custom'

export interface EscalationTrigger {
  id: string
  clinicId: string
  name: string
  description: string | null
  conditionType: ConditionType
  conditionParams: Record<string, unknown> | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CreateEscalationTriggerRequest {
  name: string
  description?: string
  conditionType: ConditionType
  conditionParams?: Record<string, unknown>
  isActive?: boolean
}

export type UpdateEscalationTriggerRequest = Partial<CreateEscalationTriggerRequest>
