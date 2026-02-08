import { IsUUID, IsString, IsOptional, IsEmail, IsDateString, Matches } from "class-validator";

export class RegisterPatientDto {
  @IsUUID()
  tenant_id: string;

  @IsUUID()
  clinic_id: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phone: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;
}
