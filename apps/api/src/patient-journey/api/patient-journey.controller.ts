import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { patientJourneyView } from "../../db/schema/patient-journey-view.schema";

@Controller("journeys")
export class PatientJourneyController {
  @Get(":id")
  async findOne(@Param("id") id: string) {
    const [result] = await db
      .select()
      .from(patientJourneyView)
      .where(eq(patientJourneyView.id, id));

    if (!result) throw new NotFoundException("Journey not found");
    return result;
  }

  @Get()
  async findAll(
    @Query("patientId") patientId?: string,
    @Query("clinicId") clinicId?: string,
    @Query("stage") stage?: string,
    @Query("riskLevel") riskLevel?: string,
  ) {
    const conditions = [];
    if (patientId) conditions.push(eq(patientJourneyView.patientId, patientId));
    if (clinicId) conditions.push(eq(patientJourneyView.clinicId, clinicId));
    if (stage) conditions.push(eq(patientJourneyView.currentStage, stage));
    if (riskLevel) conditions.push(eq(patientJourneyView.riskLevel, riskLevel));

    return db
      .select()
      .from(patientJourneyView)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(patientJourneyView.updatedAt));
  }
}
