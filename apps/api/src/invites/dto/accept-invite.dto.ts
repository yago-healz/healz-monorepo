import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class AcceptInviteDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
