import { Module } from "@nestjs/common";
import { PatientController } from "./api/patient.controller";
import { RegisterPatientHandler } from "./application/commands/register-patient.handler";
import { UpdatePatientHandler } from "./application/commands/update-patient.handler";
import { PatientProjectionHandler } from "./application/event-handlers/patient-projection.handler";

@Module({
  controllers: [PatientController],
  providers: [
    RegisterPatientHandler,
    UpdatePatientHandler,
    PatientProjectionHandler,
  ],
  exports: [RegisterPatientHandler, UpdatePatientHandler],
})
export class PatientModule {}
