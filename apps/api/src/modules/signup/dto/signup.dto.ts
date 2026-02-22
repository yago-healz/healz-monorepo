import { ApiProperty } from "@nestjs/swagger";
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
  @ApiProperty({
    description: "Nome da organização",
    example: "Clínica Exemplo",
    minLength: 3,
    maxLength: 255,
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @ApiProperty({
    description:
      "Slug único da organização (apenas letras minúsculas, números e hífens)",
    example: "clinica-exemplo",
    minLength: 3,
    maxLength: 100,
    pattern: "^[a-z0-9-]+$",
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug deve conter apenas letras minúsculas, números e hífens",
  })
  slug: string;
}

export class SignupClinicDto {
  @ApiProperty({
    description: "Nome da primeira clínica",
    example: "Unidade Principal",
    minLength: 3,
    maxLength: 255,
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;
}

export class SignupUserDto {
  @ApiProperty({
    description: "Nome completo do usuário",
    example: "Dr. João Silva",
    minLength: 3,
    maxLength: 255,
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @ApiProperty({
    description: "Email do usuário",
    example: "joao@clinica-exemplo.com",
    type: String,
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Senha (mínimo 8 caracteres)",
    example: "senha12345",
    minLength: 8,
    type: String,
  })
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class SignupDto {
  @ApiProperty({
    description: "Dados da organização a ser criada",
    type: SignupOrganizationDto,
  })
  @ValidateNested()
  @Type(() => SignupOrganizationDto)
  organization: SignupOrganizationDto;

  @ApiProperty({
    description: "Dados da primeira clínica",
    type: SignupClinicDto,
  })
  @ValidateNested()
  @Type(() => SignupClinicDto)
  clinic: SignupClinicDto;

  @ApiProperty({
    description: "Dados do usuário administrador",
    type: SignupUserDto,
  })
  @ValidateNested()
  @Type(() => SignupUserDto)
  user: SignupUserDto;
}
