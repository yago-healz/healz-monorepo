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
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DoctorService } from './doctor.service'
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto'
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../clinics/guards/is-clinic-admin.guard'

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

  @Get(':doctorId')
  @ApiOperation({ summary: 'Detalhe de um médico' })
  findOne(@Param('clinicId') clinicId: string, @Param('doctorId') doctorId: string) {
    return this.doctorService.findOne(clinicId, doctorId)
  }

  @Patch(':doctorId')
  @UseGuards(IsClinicAdminGuard)
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
}
