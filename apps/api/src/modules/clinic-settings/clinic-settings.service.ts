import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../infrastructure/database";
import {
  addresses,
  clinicCarolSettings,
  clinicNotifications,
  clinicObjectives,
  clinics,
  clinicScheduling,
  clinicServices,
} from "../../infrastructure/database/schema";
import { ClinicCarolSettingsDto } from "./dto/clinic-carol-settings.dto";
import {
  ClinicGeneralDto,
  GetClinicGeneralResponseDto,
} from "./dto/clinic-general.dto";
import { ClinicNotificationsDto } from "./dto/clinic-notifications.dto";
import { ClinicObjectivesDto } from "./dto/clinic-objectives.dto";
import { ClinicSchedulingDto } from "./dto/clinic-scheduling.dto";
import { ClinicServicesDto } from "./dto/clinic-services.dto";

@Injectable()
export class ClinicSettingsService {
  // OBJECTIVES
  async getObjectives(clinicId: string) {
    const result = await db
      .select()
      .from(clinicObjectives)
      .where(eq(clinicObjectives.clinicId, clinicId))
      .limit(1);

    return result[0] ?? null;
  }

  async saveObjectives(clinicId: string, dto: ClinicObjectivesDto) {
    // Upsert: se existe, atualiza; senão, cria
    const existing = await db
      .select()
      .from(clinicObjectives)
      .where(eq(clinicObjectives.clinicId, clinicId))
      .limit(1);

    if (existing.length > 0) {
      // UPDATE
      const [updated] = await db
        .update(clinicObjectives)
        .set({
          priorities: dto.priorities,
          painPoints: dto.painPoints,
          additionalNotes: dto.additionalNotes,
          updatedAt: new Date(),
        })
        .where(eq(clinicObjectives.clinicId, clinicId))
        .returning();

      return updated;
    } else {
      // INSERT
      const [created] = await db
        .insert(clinicObjectives)
        .values({
          clinicId,
          priorities: dto.priorities,
          painPoints: dto.painPoints,
          additionalNotes: dto.additionalNotes,
        })
        .returning();

      return created;
    }
  }

  // SERVICES
  async getServices(clinicId: string) {
    const result = await db
      .select()
      .from(clinicServices)
      .where(eq(clinicServices.clinicId, clinicId))
      .limit(1);

    return result[0] ?? null;
  }

  async saveServices(clinicId: string, dto: ClinicServicesDto) {
    const existing = await db
      .select()
      .from(clinicServices)
      .where(eq(clinicServices.clinicId, clinicId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(clinicServices)
        .set({
          services: dto.services,
          updatedAt: new Date(),
        })
        .where(eq(clinicServices.clinicId, clinicId))
        .returning();

      return updated;
    } else {
      const [created] = await db
        .insert(clinicServices)
        .values({
          clinicId,
          services: dto.services,
        })
        .returning();

      return created;
    }
  }

  // SCHEDULING
  async getScheduling(clinicId: string) {
    const result = await db
      .select()
      .from(clinicScheduling)
      .where(eq(clinicScheduling.clinicId, clinicId))
      .limit(1);

    return result[0] ?? null;
  }

  async saveScheduling(clinicId: string, dto: ClinicSchedulingDto) {
    const existing = await db
      .select()
      .from(clinicScheduling)
      .where(eq(clinicScheduling.clinicId, clinicId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(clinicScheduling)
        .set({
          weeklySchedule: dto.weeklySchedule,
          defaultAppointmentDuration: dto.defaultAppointmentDuration,
          minimumAdvanceHours: dto.minimumAdvanceHours,
          maxFutureDays: dto.maxFutureDays,
          specificBlocks: dto.specificBlocks,
          // Legacy fields (preserve if not provided)
          ...(dto.timeBlocks !== undefined && { timeBlocks: dto.timeBlocks }),
          ...(dto.minimumInterval !== undefined && {
            minimumInterval: dto.minimumInterval,
          }),
          updatedAt: new Date(),
        })
        .where(eq(clinicScheduling.clinicId, clinicId))
        .returning();

      return updated;
    } else {
      const [created] = await db
        .insert(clinicScheduling)
        .values({
          clinicId,
          weeklySchedule: dto.weeklySchedule,
          defaultAppointmentDuration: dto.defaultAppointmentDuration,
          minimumAdvanceHours: dto.minimumAdvanceHours,
          maxFutureDays: dto.maxFutureDays,
          specificBlocks: dto.specificBlocks,
          // Legacy fields (with defaults)
          timeBlocks: dto.timeBlocks ?? [],
          minimumInterval: dto.minimumInterval ?? 15,
        })
        .returning();

      return created;
    }
  }

  // CAROL SETTINGS
  async getCarolSettings(clinicId: string) {
    const result = await db
      .select()
      .from(clinicCarolSettings)
      .where(eq(clinicCarolSettings.clinicId, clinicId))
      .limit(1);

    return result[0] ?? null;
  }

  async saveCarolSettings(clinicId: string, dto: ClinicCarolSettingsDto) {
    const existing = await db
      .select()
      .from(clinicCarolSettings)
      .where(eq(clinicCarolSettings.clinicId, clinicId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(clinicCarolSettings)
        .set({
          selectedTraits: dto.selectedTraits,
          greeting: dto.greeting,
          restrictSensitiveTopics: dto.restrictSensitiveTopics,
          updatedAt: new Date(),
        })
        .where(eq(clinicCarolSettings.clinicId, clinicId))
        .returning();

      return updated;
    } else {
      const [created] = await db
        .insert(clinicCarolSettings)
        .values({
          clinicId,
          selectedTraits: dto.selectedTraits,
          greeting: dto.greeting,
          restrictSensitiveTopics: dto.restrictSensitiveTopics,
        })
        .returning();

      return created;
    }
  }

  // NOTIFICATIONS
  async getNotifications(clinicId: string) {
    const result = await db
      .select()
      .from(clinicNotifications)
      .where(eq(clinicNotifications.clinicId, clinicId))
      .limit(1);

    return result[0] ?? null;
  }

  async saveNotifications(clinicId: string, dto: ClinicNotificationsDto) {
    const existing = await db
      .select()
      .from(clinicNotifications)
      .where(eq(clinicNotifications.clinicId, clinicId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(clinicNotifications)
        .set({
          notificationSettings: dto.notificationSettings,
          alertChannel: dto.alertChannel,
          phoneNumber: dto.phoneNumber,
          updatedAt: new Date(),
        })
        .where(eq(clinicNotifications.clinicId, clinicId))
        .returning();

      return updated;
    } else {
      const [created] = await db
        .insert(clinicNotifications)
        .values({
          clinicId,
          notificationSettings: dto.notificationSettings,
          alertChannel: dto.alertChannel,
          phoneNumber: dto.phoneNumber,
        })
        .returning();

      return created;
    }
  }

  // GENERAL
  async getGeneral(
    clinicId: string,
  ): Promise<GetClinicGeneralResponseDto | null> {
    const result = await db
      .select()
      .from(clinics)
      .leftJoin(addresses, eq(clinics.addressId, addresses.id))
      .where(eq(clinics.id, clinicId))
      .limit(1);

    if (!result.length) return null;

    const { clinics: clinic, addresses: address } = result[0];

    return {
      id: clinic.id,
      name: clinic.name,
      description: clinic.description,
      address: address
        ? {
            id: address.id,
            street: address.street,
            number: address.number,
            complement: address.complement,
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
            country: address.country,
            createdAt: address.createdAt || new Date(),
            updatedAt: address.updatedAt,
          }
        : null,
    };
  }

  async saveGeneral(
    clinicId: string,
    dto: ClinicGeneralDto,
  ): Promise<GetClinicGeneralResponseDto | null> {
    // 1. Buscar clínica atual para saber se já tem addressId
    const [existing] = await db
      .select({ addressId: clinics.addressId })
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    if (!existing) return null;

    // 2. Upsert do endereço (se fornecido)
    let addressId = existing.addressId;
    if (dto.address) {
      const addressData = {
        street: dto.address.street,
        number: dto.address.number,
        complement: dto.address.complement ?? null,
        neighborhood: dto.address.neighborhood ?? null,
        city: dto.address.city,
        state: dto.address.state,
        zipCode: dto.address.zipCode,
        country: dto.address.country ?? "BR",
        updatedAt: new Date(),
      };

      if (addressId) {
        // Já tem endereço — atualizar
        await db
          .update(addresses)
          .set(addressData)
          .where(eq(addresses.id, addressId));
      } else {
        // Sem endereço — criar e vincular
        const [newAddress] = await db
          .insert(addresses)
          .values(addressData)
          .returning({ id: addresses.id });
        addressId = newAddress.id;
      }
    }

    // 3. Atualizar clínica (name, description, addressId)
    const clinicUpdates: Partial<typeof clinics.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) clinicUpdates.name = dto.name;
    if (dto.description !== undefined)
      clinicUpdates.description = dto.description;
    if (dto.address !== undefined) clinicUpdates.addressId = addressId;

    await db.update(clinics).set(clinicUpdates).where(eq(clinics.id, clinicId));

    // 4. Retornar estado atualizado
    return this.getGeneral(clinicId);
  }
}
