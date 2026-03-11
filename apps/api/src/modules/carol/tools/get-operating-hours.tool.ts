import { Logger } from '@nestjs/common'
import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ClinicSettingsService } from '../../clinic-settings/clinic-settings.service'

export class GetOperatingHoursTool extends StructuredTool {
  name = 'get_operating_hours'
  description = 'Retorna os horários de funcionamento da clínica por dia da semana'
  schema = z.object({})

  private readonly logger = new Logger(GetOperatingHoursTool.name)

  constructor(
    private readonly clinicId: string,
    private readonly settingsService: ClinicSettingsService,
  ) {
    super()
  }

  async _call(): Promise<string> {
    this.logger.debug(`[GetOperatingHoursTool] Fetching operating hours for clinic ${this.clinicId}`)

    const data = await this.settingsService.getScheduling(this.clinicId)

    if (!data?.weeklySchedule) {
      this.logger.warn(`[GetOperatingHoursTool] No weeklySchedule configured for clinic ${this.clinicId}`)
      return JSON.stringify({ schedule: [] })
    }

    const result = {
      schedule: data.weeklySchedule,
      appointmentDuration: data.defaultAppointmentDuration,
    }

    this.logger.debug(`[GetOperatingHoursTool] Operating hours retrieved for clinic ${this.clinicId}`, {
      daysConfigured: (data.weeklySchedule as any[]).filter((d: any) => d.isOpen).length,
      defaultAppointmentDuration: data.defaultAppointmentDuration,
    })

    return JSON.stringify(result)
  }
}
