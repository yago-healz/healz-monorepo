import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ClinicSettingsService } from '../../clinic-settings/clinic-settings.service'

export class GetOperatingHoursTool extends StructuredTool {
  name = 'get_operating_hours'
  description = 'Retorna os horários de funcionamento da clínica por dia da semana'
  schema = z.object({})

  constructor(
    private readonly clinicId: string,
    private readonly settingsService: ClinicSettingsService,
  ) {
    super()
  }

  async _call(): Promise<string> {
    const data = await this.settingsService.getScheduling(this.clinicId)
    if (!data?.weeklySchedule) return JSON.stringify({ schedule: [] })
    return JSON.stringify({
      schedule: data.weeklySchedule,
      appointmentDuration: data.defaultAppointmentDuration,
    })
  }
}
