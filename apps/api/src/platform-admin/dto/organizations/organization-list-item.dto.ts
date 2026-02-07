import { ApiProperty } from "@nestjs/swagger";

export class OrganizationStatsDto {
  @ApiProperty({ example: 3 })
  clinicsCount: number;

  @ApiProperty({ example: 12 })
  usersCount: number;

  @ApiProperty({ example: "2026-02-06T15:30:00Z" })
  lastActivity?: Date;
}

export class OrganizationListItemDto {
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

  @ApiProperty({ type: OrganizationStatsDto })
  stats: OrganizationStatsDto;
}
