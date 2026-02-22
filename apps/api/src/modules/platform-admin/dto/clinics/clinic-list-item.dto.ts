import { ApiProperty } from "@nestjs/swagger";

export class OrganizationRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;
}

export class ClinicListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: OrganizationRefDto })
  organization: OrganizationRefDto;

  @ApiProperty({ enum: ["active", "inactive"] })
  status: string;

  @ApiProperty()
  usersCount: number;

  @ApiProperty()
  createdAt: Date;
}
