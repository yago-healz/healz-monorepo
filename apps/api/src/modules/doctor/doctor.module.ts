import { Module } from '@nestjs/common'
import { DoctorService } from './doctor.service'
import { DoctorController } from './doctor.controller'
import { DoctorClinicsController } from './doctor-clinics.controller'

@Module({
  providers: [DoctorService],
  controllers: [DoctorController, DoctorClinicsController],
  exports: [DoctorService],
})
export class DoctorModule {}
