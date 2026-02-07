import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateUserStatusDto {
  @ApiProperty({
    description: "Novo status",
    enum: ["active", "inactive"],
    example: "inactive",
  })
  @IsNotEmpty()
  @IsIn(["active", "inactive"])
  status: "active" | "inactive";

  @ApiProperty({
    description: "Motivo da alteração",
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description: "Se true, revoga todos os refresh tokens (logout forçado)",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  revokeTokens?: boolean = true;
}
