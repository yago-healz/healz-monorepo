export class ClinicMemberDto {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending";
  emailVerified: boolean;
  joinedAt: string; // ISO string (createdAt do userClinicRole ou invites.createdAt)
}

export class ClinicMembersResponseDto {
  data: ClinicMemberDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
