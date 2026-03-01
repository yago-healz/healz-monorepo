import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class SchedulingRulesDto {
  @IsBoolean()
  @IsOptional()
  confirmBeforeScheduling?: boolean

  @IsBoolean()
  @IsOptional()
  allowCancellation?: boolean

  @IsBoolean()
  @IsOptional()
  allowRescheduling?: boolean

  @IsString()
  @IsOptional()
  postSchedulingMessage?: string
}

export class SaveCarolConfigDto {
  @ApiPropertyOptional({ maxLength: 100, default: 'Carol' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  selectedTraits?: string[]

  @ApiPropertyOptional({ enum: ['formal', 'informal', 'empathetic'] })
  @IsString()
  @IsIn(['formal', 'informal', 'empathetic'])
  @IsOptional()
  voiceTone?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  greeting?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  restrictSensitiveTopics?: boolean

  @ApiPropertyOptional({ type: SchedulingRulesDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SchedulingRulesDto)
  schedulingRules?: SchedulingRulesDto
}
