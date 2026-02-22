import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Length } from "class-validator";

export class UpdateUserDto {
  @ApiProperty({
    description: "Novo nome",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  name?: string;

  @ApiProperty({
    description: "Novo email",
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
