import { IsString, IsOptional, IsEmail, IsDateString } from "class-validator";

export class UpdatePatientDto {
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
