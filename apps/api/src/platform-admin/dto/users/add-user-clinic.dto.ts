import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsUUID } from "class-validator";

export class AddUserClinicDto {
  @ApiProperty({
    description: "ID da clínica",
  })
  @IsNotEmpty()
  @IsUUID()
  clinicId: string;

  @ApiProperty({
    description: "Role na clínica",
    enum: ["admin", "doctor", "secretary"],
  })
  @IsNotEmpty()
  @IsIn(["admin", "doctor", "secretary"])
  role: "admin" | "doctor" | "secretary";
}
