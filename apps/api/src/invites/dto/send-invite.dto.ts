import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
} from "class-validator";

export class SendInviteDto {
  @ApiProperty({
    description: "Email do usuário a ser convidado",
    example: "medico@example.com",
    type: String,
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Nome completo do usuário",
    example: "Dr. Maria Santos",
    minLength: 3,
    maxLength: 255,
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @ApiProperty({
    description: "ID da clínica para a qual o usuário será convidado",
    example: "550e8400-e29b-41d4-a716-446655440000",
    type: String,
  })
  @IsNotEmpty()
  @IsUUID()
  clinicId: string;

  @ApiProperty({
    description: "Role do usuário na clínica",
    enum: ["admin", "manager", "doctor", "receptionist", "viewer"],
    example: "doctor",
    type: String,
  })
  @IsNotEmpty()
  @IsEnum(["admin", "manager", "doctor", "receptionist", "viewer"])
  role: string;
}
