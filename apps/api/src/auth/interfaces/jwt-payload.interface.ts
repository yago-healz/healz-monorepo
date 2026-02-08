export interface JwtPayload {
  userId: string;
  email: string;
  organizationId?: string; // undefined para Platform Admins sem clínica
  activeClinicId?: string; // undefined para Platform Admins sem clínica
  clinicAccess: ClinicAccess[]; // todas as clínicas que o usuário tem acesso
}

export interface ClinicAccess {
  clinicId: string;
  clinicName: string;
  role: "admin" | "doctor" | "secretary";
}
