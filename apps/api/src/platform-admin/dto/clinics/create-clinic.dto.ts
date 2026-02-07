import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateClinicDto {
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
    description: "ID do usuário que será admin inicial (opcional)",
    required: false,
  })
  @IsOptional()
  @IsUUID()
  initialAdminId?: string;
}
