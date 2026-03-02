import { Module } from '@nestjs/common'
import { ClinicSettingsService } from './clinic-settings.service'
import { ClinicSettingsController } from './clinic-settings.controller'
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module'

@Module({
  imports: [GoogleCalendarModule],
  providers: [ClinicSettingsService],
  controllers: [ClinicSettingsController],
  exports: [ClinicSettingsService],
})
export class ClinicSettingsModule {}
