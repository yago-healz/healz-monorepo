import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class AcceptInviteDto {
  @ApiProperty({
    description: "Token de convite recebido por email",
    example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({
    description: "Senha para a nova conta (mínimo 8 caracteres)",
    example: "senha12345",
    minLength: 8,
    type: String,
  })
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
