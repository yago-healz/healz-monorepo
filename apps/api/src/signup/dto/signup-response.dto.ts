import { ClinicAccess } from "../../auth/interfaces/jwt-payload.interface";

export class SignupResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    activeClinic: {
      id: string;
      name: string;
      organizationId: string;
      role: string;
    };
    availableClinics: ClinicAccess[];
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}
