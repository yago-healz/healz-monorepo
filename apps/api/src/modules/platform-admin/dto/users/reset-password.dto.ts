import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class AdminResetPasswordDto {
  @ApiProperty({
    description: "Se true, envia email de reset; se false, retorna senha temporária",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean = true;
}
