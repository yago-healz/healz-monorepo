export class InviteMemberDto {
  email: string;
  role?: 'admin' | 'manager' | 'doctor' | 'receptionist';
}
