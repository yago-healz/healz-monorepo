import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AddressDto {
  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 Main St',
  })
  street?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'San Francisco',
  })
  city?: string;

  @ApiPropertyOptional({
    description: 'State or province',
    example: 'CA',
  })
  state?: string;

  @ApiPropertyOptional({
    description: 'ZIP or postal code',
    example: '94105',
  })
  zip?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'USA',
  })
  country?: string;
}

export class CreateClinicDto {
  @ApiProperty({
    description: 'Clinic name',
    example: 'Downtown Clinic',
    minLength: 2,
    maxLength: 100,
  })
  name: string;

  @ApiProperty({
    description: 'Unique clinic slug (URL-friendly identifier)',
    example: 'downtown-clinic',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    minLength: 2,
    maxLength: 50,
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Clinic phone number',
    example: '+1 (555) 123-4567',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Clinic email address',
    example: 'contact@downtown-clinic.com',
    format: 'email',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Clinic physical address',
    type: AddressDto,
  })
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };

  @ApiPropertyOptional({
    description: 'Clinic timezone (IANA timezone identifier)',
    example: 'America/Los_Angeles',
  })
  timezone?: string;
}
