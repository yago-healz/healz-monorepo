import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsUUID } from "class-validator";

export class TransferClinicDto {
  @ApiProperty({
    description: "ID da organização destino",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsNotEmpty()
  @IsUUID()
  targetOrganizationId: string;

  @ApiProperty({
    description: "Se true, mantém usuários; se false, remove todos",
    example: false,
    default: false,
  })
  @IsBoolean()
  keepUsers?: boolean = false;
}
