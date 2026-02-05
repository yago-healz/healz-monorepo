import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Healthcare',
    minLength: 2,
    maxLength: 100,
  })
  name: string;

  @ApiProperty({
    description: 'Unique organization slug (URL-friendly identifier)',
    example: 'acme-healthcare',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    minLength: 2,
    maxLength: 50,
  })
  slug: string;
}
