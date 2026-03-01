import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ClinicSettingsService } from '../../clinic-settings/clinic-settings.service'

export class GetClinicInfoTool extends StructuredTool {
  name = 'get_clinic_info'
  description = 'Busca informações gerais da clínica: nome, descrição, endereço'
  schema = z.object({})

  constructor(
    private readonly clinicId: string,
    private readonly settingsService: ClinicSettingsService,
  ) {
    super()
  }

  async _call(): Promise<string> {
    const general = await this.settingsService.getGeneral(this.clinicId)
    if (!general) return JSON.stringify({ error: 'Clínica não encontrada' })
    return JSON.stringify({
      name: general.name,
      description: general.description,
      address: general.address
        ? `${general.address.street}, ${general.address.number} - ${general.address.neighborhood}, ${general.address.city}/${general.address.state}`
        : null,
    })
  }
}
