import { Module } from '@nestjs/common'
import { ClinicSettingsModule } from '../clinic-settings/clinic-settings.module'
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module'
import { CarolConfigService } from './carol-config.service'
import { CarolConfigController } from './carol-config.controller'
import { CarolChatService } from './chat/carol-chat.service'
import { CarolChatController } from './chat/carol-chat.controller'
import { MockIntentDetector } from './infrastructure/mock-intent-detector.service'
import { EscalationTriggerService } from './escalation-trigger.service'
import { EscalationTriggerController } from './escalation-trigger.controller'

@Module({
  imports: [ClinicSettingsModule, GoogleCalendarModule],
  providers: [
    CarolConfigService,
    CarolChatService,
    MockIntentDetector,
    EscalationTriggerService,
    {
      provide: 'IIntentDetector',
      useClass: MockIntentDetector,
    },
  ],
  controllers: [CarolConfigController, CarolChatController, EscalationTriggerController],
  exports: [CarolConfigService, 'IIntentDetector'],
})
export class CarolModule {}
