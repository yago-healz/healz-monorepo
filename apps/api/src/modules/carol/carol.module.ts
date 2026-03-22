import { Module } from '@nestjs/common'
import { ClinicSettingsModule } from '../clinic-settings/clinic-settings.module'
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module'
import { AppointmentModule } from '../appointment/appointment.module'
import { CarolConfigService } from './carol-config.service'
import { CarolConfigController } from './carol-config.controller'
import { CarolChatService } from './chat/carol-chat.service'
import { CarolChatController } from './chat/carol-chat.controller'
import { MockIntentDetector } from './infrastructure/mock-intent-detector.service'
import { EscalationTriggerService } from './escalation-trigger.service'
import { EscalationTriggerController } from './escalation-trigger.controller'
import { FaqService } from './faq.service'
import { FaqController } from './faq.controller'

@Module({
  imports: [ClinicSettingsModule, GoogleCalendarModule, AppointmentModule],
  providers: [
    CarolConfigService,
    CarolChatService,
    MockIntentDetector,
    EscalationTriggerService,
    FaqService,
    {
      provide: 'IIntentDetector',
      useClass: MockIntentDetector,
    },
  ],
  controllers: [CarolConfigController, CarolChatController, EscalationTriggerController, FaqController],
  exports: [CarolConfigService, 'IIntentDetector'],
})
export class CarolModule {}
