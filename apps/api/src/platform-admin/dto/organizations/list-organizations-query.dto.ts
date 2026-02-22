import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class ListOrganizationsQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: "Busca por nome ou slug",
    required: false,
    example: "clinica",
  })
  @IsOptional()
  @IsString()
  search?: string;

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
    enum: ["createdAt", "name", "clinicsCount", "usersCount"],
    default: "createdAt",
    required: false,
  })
  @IsOptional()
  @IsIn(["createdAt", "name", "clinicsCount", "usersCount"])
  sortBy?: string = "createdAt";
}
