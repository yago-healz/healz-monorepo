import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger'
import { ClinicSettingsService } from './clinic-settings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../clinics/guards/is-clinic-admin.guard'
import { ClinicObjectivesDto } from './dto/clinic-objectives.dto'
import { ClinicServicesDto } from './dto/clinic-services.dto'
import { ClinicSchedulingDto } from './dto/clinic-scheduling.dto'
import { ClinicCarolSettingsDto } from './dto/clinic-carol-settings.dto'
import { ClinicNotificationsDto } from './dto/clinic-notifications.dto'

@ApiTags('Clinic Settings')
@Controller('clinics')
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth('bearer')
export class ClinicSettingsController {
  constructor(private service: ClinicSettingsService) {}

  // OBJECTIVES
  @Get(':clinicId/settings/objectives')
  @ApiOperation({
    summary: 'Obter configurações de objetivos da clínica',
  })
  async getObjectives(@Param('clinicId') clinicId: string) {
    return this.service.getObjectives(clinicId)
  }

  @Patch(':clinicId/settings/objectives')
  @ApiOperation({
    summary: 'Salvar configurações de objetivos da clínica',
  })
  async saveObjectives(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicObjectivesDto
  ) {
    return this.service.saveObjectives(clinicId, dto)
  }

  // SERVICES
  @Get(':clinicId/settings/services')
  @ApiOperation({
    summary: 'Obter configurações de serviços da clínica',
  })
  async getServices(@Param('clinicId') clinicId: string) {
    return this.service.getServices(clinicId)
  }

  @Patch(':clinicId/settings/services')
  @ApiOperation({
    summary: 'Salvar configurações de serviços da clínica',
  })
  async saveServices(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicServicesDto
  ) {
    return this.service.saveServices(clinicId, dto)
  }

  // SCHEDULING
  @Get(':clinicId/settings/scheduling')
  @ApiOperation({
    summary: 'Obter configurações de agendamento da clínica',
  })
  async getScheduling(@Param('clinicId') clinicId: string) {
    return this.service.getScheduling(clinicId)
  }

  @Patch(':clinicId/settings/scheduling')
  @ApiOperation({
    summary: 'Salvar configurações de agendamento da clínica',
  })
  async saveScheduling(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicSchedulingDto
  ) {
    return this.service.saveScheduling(clinicId, dto)
  }

  // CAROL SETTINGS
  @Get(':clinicId/settings/carol')
  @ApiOperation({
    summary: 'Obter configurações do Carol da clínica',
  })
  async getCarolSettings(@Param('clinicId') clinicId: string) {
    return this.service.getCarolSettings(clinicId)
  }

  @Patch(':clinicId/settings/carol')
  @ApiOperation({
    summary: 'Salvar configurações do Carol da clínica',
  })
  async saveCarolSettings(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicCarolSettingsDto
  ) {
    return this.service.saveCarolSettings(clinicId, dto)
  }

  // NOTIFICATIONS
  @Get(':clinicId/settings/notifications')
  @ApiOperation({
    summary: 'Obter configurações de notificações da clínica',
  })
  async getNotifications(@Param('clinicId') clinicId: string) {
    return this.service.getNotifications(clinicId)
  }

  @Patch(':clinicId/settings/notifications')
  @ApiOperation({
    summary: 'Salvar configurações de notificações da clínica',
  })
  async saveNotifications(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicNotificationsDto
  ) {
    return this.service.saveNotifications(clinicId, dto)
  }
}
