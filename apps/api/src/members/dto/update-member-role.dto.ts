import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role to assign to the member',
    enum: ['admin', 'manager', 'doctor', 'receptionist'],
    example: 'manager',
  })
  role: 'admin' | 'manager' | 'doctor' | 'receptionist';
}
