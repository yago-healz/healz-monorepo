import { Module } from '@nestjs/common'
import { GoogleCalendarService } from './google-calendar.service'
import { GoogleCalendarController } from './google-calendar.controller'
import { GoogleCalendarSyncHandler } from './google-calendar-sync.handler'
import { DoctorGoogleCalendarService } from './doctor-google-calendar.service'
import { DoctorGoogleCalendarController } from './doctor-google-calendar.controller'

@Module({
  controllers: [GoogleCalendarController, DoctorGoogleCalendarController],
  providers: [GoogleCalendarService, GoogleCalendarSyncHandler, DoctorGoogleCalendarService],
  exports: [GoogleCalendarService, DoctorGoogleCalendarService],
})
export class GoogleCalendarModule {}
