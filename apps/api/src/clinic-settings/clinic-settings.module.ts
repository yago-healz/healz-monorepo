import { Module } from '@nestjs/common'
import { ClinicSettingsService } from './clinic-settings.service'
import { ClinicSettingsController } from './clinic-settings.controller'

@Module({
  providers: [ClinicSettingsService],
  controllers: [ClinicSettingsController],
  exports: [ClinicSettingsService],
})
export class ClinicSettingsModule {}
