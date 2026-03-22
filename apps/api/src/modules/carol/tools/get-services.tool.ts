import { StructuredTool } from "@langchain/core/tools";
import { Logger } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../infrastructure/database";
import {
  doctorClinicProcedures,
  doctorClinics,
  doctorProfiles,
  procedures,
  users,
} from "../../../infrastructure/database/schema";

export class GetServicesTool extends StructuredTool {
  name = "get_services";
  description =
    "Lista os procedimentos oferecidos pela clínica com duração e valores por profissional. " +
    "Se doctorId for fornecido, retorna apenas os procedimentos deste médico com seu preço específico.";
  schema = z.object({
    doctorId: z
      .string()
      .optional()
      .describe(
        "ID do médico para filtrar seus procedimentos específicos (obtido via list_doctors). Se omitido, lista todos da clínica.",
      ),
  });

  private readonly logger = new Logger(GetServicesTool.name);

  constructor(private readonly clinicId: string) {
    super();
  }

  async _call(input: { doctorId?: string }): Promise<string> {
    if (input.doctorId) {
      return this.getByDoctor(input.doctorId);
    }
    return this.getAllForClinic();
  }

  private async getByDoctor(doctorId: string): Promise<string> {
    this.logger.debug(
      `Fetching procedures for doctor ${doctorId} in clinic ${this.clinicId}`,
    );

    // Resolve doctorProfiles.id → users.id → doctorClinics link
    const [profile] = await db
      .select({ userId: doctorProfiles.userId })
      .from(doctorProfiles)
      .where(eq(doctorProfiles.id, doctorId))
      .limit(1);

    if (!profile) {
      return JSON.stringify({ services: [], total: 0 });
    }

    const [link] = await db
      .select({ id: doctorClinics.id })
      .from(doctorClinics)
      .where(
        and(
          eq(doctorClinics.doctorId, profile.userId),
          eq(doctorClinics.clinicId, this.clinicId),
          eq(doctorClinics.isActive, true),
        ),
      )
      .limit(1);

    if (!link) {
      return JSON.stringify({ services: [], total: 0 });
    }

    const [doctorUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, profile.userId))
      .limit(1);

    const rows = await db
      .select({
        name: procedures.name,
        description: procedures.description,
        category: procedures.category,
        defaultDuration: procedures.defaultDuration,
        durationOverride: doctorClinicProcedures.durationOverride,
        price: doctorClinicProcedures.price,
      })
      .from(doctorClinicProcedures)
      .innerJoin(
        procedures,
        eq(procedures.id, doctorClinicProcedures.procedureId),
      )
      .where(
        and(
          eq(doctorClinicProcedures.doctorClinicId, link.id),
          eq(doctorClinicProcedures.isActive, true),
          eq(procedures.isActive, true),
        ),
      );

    const services = rows.map((row) => {
      const effectiveDuration = row.durationOverride ?? row.defaultDuration;
      return {
        name: row.name,
        description: row.description,
        category: row.category,
        duration: `${effectiveDuration} minutos`,
        ...(row.price != null && {
          price: `R$ ${Number(row.price).toFixed(2)}`,
        }),
      };
    });

    this.logger.debug(
      `Found ${services.length} procedures for doctor ${doctorId} in clinic ${this.clinicId}`,
    );
    return JSON.stringify({
      doctor: doctorUser?.name ?? null,
      services,
      total: services.length,
    });
  }

  private async getAllForClinic(): Promise<string> {
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
