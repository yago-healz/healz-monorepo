import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: 'Organization name',
    example: 'Acme Healthcare Updated',
    minLength: 2,
    maxLength: 100,
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Unique organization slug (URL-friendly identifier)',
    example: 'acme-healthcare-updated',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    minLength: 2,
    maxLength: 50,
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Organization logo URL',
    example: 'https://example.com/logo.png',
    format: 'uri',
  })
  logo?: string;
}
