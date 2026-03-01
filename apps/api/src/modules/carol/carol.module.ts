import { Module } from '@nestjs/common'
import { ClinicSettingsModule } from '../clinic-settings/clinic-settings.module'
import { CarolConfigService } from './carol-config.service'
import { CarolConfigController } from './carol-config.controller'
import { CarolChatService } from './chat/carol-chat.service'
import { CarolChatController } from './chat/carol-chat.controller'
import { MockIntentDetector } from './infrastructure/mock-intent-detector.service'

@Module({
  imports: [ClinicSettingsModule],
  providers: [
    CarolConfigService,
    CarolChatService,
    MockIntentDetector,
    {
      provide: 'IIntentDetector',
      useClass: MockIntentDetector,
    },
  ],
  controllers: [CarolConfigController, CarolChatController],
  exports: [CarolConfigService, 'IIntentDetector'],
})
export class CarolModule {}
