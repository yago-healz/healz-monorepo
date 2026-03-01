import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ClinicSettingsService } from '../../clinic-settings/clinic-settings.service'

export class GetServicesTool extends StructuredTool {
  name = 'get_services'
  description = 'Lista os serviços oferecidos pela clínica com valores e duração'
  schema = z.object({})

  constructor(
    private readonly clinicId: string,
    private readonly settingsService: ClinicSettingsService,
  ) {
    super()
  }

  async _call(): Promise<string> {
    const data = await this.settingsService.getServices(this.clinicId)
    if (!data?.services) return JSON.stringify({ services: [] })
    return JSON.stringify({ services: data.services })
  }
}
