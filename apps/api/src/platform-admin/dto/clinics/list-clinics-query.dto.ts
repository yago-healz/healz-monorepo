import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../common/pagination-query.dto";

export class ListClinicsQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: "Busca por nome da clínica",
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: "Filtrar por organização",
    required: false,
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({
    description: "Filtrar por status",
    enum: ["active", "inactive", "all"],
    default: "active",
    required: false,
  })
  @IsOptional()
  @IsIn(["active", "inactive", "all"])
  status?: "active" | "inactive" | "all" = "active";

  @ApiProperty({
    description: "Campo de ordenação",
    enum: ["createdAt", "name"],
    default: "createdAt",
    required: false,
  })
  @IsOptional()
  @IsIn(["createdAt", "name"])
  sortBy?: string = "createdAt";
}
