import { StructuredTool } from "@langchain/core/tools";
import { Logger } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../infrastructure/database";
import {
  doctorClinicProcedures,
  doctorClinics,
  procedures,
} from "../../../infrastructure/database/schema";

export class GetServicesTool extends StructuredTool {
  name = "get_services";
  description =
    "Lista os procedimentos oferecidos pela clínica com duração e valores por profissional";
  schema = z.object({});

  private readonly logger = new Logger(GetServicesTool.name);

  constructor(private readonly clinicId: string) {
    super();
  }

  async _call(): Promise<string> {
    this.logger.debug(`Fetching procedures for clinic ${this.clinicId}`);

    const rows = await db
      .select()
      .from(procedures)
      .where(
        and(
          eq(procedures.clinicId, this.clinicId),
          eq(procedures.isActive, true),
        ),
      );

    if (!rows.length) {
      return JSON.stringify({ services: [] });
    }

    const prices = await db
      .select({
        procedureId: doctorClinicProcedures.procedureId,
        price: doctorClinicProcedures.price,
        durationOverride: doctorClinicProcedures.durationOverride,
      })
      .from(doctorClinicProcedures)
      .innerJoin(
        doctorClinics,
        eq(doctorClinicProcedures.doctorClinicId, doctorClinics.id),
      )
      .where(
        and(
          eq(doctorClinics.clinicId, this.clinicId),
          eq(doctorClinicProcedures.isActive, true),
        ),
      );

    const priceMap = new Map<
      string,
      { minPrice: number | null; maxPrice: number | null }
    >();
    for (const p of prices) {
      const current = priceMap.get(p.procedureId) ?? {
        minPrice: null,
        maxPrice: null,
      };
      const val = p.price ? Number(p.price) : null;
      if (val !== null) {
        current.minPrice =
          current.minPrice === null ? val : Math.min(current.minPrice, val);
        current.maxPrice =
          current.maxPrice === null ? val : Math.max(current.maxPrice, val);
      }
      priceMap.set(p.procedureId, current);
    }

    const services = rows.map((proc) => {
      const pricing = priceMap.get(proc.id);
      return {
        name: proc.name,
        description: proc.description,
        category: proc.category,
        duration: `${proc.defaultDuration} minutos`,
        ...(pricing?.minPrice != null && {
          price:
            pricing.minPrice === pricing.maxPrice
              ? `R$ ${pricing.minPrice.toFixed(2)}`
              : `R$ ${pricing.minPrice.toFixed(2)} - R$ ${pricing.maxPrice!.toFixed(2)}`,
        }),
      };
    });

    this.logger.debug(
      `Found ${services.length} procedures for clinic ${this.clinicId}`,
    );
    return JSON.stringify({ services });
  }
}
