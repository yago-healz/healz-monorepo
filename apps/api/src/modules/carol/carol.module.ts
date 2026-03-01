import { Module } from '@nestjs/common'
import { ClinicSettingsModule } from '../clinic-settings/clinic-settings.module'
import { CarolConfigService } from './carol-config.service'
import { CarolConfigController } from './carol-config.controller'
import { CarolChatService } from './chat/carol-chat.service'
import { CarolChatController } from './chat/carol-chat.controller'

@Module({
  imports: [ClinicSettingsModule],
  providers: [CarolConfigService, CarolChatService],
  controllers: [CarolConfigController, CarolChatController],
  exports: [CarolConfigService],
})
export class CarolModule {}
