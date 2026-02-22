import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: "Busca por nome ou email",
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
    description: "Filtrar por clínica",
    required: false,
  })
  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @ApiProperty({
    description: "Filtrar por role",
    enum: ["admin", "manager", "doctor", "receptionist", "viewer"],
    required: false,
  })
  @IsOptional()
  @IsIn(["admin", "manager", "doctor", "receptionist", "viewer"])
  role?: string;

  @ApiProperty({
    description: "Filtrar por email verificado",
    enum: ["true", "false", "all"],
    default: "all",
    required: false,
  })
  @IsOptional()
  @IsIn(["true", "false", "all"])
  emailVerified?: string = "all";

  @ApiProperty({
    description: "Filtrar por status",
    enum: ["active", "inactive", "all"],
    default: "active",
    required: false,
  })
  @IsOptional()
  @IsIn(["active", "inactive", "all"])
  status?: string = "active";

  @ApiProperty({
    description: "Campo de ordenação",
    enum: ["createdAt", "name", "email"],
    default: "createdAt",
    required: false,
  })
  @IsOptional()
  @IsIn(["createdAt", "name", "email"])
  sortBy?: string = "createdAt";
}
