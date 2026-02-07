import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";

export class UpdateClinicDto {
  @ApiProperty({
    description: "Novo nome da clínica",
    example: "Unidade Centro Renovada",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  name?: string;
}
