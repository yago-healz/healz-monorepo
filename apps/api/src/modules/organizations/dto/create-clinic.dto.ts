import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class CreateClinicDto {
  @ApiProperty({
    description: "Nome da clínica",
    example: "Unidade Centro",
    minLength: 3,
    maxLength: 255,
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;
}
