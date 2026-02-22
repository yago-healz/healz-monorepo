import { Controller, Post, Get, Patch, Param, Body, Query, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db, patientView } from "../../infrastructure/database";
import { RegisterPatientHandler } from "../application/commands/register-patient.handler";
import { UpdatePatientHandler } from "../application/commands/update-patient.handler";
import { RegisterPatientDto } from "./dtos/register-patient.dto";
import { UpdatePatientDto } from "./dtos/update-patient.dto";

@Controller("patients")
export class PatientController {
  constructor(
    private readonly registerHandler: RegisterPatientHandler,
    private readonly updateHandler: UpdatePatientHandler,
  ) {}

  @Post()
  async register(@Body() dto: RegisterPatientDto) {
    const patientId = await this.registerHandler.execute({
      tenantId: dto.tenant_id,
      clinicId: dto.clinic_id,
      phone: dto.phone,
      fullName: dto.full_name,
      email: dto.email,
      birthDate: dto.birth_date,
    });

    return { patient_id: patientId };
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    const [patient] = await db.select().from(patientView).where(eq(patientView.id, id));

    if (!patient) throw new NotFoundException("Patient not found");

    return patient;
  }

  @Get()
  async list(@Query("tenant_id") tenantId: string, @Query("clinic_id") clinicId?: string) {
    const conditions = [eq(patientView.tenantId, tenantId)];
    if (clinicId) conditions.push(eq(patientView.clinicId, clinicId));

    return db.select().from(patientView).where(and(...conditions));
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdatePatientDto) {
    await this.updateHandler.execute({
      patientId: id,
      fullName: dto.full_name,
      email: dto.email,
      birthDate: dto.birth_date,
    });

    return { success: true };
  }
}
