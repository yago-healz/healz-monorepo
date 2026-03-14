import { Module } from '@nestjs/common'
import { DoctorService } from './doctor.service'
import { DoctorController } from './doctor.controller'
import { DoctorClinicsController } from './doctor-clinics.controller'
import { DoctorClinicProceduresController } from './doctor-clinic-procedures.controller'

@Module({
  providers: [DoctorService],
  controllers: [DoctorController, DoctorClinicsController, DoctorClinicProceduresController],
  exports: [DoctorService],
})
export class DoctorModule {}
