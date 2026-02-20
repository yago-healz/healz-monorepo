import { ApiProperty } from "@nestjs/swagger";
import { ClinicAccess } from "../interfaces/jwt-payload.interface";

export class ActiveClinicDto {
  @ApiProperty({ description: "ID da clínica ativa" })
  id: string;

  @ApiProperty({ description: "Nome da clínica" })
  name: string;

  @ApiProperty({ description: "ID da organização" })
  organizationId: string;

  @ApiProperty({ description: "Role do usuário na clínica", enum: ["admin", "manager", "doctor", "receptionist", "viewer"] })
  role: string;
}

export class UserDto {
  @ApiProperty({ description: "ID do usuário" })
  id: string;

  @ApiProperty({ description: "Email do usuário" })
  email: string;

  @ApiProperty({ description: "Nome completo do usuário" })
  name: string;

  @ApiProperty({ description: "Clínica ativa no momento", type: ActiveClinicDto })
  activeClinic: ActiveClinicDto;

  @ApiProperty({ description: "Lista de clínicas disponíveis", type: [Object] })
  availableClinics: ClinicAccess[];
}

export class AuthResponseDto {
  @ApiProperty({ description: "JWT access token (válido por 15 minutos)" })
  accessToken: string;

  @ApiProperty({ description: "Refresh token (armazenado em httpOnly cookie)" })
  refreshToken: string;

  @ApiProperty({ description: "Dados do usuário autenticado", type: UserDto })
  user: UserDto;
}
