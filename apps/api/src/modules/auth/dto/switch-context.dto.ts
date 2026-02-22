import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class SwitchContextDto {
  @ApiProperty({
    description: "ID da clínica para trocar o contexto",
    example: "550e8400-e29b-41d4-a716-446655440000",
    type: String,
  })
  @IsUUID()
  clinicId: string;
}
