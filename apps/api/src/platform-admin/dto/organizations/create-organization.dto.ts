import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class CreateOrganizationDto {
  @ApiProperty({
    description: "Nome da organização",
    example: "Clínica XYZ",
    minLength: 3,
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name: string;

  @ApiProperty({
    description: "Slug único da organização",
    example: "clinica-xyz",
    minLength: 3,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  slug: string;

  @ApiProperty({
    description: "Clínica inicial",
    example: {
      name: "Unidade Principal"
    },
  })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsNotEmpty()
  initialClinic: {
    name: string;
  };

  @ApiProperty({
    description: "Admin inicial da organização",
    example: {
      name: "Dr. João Silva",
      email: "joao@clinica-xyz.com",
      sendInvite: true
    },
  })
  @IsNotEmpty()
  initialAdmin: {
    name: string;
    email: string;
    sendInvite?: boolean;
  };
}
