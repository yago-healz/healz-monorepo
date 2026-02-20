import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({
    description: "Nome do usuário",
    example: "Dr. Carlos Souza",
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @ApiProperty({
    description: "Email",
    example: "carlos@example.com",
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "ID da clínica",
    required: false,
  })
  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @ApiProperty({
    description: "Role na clínica",
    enum: ["admin", "manager", "doctor", "receptionist", "viewer"],
    required: false,
  })
  @IsOptional()
  @IsIn(["admin", "manager", "doctor", "receptionist", "viewer"])
  role?: "admin" | "manager" | "doctor" | "receptionist" | "viewer";

  @ApiProperty({
    description: "Se true, envia email de convite; se false, define senha",
    example: true,
    default: true,
  })
  @IsBoolean()
  sendInvite?: boolean = true;

  @ApiProperty({
    description: "Senha do usuário (obrigatória se sendInvite = false)",
    example: "senha123",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
