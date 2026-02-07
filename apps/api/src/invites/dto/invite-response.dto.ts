export class InviteResponseDto {
  message: string;
  invite: {
    id: string;
    email: string;
    clinicId: string;
    role: string;
    expiresAt: Date;
  };
}
