import { Logger } from '@nestjs/common'
import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ClinicSettingsService } from '../../clinic-settings/clinic-settings.service'

export class GetClinicInfoTool extends StructuredTool {
  name = 'get_clinic_info'
  description = 'Busca informações gerais da clínica: nome, descrição, endereço'
  schema = z.object({})

  private readonly logger = new Logger(GetClinicInfoTool.name)

  constructor(
    private readonly clinicId: string,
    private readonly settingsService: ClinicSettingsService,
  ) {
    super()
  }

  async _call(): Promise<string> {
    this.logger.debug(`[GetClinicInfoTool] Fetching clinic info for clinic ${this.clinicId}`)

    const general = await this.settingsService.getGeneral(this.clinicId)

    if (!general) {
      this.logger.warn(`[GetClinicInfoTool] Clinic not found for id ${this.clinicId}`)
      return JSON.stringify({ error: 'Clínica não encontrada' })
    }

    const result = {
      name: general.name,
      description: general.description,
      address: general.address
        ? `${general.address.street}, ${general.address.number} - ${general.address.neighborhood}, ${general.address.city}/${general.address.state}`
        : null,
    }

    this.logger.debug(`[GetClinicInfoTool] Clinic info retrieved`, {
      name: result.name,
      hasDescription: !!result.description,
      hasAddress: !!result.address,
    })

    return JSON.stringify(result)
  }
}
