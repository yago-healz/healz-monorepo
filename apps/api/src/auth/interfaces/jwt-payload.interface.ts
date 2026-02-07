export interface JwtPayload {
  userId: string;
  email: string;
  organizationId: string;
  activeClinicId: string;
  clinicAccess: ClinicAccess[]; // todas as clínicas que o usuário tem acesso
}

export interface ClinicAccess {
  clinicId: string;
  clinicName: string;
  role: "admin" | "doctor" | "secretary";
}
