import { Module } from "@nestjs/common";
import { PatientJourneyController } from "./api/patient-journey.controller";
import { JourneyProjectionHandler } from "./application/event-handlers/journey-projection.handler";
import { PatientJourneyService } from "./application/patient-journey.service";
import { PatientJourneyProcessManager } from "./application/process-managers/patient-journey.process-manager";

@Module({
  controllers: [PatientJourneyController],
  providers: [
    PatientJourneyService,
    JourneyProjectionHandler,
    PatientJourneyProcessManager,
  ],
  exports: [PatientJourneyService],
})
export class PatientJourneyModule {}
