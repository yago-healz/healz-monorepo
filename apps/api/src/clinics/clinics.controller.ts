import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser, CurrentOrg, CurrentSession } from '../auth/decorators';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto } from './dto';

@Controller('clinics')
@UseGuards(AuthGuard, RolesGuard)
export class ClinicsController {
  constructor(private clinicsService: ClinicsService) {}

  @Post()
  @Roles('admin', 'manager')
  async create(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateClinicDto,
  ) {
    return this.clinicsService.create(orgId, user.id, dto);
  }

  @Get()
  async list(@CurrentOrg() orgId: string) {
    return this.clinicsService.findByOrg(orgId);
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @CurrentOrg() orgId: string,
  ) {
    return this.clinicsService.findOne(id, user.id, orgId);
  }

  @Post(':id/set-active')
  async setActive(
    @Param('id') id: string,
    @CurrentSession() session: any,
    @CurrentUser() user: any,
    @CurrentOrg() orgId: string,
  ) {
    return this.clinicsService.setActive(session.id, id, user.id, orgId);
  }
}
