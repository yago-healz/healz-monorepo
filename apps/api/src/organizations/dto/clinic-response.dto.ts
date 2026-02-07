import { ApiProperty } from "@nestjs/swagger";

export class ClinicResponseDto {
  @ApiProperty({ description: "ID da clínica", example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ description: "Nome da clínica", example: "Unidade Centro" })
  name: string;

  @ApiProperty({ description: "ID da organização", example: "550e8400-e29b-41d4-a716-446655440000" })
  organizationId: string;

  @ApiProperty({ description: "Data de criação", example: "2026-02-07T10:00:00Z" })
  createdAt: Date;
}
