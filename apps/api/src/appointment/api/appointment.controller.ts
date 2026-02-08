import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db";
import { appointmentView } from "../../db/schema/appointment-view.schema";
import { AppointmentService } from "../application/appointment.service";
import {
  ScheduleAppointmentDto,
  ConfirmAppointmentDto,
  CancelAppointmentDto,
  RescheduleAppointmentDto,
} from "./dtos/appointment.dto";

@Controller("appointments")
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  async create(@Body() dto: ScheduleAppointmentDto) {
    const id = await this.appointmentService.schedule({
      patientId: dto.patientId,
      tenantId: dto.tenantId,
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      scheduledAt: new Date(dto.scheduledAt),
      duration: dto.duration,
      reason: dto.reason,
      notes: dto.notes,
    });
    return { id };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const [result] = await db
      .select()
      .from(appointmentView)
      .where(eq(appointmentView.id, id));

    if (!result) throw new NotFoundException("Appointment not found");
    return result;
  }

  @Get()
  async findAll(
    @Query("patientId") patientId?: string,
    @Query("clinicId") clinicId?: string,
    @Query("doctorId") doctorId?: string,
    @Query("status") status?: string,
  ) {
    const conditions = [];
    if (patientId) conditions.push(eq(appointmentView.patientId, patientId));
    if (clinicId) conditions.push(eq(appointmentView.clinicId, clinicId));
    if (doctorId) conditions.push(eq(appointmentView.doctorId, doctorId));
    if (status) conditions.push(eq(appointmentView.status, status));

    return db
      .select()
      .from(appointmentView)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(appointmentView.scheduledAt));
  }

  @Patch(":id/confirm")
  async confirm(@Param("id") id: string, @Body() dto: ConfirmAppointmentDto) {
    await this.appointmentService.confirm(id, dto.confirmedBy);
    return { message: "Appointment confirmed" };
  }

  @Patch(":id/cancel")
  async cancel(@Param("id") id: string, @Body() dto: CancelAppointmentDto) {
    await this.appointmentService.cancel(id, dto.cancelledBy, dto.reason);
    return { message: "Appointment cancelled" };
  }

  @Patch(":id/reschedule")
  async reschedule(
    @Param("id") id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    await this.appointmentService.reschedule(
      id,
      new Date(dto.newScheduledAt),
      dto.rescheduledBy,
      dto.reason,
    );
    return { message: "Appointment rescheduled" };
  }

  @Patch(":id/complete")
  async complete(@Param("id") id: string, @Body() dto: { notes?: string }) {
    await this.appointmentService.complete(id, dto.notes);
    return { message: "Appointment completed" };
  }

  @Patch(":id/no-show")
  async markNoShow(@Param("id") id: string) {
    await this.appointmentService.markNoShow(id);
    return { message: "Appointment marked as no-show" };
  }
}
