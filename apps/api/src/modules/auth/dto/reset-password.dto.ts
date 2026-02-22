import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({
    description: "Token de reset de senha recebido por email",
    example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    type: String,
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: "Nova senha (mínimo 8 caracteres)",
    example: "newPassword123",
    minLength: 8,
    type: String,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
