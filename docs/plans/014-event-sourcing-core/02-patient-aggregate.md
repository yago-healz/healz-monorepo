# Fase 2: Patient Aggregate

## Objetivo

Implementar o primeiro agregado completo (Patient) como proof of concept, incluindo eventos, projection (read model via Drizzle) e API REST temporaria para testes.

## Pre-requisitos

- Fase 1 concluida (Event Store Foundation)

## Escopo

### O que sera implementado

1. **Agregado Patient** - Logica de dominio e regras de negocio
2. **Eventos** - PatientRegistered, PatientUpdated
3. **Projection** - patient_view (schema Drizzle + event handler)
4. **Command Handlers** - Orquestram o fluxo
5. **API REST temporaria** - Para testes manuais

### O que NAO sera implementado

- Integracao com WhatsApp (Fase 3)
- Jornada do paciente (Fase 7)
- API definitiva (sera substituida quando houver UI)

## Estrutura de Arquivos

```
apps/api/src/
+-- db/schema/
|   +-- patient-view.schema.ts    # NOVO - Projection table
|   +-- index.ts                  # Atualizar com export
+-- patient/
|   +-- patient.module.ts
|   +-- domain/
|   |   +-- patient.aggregate.ts
|   |   +-- events/
|   |   |   +-- patient-registered.event.ts
|   |   |   +-- patient-updated.event.ts
|   +-- application/
|   |   +-- commands/
|   |   |   +-- register-patient.handler.ts
|   |   |   +-- update-patient.handler.ts
|   |   +-- event-handlers/
|   |       +-- patient-projection.handler.ts
|   +-- api/
|       +-- patient.controller.ts
|       +-- dtos/
|           +-- register-patient.dto.ts
|           +-- update-patient.dto.ts
```

## Projection Schema (Drizzle)

```typescript
// src/db/schema/patient-view.schema.ts

import { pgTable, uuid, varchar, date, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

export const patientView = pgTable("patient_view", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  clinicId: uuid("clinic_id").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  fullName: varchar("full_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  birthDate: date("birth_date"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex("patient_view_phone_tenant_unique").on(table.phone, table.tenantId),
  index("idx_patient_view_tenant").on(table.tenantId),
  index("idx_patient_view_clinic").on(table.clinicId),
  index("idx_patient_view_status").on(table.status),
]);
```

## Eventos

Todos os eventos seguem o padrao `DomainEvent<T>` definido na Fase 1.

```typescript
// domain/events/patient-registered.event.ts

import { randomUUID } from "crypto";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";

export interface PatientRegisteredData {
  patient_id: string;
  tenant_id: string;
  clinic_id: string;
  phone: string;
  full_name?: string;
  email?: string;
  birth_date?: string;
}

export function createPatientRegisteredEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  data: PatientRegisteredData;
}): DomainEvent<PatientRegisteredData> {
  return {
    event_id: randomUUID(),
    event_type: "PatientRegistered",
    aggregate_type: "Patient",
    aggregate_id: params.aggregateId,
    aggregate_version: params.aggregateVersion,
    tenant_id: params.tenantId,
    clinic_id: params.clinicId,
    correlation_id: params.correlationId,
    causation_id: params.causationId,
    user_id: params.userId,
    created_at: new Date(),
    event_data: params.data,
  };
}
```

```typescript
// domain/events/patient-updated.event.ts

// Mesmo padrao - factory function que retorna DomainEvent<PatientUpdatedData>
export interface PatientUpdatedData {
  patient_id: string;
  updates: {
    full_name?: string;
    email?: string;
    birth_date?: string;
  };
}

export function createPatientUpdatedEvent(params: {
  aggregateId: string;
  aggregateVersion: number;
  tenantId: string;
  clinicId: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  data: PatientUpdatedData;
}): DomainEvent<PatientUpdatedData> {
  return {
    event_id: randomUUID(),
    event_type: "PatientUpdated",
    aggregate_type: "Patient",
    aggregate_id: params.aggregateId,
    aggregate_version: params.aggregateVersion,
    tenant_id: params.tenantId,
    clinic_id: params.clinicId,
    correlation_id: params.correlationId,
    causation_id: params.causationId,
    user_id: params.userId,
    created_at: new Date(),
    event_data: params.data,
  };
}
```

**Nota:** Usamos factory functions ao inves de classes para os eventos. Sao mais simples, testam mais facil, e seguem o padrao funcional do projeto.

## Agregado Patient

```typescript
// domain/patient.aggregate.ts

import { AggregateRoot } from "../../event-sourcing/domain/aggregate-root";
import { DomainEvent } from "../../event-sourcing/domain/domain-event.interface";
import { createPatientRegisteredEvent, PatientRegisteredData } from "./events/patient-registered.event";
import { createPatientUpdatedEvent, PatientUpdatedData } from "./events/patient-updated.event";

export type PatientStatus = "active" | "inactive" | "suspended";

export class Patient extends AggregateRoot {
  private tenantId: string;
  private clinicId: string;
  private phone: string;
  private fullName?: string;
  private email?: string;
  private birthDate?: string;
  private status: PatientStatus;

  private constructor() {
    super();
  }

  static register(params: {
    patientId: string;
    tenantId: string;
    clinicId: string;
    phone: string;
    fullName?: string;
    email?: string;
    birthDate?: string;
    correlationId: string;
    userId?: string;
  }): Patient {
    const patient = new Patient();

    if (!params.phone) {
      throw new Error("Phone is required");
    }

    const event = createPatientRegisteredEvent({
      aggregateId: params.patientId,
      aggregateVersion: 1,
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      correlationId: params.correlationId,
      userId: params.userId,
      data: {
        patient_id: params.patientId,
        tenant_id: params.tenantId,
        clinic_id: params.clinicId,
        phone: params.phone,
        full_name: params.fullName,
        email: params.email,
        birth_date: params.birthDate,
      },
    });

    patient.addEvent(event);
    return patient;
  }

  update(params: {
    fullName?: string;
    email?: string;
    birthDate?: string;
    correlationId: string;
    userId?: string;
  }): void {
    if (this.status === "suspended") {
      throw new Error("Cannot update suspended patient");
    }

    const event = createPatientUpdatedEvent({
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      tenantId: this.tenantId,
      clinicId: this.clinicId,
      correlationId: params.correlationId,
      userId: params.userId,
      data: {
        patient_id: this.id,
        updates: {
          full_name: params.fullName,
          email: params.email,
          birth_date: params.birthDate,
        },
      },
    });

    this.addEvent(event);
  }

  protected applyEvent(event: DomainEvent): void {
    switch (event.event_type) {
      case "PatientRegistered":
        this.applyPatientRegistered(event.event_data as PatientRegisteredData);
        break;
      case "PatientUpdated":
        this.applyPatientUpdated(event.event_data as PatientUpdatedData);
        break;
    }
  }

  private applyPatientRegistered(data: PatientRegisteredData): void {
    this.id = data.patient_id;
    this.tenantId = data.tenant_id;
    this.clinicId = data.clinic_id;
    this.phone = data.phone;
    this.fullName = data.full_name;
    this.email = data.email;
    this.birthDate = data.birth_date;
    this.status = "active";
  }

  private applyPatientUpdated(data: PatientUpdatedData): void {
    if (data.updates.full_name !== undefined) this.fullName = data.updates.full_name;
    if (data.updates.email !== undefined) this.email = data.updates.email;
    if (data.updates.birth_date !== undefined) this.birthDate = data.updates.birth_date;
  }

  // Getters
  getPhone(): string { return this.phone; }
  getTenantId(): string { return this.tenantId; }
  getClinicId(): string { return this.clinicId; }
  getFullName(): string | undefined { return this.fullName; }
  getStatus(): PatientStatus { return this.status; }
}
```

## Projection Handler (Drizzle)

```typescript
// application/event-handlers/patient-projection.handler.ts

import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db, patientView } from "../../../db";
import { DomainEvent } from "../../../event-sourcing/domain/domain-event.interface";
import { IEventHandler } from "../../../event-sourcing/domain/event-handler.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { PatientRegisteredData } from "../../domain/events/patient-registered.event";
import { PatientUpdatedData } from "../../domain/events/patient-updated.event";

@Injectable()
export class PatientProjectionHandler implements IEventHandler, OnModuleInit {
  constructor(@Inject("IEventBus") private readonly eventBus: IEventBus) {}

  onModuleInit() {
    this.eventBus.subscribe("PatientRegistered", this);
    this.eventBus.subscribe("PatientUpdated", this);
  }

  async handle(event: DomainEvent): Promise<void> {
    switch (event.event_type) {
      case "PatientRegistered":
        await this.onPatientRegistered(event.event_data as PatientRegisteredData, event.created_at);
        break;
      case "PatientUpdated":
        await this.onPatientUpdated(event.event_data as PatientUpdatedData, event.created_at);
        break;
    }
  }

  private async onPatientRegistered(data: PatientRegisteredData, createdAt: Date): Promise<void> {
    await db.insert(patientView).values({
      id: data.patient_id,
      tenantId: data.tenant_id,
      clinicId: data.clinic_id,
      phone: data.phone,
      fullName: data.full_name,
      email: data.email,
      birthDate: data.birth_date,
      status: "active",
      metadata: {},
      createdAt,
      updatedAt: createdAt,
    });
  }

  private async onPatientUpdated(data: PatientUpdatedData, createdAt: Date): Promise<void> {
    const updates: Record<string, any> = { updatedAt: createdAt };
    if (data.updates.full_name !== undefined) updates.fullName = data.updates.full_name;
    if (data.updates.email !== undefined) updates.email = data.updates.email;
    if (data.updates.birth_date !== undefined) updates.birthDate = data.updates.birth_date;

    await db.update(patientView).set(updates).where(eq(patientView.id, data.patient_id));
  }
}
```

**Padrao de registro de handlers:** Cada handler implementa `OnModuleInit` e se registra no EventBus via `subscribe()`. Isso e feito no startup da aplicacao, antes do RabbitMQ comecar a consumir mensagens.

## Command Handler

```typescript
// application/commands/register-patient.handler.ts

import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import { IEventStore } from "../../../event-sourcing/event-store/event-store.interface";
import { IEventBus } from "../../../event-sourcing/event-bus/event-bus.interface";
import { Patient } from "../../domain/patient.aggregate";
import { CorrelationUtil } from "../../../event-sourcing/utils/correlation.util";

@Injectable()
export class RegisterPatientHandler {
  constructor(
    @Inject("IEventStore") private readonly eventStore: IEventStore,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
  ) {}

  async execute(command: {
    tenantId: string;
    clinicId: string;
    phone: string;
    fullName?: string;
    email?: string;
    birthDate?: string;
    userId?: string;
  }): Promise<string> {
    const patient = Patient.register({
      patientId: randomUUID(),
      tenantId: command.tenantId,
      clinicId: command.clinicId,
      phone: command.phone,
      fullName: command.fullName,
      email: command.email,
      birthDate: command.birthDate,
      correlationId: CorrelationUtil.generate("register-patient"),
      userId: command.userId,
    });

    const events = patient.getUncommittedEvents();
    await this.eventStore.appendMany(events);
    await this.eventBus.publishMany(events);

    return patient.getId();
  }
}
```

## API REST Temporaria

```typescript
// api/patient.controller.ts

import { Controller, Post, Get, Patch, Param, Body, Query, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db, patientView } from "../../../db";
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
```

## DTOs

```typescript
// api/dtos/register-patient.dto.ts

import { IsUUID, IsString, IsOptional, IsEmail, IsDateString, Matches } from "class-validator";

export class RegisterPatientDto {
  @IsUUID()
  tenant_id: string;

  @IsUUID()
  clinic_id: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phone: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;
}
```

## Module

```typescript
// patient/patient.module.ts

import { Module } from "@nestjs/common";
import { PatientController } from "./api/patient.controller";
import { RegisterPatientHandler } from "./application/commands/register-patient.handler";
import { UpdatePatientHandler } from "./application/commands/update-patient.handler";
import { PatientProjectionHandler } from "./application/event-handlers/patient-projection.handler";

@Module({
  controllers: [PatientController],
  providers: [
    RegisterPatientHandler,
    UpdatePatientHandler,
    PatientProjectionHandler,
  ],
  exports: [RegisterPatientHandler, UpdatePatientHandler],
})
export class PatientModule {}
```

## Testes

```typescript
describe("Patient Aggregate", () => {
  it("should register new patient", () => {
    const patient = Patient.register({
      patientId: "patient-123",
      tenantId: "tenant-1",
      clinicId: "clinic-1",
      phone: "+5511999999999",
      fullName: "Joao Silva",
      correlationId: "corr-1",
    });

    const events = patient.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("PatientRegistered");
    expect(events[0].event_data.phone).toBe("+5511999999999");
  });

  it("should not register without phone", () => {
    expect(() => {
      Patient.register({
        patientId: "p-1", tenantId: "t-1", clinicId: "c-1",
        phone: "", correlationId: "corr-1",
      });
    }).toThrow("Phone is required");
  });

  it("should reconstruct from history", () => {
    const patient = Patient.register({
      patientId: "p-1", tenantId: "t-1", clinicId: "c-1",
      phone: "+5511999999999", correlationId: "corr-1",
    });

    const events = patient.getUncommittedEvents();
    const reconstructed = new (Patient as any)();
    reconstructed.loadFromHistory(events);

    expect(reconstructed.getPhone()).toBe("+5511999999999");
    expect(reconstructed.getVersion()).toBe(1);
  });
});
```

## Checklist de Implementacao

- [x] Criar schema Drizzle `patient-view.schema.ts` ✅
- [x] Exportar no `schema/index.ts` e gerar migration ✅
- [x] Criar factory functions dos eventos ✅
- [x] Implementar agregado Patient ✅
- [x] Implementar PatientProjectionHandler ✅
- [x] Implementar RegisterPatientHandler e UpdatePatientHandler ✅
- [x] Criar DTOs ✅
- [x] Implementar PatientController ✅
- [x] Criar PatientModule e registrar no AppModule ✅
- [x] Criar testes E2E da API ✅
- [x] Rodar testes E2E e validar fluxo completo ✅
