import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({
    description: "Email do usuário que esqueceu a senha",
    example: "doctor@clinic.com",
    type: String,
  })
  @IsEmail()
  email: string;
}
