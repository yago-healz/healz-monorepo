import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { Request } from 'express'
import { DoctorService } from './doctor.service'
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto'
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto'
import { UpdateDoctorClinicDto } from './dto/update-doctor-clinic.dto'
import { DoctorScheduleDto } from './dto/doctor-schedule.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../clinics/guards/is-clinic-admin.guard'
import { IsClinicAdminOrSelfDoctorGuard } from '../../common/guards/is-clinic-admin-or-self-doctor.guard'
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface'

@ApiTags('Doctors')
@Controller('clinics/:clinicId/doctors')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post()
  @UseGuards(IsClinicAdminGuard)
  @ApiOperation({ summary: 'Criar perfil médico para um usuário existente' })
  create(@Param('clinicId') clinicId: string, @Body() dto: CreateDoctorProfileDto) {
    return this.doctorService.create(clinicId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Listar médicos da clínica' })
  findAll(@Param('clinicId') clinicId: string) {
    return this.doctorService.findAll(clinicId)
  }

  @Get('me')
  @ApiOperation({ summary: 'Obter perfil do médico logado nesta clínica' })
  getMe(@Param('clinicId') clinicId: string, @Req() req: Request) {
    const user = req.user as JwtPayload
    return this.doctorService.findByUserId(clinicId, user.userId)
  }

  @Get(':doctorId')
  @ApiOperation({ summary: 'Detalhe de um médico' })
  findOne(@Param('clinicId') clinicId: string, @Param('doctorId') doctorId: string) {
    return this.doctorService.findOne(clinicId, doctorId)
  }

  @Patch(':doctorId')
  @UseGuards(IsClinicAdminOrSelfDoctorGuard)
  @ApiOperation({ summary: 'Atualizar perfil do médico' })
  update(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    return this.doctorService.update(clinicId, doctorId, dto)
  }

  @Delete(':doctorId')
  @UseGuards(IsClinicAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar médico da clínica (soft delete)' })
  deactivate(@Param('clinicId') clinicId: string, @Param('doctorId') doctorId: string) {
    return this.doctorService.deactivate(clinicId, doctorId)
  }

  @Patch(':doctorId/link')
  @UseGuards(IsClinicAdminOrSelfDoctorGuard)
  @ApiOperation({ summary: 'Atualizar vínculo médico↔clínica (defaultDuration, notes, isActive)' })
  updateLink(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
    @Body() dto: UpdateDoctorClinicDto,
    @Req() req: Request,
  ) {
    const user = req.user as JwtPayload
    return this.doctorService.updateLink(clinicId, doctorId, dto, user.userId)
  }

  @Get(':doctorId/schedule')
  @ApiOperation({ summary: 'Obter agenda do médico na clínica' })
  getSchedule(@Param('clinicId') clinicId: string, @Param('doctorId') doctorId: string) {
    return this.doctorService.getSchedule(clinicId, doctorId)
  }

  @Patch(':doctorId/schedule')
  @UseGuards(IsClinicAdminOrSelfDoctorGuard)
  @ApiOperation({ summary: 'Salvar/atualizar agenda do médico na clínica' })
  saveSchedule(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
    @Body() dto: DoctorScheduleDto,
  ) {
    return this.doctorService.saveSchedule(clinicId, doctorId, dto)
  }
}
