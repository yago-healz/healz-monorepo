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
import { CreateAndLinkProcedureDto } from './dto/create-and-link-procedure.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { IsClinicAdminOrSelfDoctorGuard } from '../../common/guards/is-clinic-admin-or-self-doctor.guard'

@ApiTags('Doctors')
@Controller('clinics/:clinicId/doctors/:doctorId/procedures')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
export class DoctorClinicProceduresController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post()
  @UseGuards(IsClinicAdminOrSelfDoctorGuard)
  @ApiOperation({ summary: 'Vincular procedimento ao médico na clínica' })
  link(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
    @Body() dto: LinkProcedureDto,
  ) {
    return this.doctorService.linkProcedure(clinicId, doctorId, dto)
  }

  @Post('create')
  @UseGuards(IsClinicAdminOrSelfDoctorGuard)
  @ApiOperation({ summary: 'Criar procedimento e vincular ao médico' })
  createAndLink(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
    @Body() dto: CreateAndLinkProcedureDto,
  ) {
    return this.doctorService.createAndLinkProcedure(clinicId, doctorId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Listar procedimentos do médico na clínica' })
  list(@Param('clinicId') clinicId: string, @Param('doctorId') doctorId: string) {
    return this.doctorService.listProcedures(clinicId, doctorId)
  }

  @Patch(':procedureId')
  @UseGuards(IsClinicAdminOrSelfDoctorGuard)
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
  @UseGuards(IsClinicAdminOrSelfDoctorGuard)
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
