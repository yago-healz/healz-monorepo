import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ResendInviteDto {
  @ApiProperty({ example: "usuario@example.com" })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
