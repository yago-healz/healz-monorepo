export class MemberResponseDto {
  message: string;
  member: {
    userId: string;
    clinicId: string;
    role: string;
  };
}
