import { Type } from 'class-transformer'
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator'
import {
  DayScheduleDto,
  SpecificBlockDto,
} from '../../clinic-settings/dto/clinic-scheduling.dto'

export class DoctorScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  weeklySchedule: DayScheduleDto[]

  @IsInt()
  @Min(1)
  defaultAppointmentDuration: number

  @IsInt()
  @Min(0)
  minimumAdvanceHours: number

  @IsInt()
  @Min(1)
  maxFutureDays: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificBlockDto)
  specificBlocks: SpecificBlockDto[]
}

export class GetDoctorScheduleResponseDto {
  id: string | null
  doctorClinicId: string
  weeklySchedule: DayScheduleDto[]
  specificBlocks: SpecificBlockDto[]
  defaultAppointmentDuration: number
  minimumAdvanceHours: number
  maxFutureDays: number
  createdAt: Date | null
  updatedAt: Date | null
}
