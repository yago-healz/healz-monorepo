import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SwitchContextDto {
  @ApiProperty({
    description: 'ID of the organization to switch to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  organizationId: string;

  @ApiPropertyOptional({
    description: 'ID of the clinic to set as active (optional)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  clinicId?: string;
}
