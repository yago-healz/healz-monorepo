import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateOrgStatusDto {
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
    example: "Inadimplência",
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
