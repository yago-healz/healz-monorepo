export interface JwtPayload {
  userId: string;
  email: string;
  organizationId?: string; // undefined para Platform Admins sem clínica
  activeClinicId?: string; // undefined para Platform Admins sem clínica
  clinicAccess: ClinicAccess[]; // todas as clínicas que o usuário tem acesso
  isPlatformAdmin?: boolean;
  isImpersonating?: boolean;
  impersonatedBy?: string;
}

export interface ClinicAccess {
  clinicId: string;
  clinicName: string;
  role: "admin" | "manager" | "doctor" | "receptionist" | "viewer";
}
