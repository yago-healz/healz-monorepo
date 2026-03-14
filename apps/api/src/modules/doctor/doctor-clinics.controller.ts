import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DoctorService } from './doctor.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface'

@ApiTags('Doctors')
@Controller('doctors')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
export class DoctorClinicsController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get(':doctorId/clinics')
  @ApiOperation({ summary: 'Listar clínicas onde o médico atua (filtrado por acesso do JWT)' })
  findClinics(@Param('doctorId') doctorId: string, @Request() req: { user: JwtPayload }) {
    const allowedClinicIds = req.user.clinicAccess.map((ca) => ca.clinicId)
    return this.doctorService.findDoctorClinics(doctorId, allowedClinicIds)
  }
}
