import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentOrg, CurrentUser } from '../auth/decorators';
import { MembersService } from './members.service';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto';

@Controller('members')
@UseGuards(AuthGuard, RolesGuard)
export class MembersController {
  constructor(private membersService: MembersService) {}

  @Get()
  @Roles('admin', 'manager')
  async list(@CurrentOrg() orgId: string) {
    return this.membersService.findByOrg(orgId);
  }

  @Post('invite')
  @Roles('admin', 'manager')
  async invite(
    @CurrentOrg() orgId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: any,
  ) {
    return this.membersService.invite(orgId, dto, user.id);
  }

  @Put(':id/role')
  @Roles('admin')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membersService.updateRole(id, dto.role);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }
}
