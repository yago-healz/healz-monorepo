import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty } from "class-validator";

export class UpdateUserClinicDto {
  @ApiProperty({
    description: "Nova role na clínica",
    enum: ["admin", "manager", "doctor", "receptionist", "viewer"],
  })
  @IsNotEmpty()
  @IsIn(["admin", "manager", "doctor", "receptionist", "viewer"])
  role: "admin" | "manager" | "doctor" | "receptionist" | "viewer";
}
