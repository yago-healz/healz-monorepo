import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentOrg, CurrentUser } from '../auth/decorators';
import { MembersService } from './members.service';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto';

@ApiTags('Members')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({
  description: 'Unauthorized - Invalid or missing authentication token',
})
@Controller('members')
@UseGuards(AuthGuard, RolesGuard)
export class MembersController {
  constructor(private membersService: MembersService) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'List organization members',
    description:
      'Returns all members of the current organization. Requires admin or manager role.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of members retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          organizationId: { type: 'string', format: 'uuid' },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'doctor', 'receptionist'],
          },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string' },
              name: { type: 'string', nullable: true },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have admin or manager role',
  })
  async list(@CurrentOrg() orgId: string) {
    return this.membersService.findByOrg(orgId);
  }

  @Post('invite')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Invite a new member',
    description:
      'Sends an invitation to a user to join the organization. If the user does not exist, they will be created. Requires admin or manager role.',
  })
  @ApiResponse({
    status: 201,
    description: 'Member invited successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        organizationId: { type: 'string', format: 'uuid' },
        role: {
          type: 'string',
          enum: ['admin', 'manager', 'doctor', 'receptionist'],
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have admin or manager role',
  })
  @ApiBadRequestResponse({
    description: 'Invalid email or member already exists in organization',
  })
  async invite(
    @CurrentOrg() orgId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: any,
  ) {
    return this.membersService.invite(orgId, dto, user.id);
  }

  @Put(':id/role')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update member role',
    description:
      'Updates the role of an existing organization member. Requires admin role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Member ID (organization member ID, not user ID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        organizationId: { type: 'string', format: 'uuid' },
        role: {
          type: 'string',
          enum: ['admin', 'manager', 'doctor', 'receptionist'],
        },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have admin role',
  })
  @ApiNotFoundResponse({ description: 'Member not found' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membersService.updateRole(id, dto.role);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Remove member from organization',
    description:
      'Removes a member from the organization. This does not delete the user account. Requires admin role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Member ID (organization member ID, not user ID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Member removed successfully' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have admin role',
  })
  @ApiNotFoundResponse({ description: 'Member not found' })
  async remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }
}
