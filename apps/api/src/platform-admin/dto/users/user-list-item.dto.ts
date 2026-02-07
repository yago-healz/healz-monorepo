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

export class UserListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty({ enum: ["active", "inactive"] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [ClinicAccessDto] })
  clinics: ClinicAccessDto[];
}
