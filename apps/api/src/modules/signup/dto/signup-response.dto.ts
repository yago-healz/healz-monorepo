import { ApiProperty } from "@nestjs/swagger";
import { ClinicAccess } from "../../../common/interfaces/jwt-payload.interface";

export class SignupActiveClinicDto {
  @ApiProperty({ description: "ID da clínica", example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ description: "Nome da clínica", example: "Unidade Principal" })
  name: string;

  @ApiProperty({ description: "ID da organização", example: "550e8400-e29b-41d4-a716-446655440000" })
  organizationId: string;

  @ApiProperty({ description: "Role do usuário", enum: ["admin", "manager", "doctor", "receptionist", "viewer"], example: "admin" })
  role: string;
}

export class SignupUserDto {
  @ApiProperty({ description: "ID do usuário", example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ description: "Email do usuário", example: "joao@clinica-exemplo.com" })
  email: string;

  @ApiProperty({ description: "Nome completo do usuário", example: "Dr. João Silva" })
  name: string;

  @ApiProperty({ description: "Status de verificação de email", example: false })
  emailVerified: boolean;

  @ApiProperty({ description: "Clínica ativa", type: SignupActiveClinicDto })
  activeClinic: SignupActiveClinicDto;

  @ApiProperty({ description: "Lista de clínicas disponíveis", type: [Object] })
  availableClinics: ClinicAccess[];
}

export class SignupOrganizationResponseDto {
  @ApiProperty({ description: "ID da organização", example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ description: "Nome da organização", example: "Clínica Exemplo" })
  name: string;

  @ApiProperty({ description: "Slug da organização", example: "clinica-exemplo" })
  slug: string;
}

export class SignupResponseDto {
  @ApiProperty({ description: "JWT access token", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken: string;

  @ApiProperty({ description: "Dados do usuário criado", type: SignupUserDto })
  user: SignupUserDto;

  @ApiProperty({ description: "Dados da organização criada", type: SignupOrganizationResponseDto })
  organization: SignupOrganizationResponseDto;
}
