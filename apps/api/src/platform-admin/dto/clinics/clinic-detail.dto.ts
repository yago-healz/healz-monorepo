import { ApiProperty } from "@nestjs/swagger";

export class OrganizationRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;
}

export class MemberDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: ["admin", "doctor", "secretary"] })
  role: string;

  @ApiProperty()
  joinedAt: Date;
}

export class ClinicDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: OrganizationRefDto })
  organization: OrganizationRefDto;

  @ApiProperty({ enum: ["active", "inactive"] })
  status: string;

  @ApiProperty({ type: [MemberDto] })
  members: MemberDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt?: Date;
}
