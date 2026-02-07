import { Type } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateNested,
} from "class-validator";

export class SignupOrganizationDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug deve conter apenas letras minúsculas, números e hífens",
  })
  slug: string;
}

export class SignupClinicDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;
}

export class SignupUserDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class SignupDto {
  @ValidateNested()
  @Type(() => SignupOrganizationDto)
  organization: SignupOrganizationDto;

  @ValidateNested()
  @Type(() => SignupClinicDto)
  clinic: SignupClinicDto;

  @ValidateNested()
  @Type(() => SignupUserDto)
  user: SignupUserDto;
}
