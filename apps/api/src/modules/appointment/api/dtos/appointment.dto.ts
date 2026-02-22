import {
  IsUUID,
  IsISO8601,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
} from "class-validator";

export class ScheduleAppointmentDto {
  @IsUUID() patientId: string;
  @IsUUID() tenantId: string;
  @IsUUID() clinicId: string;
  @IsUUID() doctorId: string;
  @IsISO8601() scheduledAt: string;
  @IsInt() @Min(15) @Max(480) duration: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ConfirmAppointmentDto {
  @IsString() confirmedBy: string;
}

export class CancelAppointmentDto {
  @IsString() cancelledBy: string;
  @IsOptional() @IsString() reason?: string;
}

export class RescheduleAppointmentDto {
  @IsISO8601() newScheduledAt: string;
  @IsString() rescheduledBy: string;
  @IsOptional() @IsString() reason?: string;
}
