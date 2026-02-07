import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";

export class AddMemberDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsEnum(["admin", "doctor", "secretary"])
  role: string;
}
