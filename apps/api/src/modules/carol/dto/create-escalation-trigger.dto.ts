import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator'

export const CONDITION_TYPES = [
  'out_of_scope',
  'keyword_detected',
  'max_attempts_exceeded',
  'explicit_request',
  'custom',
] as const

export type ConditionType = typeof CONDITION_TYPES[number]

export class CreateEscalationTriggerDto {
  @IsString()
  @MaxLength(150)
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsIn(CONDITION_TYPES)
  conditionType: ConditionType

  @IsObject()
  @IsOptional()
  conditionParams?: Record<string, unknown>

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
