import { ApiProperty } from "@nestjs/swagger";

export class ClinicSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ["active", "inactive"] })
  status: string;

  @ApiProperty()
  usersCount: number;
}

export class AdminSummaryDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}

export class OrganizationDetailStatsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  totalClinics: number;

  @ApiProperty()
  lastLogin?: Date;
}

export class OrganizationDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ enum: ["active", "inactive"] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt?: Date;

  @ApiProperty({ type: [ClinicSummaryDto] })
  clinics: ClinicSummaryDto[];

  @ApiProperty({ type: [AdminSummaryDto] })
  admins: AdminSummaryDto[];

  @ApiProperty({ type: OrganizationDetailStatsDto })
  stats: OrganizationDetailStatsDto;
}
