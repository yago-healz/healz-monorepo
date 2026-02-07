import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty } from "class-validator";

export class UpdateUserClinicDto {
  @ApiProperty({
    description: "Nova role na clínica",
    enum: ["admin", "doctor", "secretary"],
  })
  @IsNotEmpty()
  @IsIn(["admin", "doctor", "secretary"])
  role: "admin" | "doctor" | "secretary";
}
