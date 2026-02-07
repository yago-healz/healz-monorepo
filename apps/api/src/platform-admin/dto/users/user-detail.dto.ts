import { ApiProperty } from "@nestjs/swagger";

export class ClinicAccessDto {
  @ApiProperty()
  clinicId: string;

  @ApiProperty()
  clinicName: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty({ enum: ["admin", "doctor", "secretary"] })
  role: string;
}

export class AuditLogDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  resource: string;

  @ApiProperty()
  method: string;

  @ApiProperty()
  ip?: string;

  @ApiProperty()
  createdAt: Date;
}

export class UserDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  emailVerifiedAt?: Date;

  @ApiProperty({ enum: ["active", "inactive"] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  lastLoginAt?: Date;

  @ApiProperty({ type: [ClinicAccessDto] })
  clinics: ClinicAccessDto[];

  @ApiProperty({ type: [AuditLogDto] })
  recentActivity?: AuditLogDto[];
}
