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
import { LinkProcedureDto } from './dto/link-procedure.dto'
import { UpdateDoctorProcedureDto } from './dto/update-doctor-procedure.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../clinics/guards/is-clinic-admin.guard'

@ApiTags('Doctors')
@Controller('clinics/:clinicId/doctors/:doctorId/procedures')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
export class DoctorClinicProceduresController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post()
  @UseGuards(IsClinicAdminGuard)
  @ApiOperation({ summary: 'Vincular procedimento ao médico na clínica' })
  link(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
    @Body() dto: LinkProcedureDto,
  ) {
    return this.doctorService.linkProcedure(clinicId, doctorId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Listar procedimentos do médico na clínica' })
  list(@Param('clinicId') clinicId: string, @Param('doctorId') doctorId: string) {
    return this.doctorService.listProcedures(clinicId, doctorId)
  }

  @Patch(':procedureId')
  @UseGuards(IsClinicAdminGuard)
  @ApiOperation({ summary: 'Atualizar preço/duração do procedimento para este médico' })
  update(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
    @Param('procedureId') procedureId: string,
    @Body() dto: UpdateDoctorProcedureDto,
  ) {
    return this.doctorService.updateProcedure(clinicId, doctorId, procedureId, dto)
  }

  @Delete(':procedureId')
  @UseGuards(IsClinicAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desvincular procedimento do médico (soft delete)' })
  unlink(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
    @Param('procedureId') procedureId: string,
  ) {
    return this.doctorService.unlinkProcedure(clinicId, doctorId, procedureId)
  }
}
