import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Length } from "class-validator";

export class UpdateOrganizationDto {
  @ApiProperty({
    description: "Nome da organização",
    example: "Novo Nome",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  name?: string;

  @ApiProperty({
    description: "Slug único da organização",
    example: "novo-slug",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(3, 100)
  slug?: string;

  @ApiProperty({
    description: "Status da organização",
    enum: ["active", "inactive"],
    example: "inactive",
    required: false,
  })
  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive";
}
