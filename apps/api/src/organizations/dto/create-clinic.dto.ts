import { IsNotEmpty, IsString, Length } from "class-validator";

export class CreateClinicDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;
}
