import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Role to assign to the invited member',
    enum: ['admin', 'manager', 'doctor', 'receptionist'],
    default: 'receptionist',
    example: 'doctor',
  })
  role?: 'admin' | 'manager' | 'doctor' | 'receptionist';
}
