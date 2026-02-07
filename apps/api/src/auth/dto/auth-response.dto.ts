import { ClinicAccess } from "../interfaces/jwt-payload.interface";

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    activeClinic: {
      id: string;
      name: string;
      organizationId: string;
      role: string;
    };
    availableClinics: ClinicAccess[];
  };
}
