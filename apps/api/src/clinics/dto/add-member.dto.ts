import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";

export class AddMemberDto {
  @ApiProperty({
    description: "ID do usuário a ser adicionado à clínica",
    example: "550e8400-e29b-41d4-a716-446655440000",
    type: String,
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: "Role do usuário na clínica",
    enum: ["admin", "doctor", "secretary"],
    example: "secretary",
    type: String,
  })
  @IsNotEmpty()
  @IsEnum(["admin", "doctor", "secretary"])
  role: string;
}
