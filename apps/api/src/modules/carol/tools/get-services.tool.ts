import { StructuredTool } from "@langchain/core/tools";
import { Logger } from "@nestjs/common";
import { z } from "zod";
import { ClinicSettingsService } from "../../clinic-settings/clinic-settings.service";

export class GetServicesTool extends StructuredTool {
  name = "get_services";
  description =
    "Lista os serviços oferecidos pela clínica com valores e duração";
  schema = z.object({});

  private readonly logger = new Logger(GetServicesTool.name);

  constructor(
    private readonly clinicId: string,
    private readonly settingsService: ClinicSettingsService,
  ) {
    super();
  }

  async _call(): Promise<string> {
    this.logger.debug(
      `[GetServicesTool] Fetching services for clinic ${this.clinicId}`,
    );

    const data = await this.settingsService.getServices(this.clinicId);

    if (!data?.services) {
      this.logger.debug(
        `[GetServicesTool] No services found for clinic ${this.clinicId}`,
      );
      return JSON.stringify({ services: [] });
    }

    const servicesList = Array.isArray(data.services) ? data.services : [];
    this.logger.debug(
      `[GetServicesTool] Services retrieved for clinic ${this.clinicId}`,
      {
        servicesCount: servicesList.length,
        services: servicesList.map((s: any) => ({
          name: s.name,
          duration: s.duration,
        })),
      },
    );

    return JSON.stringify({ services: data.services });
  }
}
