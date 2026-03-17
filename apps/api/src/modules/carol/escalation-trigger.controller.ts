import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../clinics/guards/is-clinic-admin.guard'
import { CreateEscalationTriggerDto } from './dto/create-escalation-trigger.dto'
import { UpdateEscalationTriggerDto } from './dto/update-escalation-trigger.dto'
import { EscalationTriggerService } from './escalation-trigger.service'

@ApiTags('Carol')
@Controller('clinics')
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth('bearer')
export class EscalationTriggerController {
  constructor(private readonly escalationTriggerService: EscalationTriggerService) {}

  @Get(':clinicId/carol/escalation-triggers')
  @ApiOperation({ summary: 'List escalation triggers' })
  list(@Param('clinicId') clinicId: string) {
    return this.escalationTriggerService.list(clinicId)
  }

  @Post(':clinicId/carol/escalation-triggers')
  @ApiOperation({ summary: 'Create escalation trigger' })
  create(
    @Param('clinicId') clinicId: string,
    @Body() dto: CreateEscalationTriggerDto,
  ) {
    return this.escalationTriggerService.create(clinicId, dto)
  }

  @Patch(':clinicId/carol/escalation-triggers/:triggerId')
  @ApiOperation({ summary: 'Update escalation trigger' })
  update(
    @Param('clinicId') clinicId: string,
    @Param('triggerId') triggerId: string,
    @Body() dto: UpdateEscalationTriggerDto,
  ) {
    return this.escalationTriggerService.update(clinicId, triggerId, dto)
  }

  @Delete(':clinicId/carol/escalation-triggers/:triggerId')
  @ApiOperation({ summary: 'Delete escalation trigger' })
  remove(
    @Param('clinicId') clinicId: string,
    @Param('triggerId') triggerId: string,
  ) {
    return this.escalationTriggerService.remove(clinicId, triggerId)
  }
}
