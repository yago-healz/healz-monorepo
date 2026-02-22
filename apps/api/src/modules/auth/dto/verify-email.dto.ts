import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class VerifyEmailDto {
  @ApiProperty({
    description: "Token de verificação de email recebido por email",
    example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    type: String,
  })
  @IsString()
  token: string;
}
