import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class PlatformAdminCreateClinicDto {
  @ApiProperty({
    description: "ID da organização",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsNotEmpty()
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: "Nome da clínica",
    example: "Unidade Sul",
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @ApiProperty({
    description: "Status inicial da clínica",
    enum: ["active", "inactive"],
    default: "active",
    required: false,
  })
  @IsOptional()
  @IsEnum(["active", "inactive"])
  status?: "active" | "inactive";

  @ApiProperty({
    description: "ID do usuário que será admin inicial (opcional)",
    required: false,
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsUUID()
  initialAdminId?: string;
}
