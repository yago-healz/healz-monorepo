import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: "Email do usuário",
    example: "doctor@clinic.com",
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Senha do usuário (mínimo 6 caracteres)",
    example: "password123",
    minLength: 6,
    type: String,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description:
      "ID da clínica a ser ativada (opcional). Se não informado, usa a primeira clínica disponível",
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
    type: String,
  })
  @IsUUID()
  @IsOptional()
  clinicId?: string;
}
