import { Module } from "@nestjs/common";
import { AppointmentController } from "./api/appointment.controller";
import { AppointmentService } from "./application/appointment.service";
import { AppointmentProjectionHandler } from "./application/event-handlers/appointment-projection.handler";

@Module({
  controllers: [AppointmentController],
  providers: [AppointmentService, AppointmentProjectionHandler],
  exports: [AppointmentService],
})
export class AppointmentModule {}
