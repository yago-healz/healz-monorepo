import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
} from "class-validator";

export class SendInviteDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @IsNotEmpty()
  @IsUUID()
  clinicId: string;

  @IsNotEmpty()
  @IsEnum(["admin", "doctor", "secretary"])
  role: string;
}
