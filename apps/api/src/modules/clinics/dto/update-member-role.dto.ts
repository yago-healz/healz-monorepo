import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ["admin", "manager", "doctor", "receptionist", "viewer"] })
  @IsNotEmpty()
  @IsEnum(["admin", "manager", "doctor", "receptionist", "viewer"])
  role: string;
}
