import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

// ============ NEW DTOs ============

export class TimeSlotDto {
  @IsString()
  id: string;

  @IsString()
  from: string; // HH:MM

  @IsString()
  to: string; // HH:MM
}

export class DayScheduleDto {
  @IsString()
  day:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";

  @IsBoolean()
  isOpen: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots: TimeSlotDto[];
}

export class SpecificBlockDto {
  @IsString()
  id: string;

  @IsString()
  date: string; // YYYY-MM-DD

  @IsString()
  from: string; // HH:MM

  @IsString()
  to: string; // HH:MM

  @IsString()
  @IsOptional()
  reason?: string;
}

// ============ LEGACY DTO (for backward compatibility) ============

export class TimeBlockDto {
  @IsString()
  id: string;

  @IsString()
  from: string; // HH:MM

  @IsString()
  to: string; // HH:MM
}

// ============ REQUEST/RESPONSE DTOs ============

export class ClinicSchedulingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  weeklySchedule: DayScheduleDto[];

  @IsInt()
  @Min(1)
  defaultAppointmentDuration: number;

  @IsInt()
  @Min(0)
  minimumAdvanceHours: number;

  @IsInt()
  @Min(1)
  maxFutureDays: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificBlockDto)
  specificBlocks: SpecificBlockDto[];

  // Legacy fields (optional, for backward compatibility)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeBlockDto)
  @IsOptional()
  timeBlocks?: TimeBlockDto[];

  @IsInt()
  @Min(0)
  @IsOptional()
  minimumInterval?: number;
}

export class GetClinicSchedulingResponseDto {
  id: string;
  clinicId: string;
  weeklySchedule: DayScheduleDto[];
  defaultAppointmentDuration: number;
  minimumAdvanceHours: number;
  maxFutureDays: number;
  specificBlocks: SpecificBlockDto[];
  timeBlocks: TimeBlockDto[]; // legacy
  minimumInterval: number; // legacy
  createdAt: Date;
  updatedAt?: Date;
}
