import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator'
import { CONDITION_TYPES, ConditionType } from './create-escalation-trigger.dto'

export class UpdateEscalationTriggerDto {
  @IsString()
  @MaxLength(150)
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsIn(CONDITION_TYPES)
  @IsOptional()
  conditionType?: ConditionType

  @IsObject()
  @IsOptional()
  conditionParams?: Record<string, unknown>

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
