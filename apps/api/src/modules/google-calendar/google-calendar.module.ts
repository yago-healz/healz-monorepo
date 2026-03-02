import { Module } from '@nestjs/common'
import { GoogleCalendarService } from './google-calendar.service'
import { GoogleCalendarController } from './google-calendar.controller'
import { GoogleCalendarSyncHandler } from './google-calendar-sync.handler'

@Module({
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService, GoogleCalendarSyncHandler],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
