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
    enum: ["admin", "manager", "doctor", "receptionist", "viewer"],
  })
  @IsNotEmpty()
  @IsIn(["admin", "manager", "doctor", "receptionist", "viewer"])
  role: "admin" | "manager" | "doctor" | "receptionist" | "viewer";
}
