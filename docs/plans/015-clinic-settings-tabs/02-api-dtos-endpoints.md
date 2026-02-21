# Task 02 — API DTOs & Endpoints

**Objetivo:** Criar DTOs, Services, e Controllers para CRUD (salvar + restaurar) das 5 configurações de clínica.

---

## 📁 Arquivos Afetados

### Criar
- `apps/api/src/clinic-settings/clinic-settings.module.ts` (novo módulo)
- `apps/api/src/clinic-settings/dto/clinic-objectives.dto.ts`
- `apps/api/src/clinic-settings/dto/clinic-services.dto.ts`
- `apps/api/src/clinic-settings/dto/clinic-scheduling.dto.ts`
- `apps/api/src/clinic-settings/dto/clinic-carol-settings.dto.ts`
- `apps/api/src/clinic-settings/dto/clinic-notifications.dto.ts`
- `apps/api/src/clinic-settings/clinic-settings.service.ts`
- `apps/api/src/clinic-settings/clinic-settings.controller.ts`

### Modificar
- `apps/api/src/app.module.ts` (importar novo módulo)

---

## Implementação

### 1. DTOs

Criar 5 DTOs em `apps/api/src/clinic-settings/dto/`:

```typescript
// clinic-objectives.dto.ts
import { IsArray, IsString, IsOptional } from 'class-validator'

export interface Priority {
  id: string
  title: string
  description: string
}

export interface PainPoint {
  id: string
  title: string
  description: string
  selected: boolean
}

export class ClinicObjectivesDto {
  @IsArray()
  priorities: Priority[]

  @IsArray()
  painPoints: PainPoint[]

  @IsOptional()
  @IsString()
  additionalNotes?: string
}

export class GetClinicObjectivesResponseDto {
  id: string
  clinicId: string
  priorities: Priority[]
  painPoints: PainPoint[]
  additionalNotes?: string
  createdAt: Date
  updatedAt?: Date
}
```

```typescript
// clinic-services.dto.ts
import { IsArray } from 'class-validator'

export interface Service {
  id: string
  title: string
  description: string
  duration: string
  value: string
  note?: string
}

export class ClinicServicesDto {
  @IsArray()
  services: Service[]
}

export class GetClinicServicesResponseDto {
  id: string
  clinicId: string
  services: Service[]
  createdAt: Date
  updatedAt?: Date
}
```

```typescript
// clinic-scheduling.dto.ts
import { IsArray, IsInt, Min } from 'class-validator'

export interface TimeBlock {
  id: string
  from: string // HH:MM
  to: string   // HH:MM
}

export class ClinicSchedulingDto {
  @IsArray()
  timeBlocks: TimeBlock[]

  @IsInt()
  @Min(0)
  minimumInterval: number
}

export class GetClinicSchedulingResponseDto {
  id: string
  clinicId: string
  timeBlocks: TimeBlock[]
  minimumInterval: number
  createdAt: Date
  updatedAt?: Date
}
```

```typescript
// clinic-carol-settings.dto.ts
import { IsArray, IsString, IsBoolean } from 'class-validator'

export class ClinicCarolSettingsDto {
  @IsArray()
  selectedTraits: string[] // ["welcoming", "empathetic", ...]

  @IsString()
  greeting: string

  @IsBoolean()
  restrictSensitiveTopics: boolean
}

export class GetClinicCarolSettingsResponseDto {
  id: string
  clinicId: string
  selectedTraits: string[]
  greeting: string
  restrictSensitiveTopics: boolean
  createdAt: Date
  updatedAt?: Date
}
```

```typescript
// clinic-notifications.dto.ts
import { IsObject, IsString, IsOptional } from 'class-validator'

export interface NotificationSettings {
  newBooking: boolean
  riskOfLoss: boolean
}

export class ClinicNotificationsDto {
  @IsObject()
  notificationSettings: NotificationSettings

  @IsString()
  alertChannel: 'whatsapp' | 'email'

  @IsOptional()
  @IsString()
  phoneNumber?: string
}

export class GetClinicNotificationsResponseDto {
  id: string
  clinicId: string
  notificationSettings: NotificationSettings
  alertChannel: string
  phoneNumber?: string
  createdAt: Date
  updatedAt?: Date
}
```

### 2. Service

```typescript
// clinic-settings.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '../db'
import { eq } from 'drizzle-orm'
import {
  clinicObjectives,
  clinicServices,
  clinicScheduling,
  clinicCarolSettings,
  clinicNotifications,
} from '../db/schema'
import { ClinicObjectivesDto } from './dto/clinic-objectives.dto'
import { ClinicServicesDto } from './dto/clinic-services.dto'
import { ClinicSchedulingDto } from './dto/clinic-scheduling.dto'
import { ClinicCarolSettingsDto } from './dto/clinic-carol-settings.dto'
import { ClinicNotificationsDto } from './dto/clinic-notifications.dto'

@Injectable()
export class ClinicSettingsService {
  // OBJECTIVES
  async getObjectives(clinicId: string) {
    const result = await db
      .select()
      .from(clinicObjectives)
      .where(eq(clinicObjectives.clinicId, clinicId))
      .limit(1)

    if (!result.length) {
      throw new NotFoundException(
        'Configurações de objetivos não encontradas para esta clínica'
      )
    }

    return result[0]
  }

  async saveObjectives(clinicId: string, dto: ClinicObjectivesDto) {
    // Upsert: se existe, atualiza; senão, cria
    const existing = await db
      .select()
      .from(clinicObjectives)
      .where(eq(clinicObjectives.clinicId, clinicId))
      .limit(1)

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
        .returning()

      return updated
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
        .returning()

      return created
    }
  }

  // SERVICES
  async getServices(clinicId: string) {
    const result = await db
      .select()
      .from(clinicServices)
      .where(eq(clinicServices.clinicId, clinicId))
      .limit(1)

    if (!result.length) {
      throw new NotFoundException(
        'Configurações de serviços não encontradas para esta clínica'
      )
    }

    return result[0]
  }

  async saveServices(clinicId: string, dto: ClinicServicesDto) {
    const existing = await db
      .select()
      .from(clinicServices)
      .where(eq(clinicServices.clinicId, clinicId))
      .limit(1)

    if (existing.length > 0) {
      const [updated] = await db
        .update(clinicServices)
        .set({
          services: dto.services,
          updatedAt: new Date(),
        })
        .where(eq(clinicServices.clinicId, clinicId))
        .returning()

      return updated
    } else {
      const [created] = await db
        .insert(clinicServices)
        .values({
          clinicId,
          services: dto.services,
        })
        .returning()

      return created
    }
  }

  // SCHEDULING
  async getScheduling(clinicId: string) {
    const result = await db
      .select()
      .from(clinicScheduling)
      .where(eq(clinicScheduling.clinicId, clinicId))
      .limit(1)

    if (!result.length) {
      throw new NotFoundException(
        'Configurações de agendamento não encontradas para esta clínica'
      )
    }

    return result[0]
  }

  async saveScheduling(clinicId: string, dto: ClinicSchedulingDto) {
    const existing = await db
      .select()
      .from(clinicScheduling)
      .where(eq(clinicScheduling.clinicId, clinicId))
      .limit(1)

    if (existing.length > 0) {
      const [updated] = await db
        .update(clinicScheduling)
        .set({
          timeBlocks: dto.timeBlocks,
          minimumInterval: dto.minimumInterval,
          updatedAt: new Date(),
        })
        .where(eq(clinicScheduling.clinicId, clinicId))
        .returning()

      return updated
    } else {
      const [created] = await db
        .insert(clinicScheduling)
        .values({
          clinicId,
          timeBlocks: dto.timeBlocks,
          minimumInterval: dto.minimumInterval,
        })
        .returning()

      return created
    }
  }

  // CAROL SETTINGS
  async getCarolSettings(clinicId: string) {
    const result = await db
      .select()
      .from(clinicCarolSettings)
      .where(eq(clinicCarolSettings.clinicId, clinicId))
      .limit(1)

    if (!result.length) {
      throw new NotFoundException(
        'Configurações do Carol não encontradas para esta clínica'
      )
    }

    return result[0]
  }

  async saveCarolSettings(clinicId: string, dto: ClinicCarolSettingsDto) {
    const existing = await db
      .select()
      .from(clinicCarolSettings)
      .where(eq(clinicCarolSettings.clinicId, clinicId))
      .limit(1)

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
        .returning()

      return updated
    } else {
      const [created] = await db
        .insert(clinicCarolSettings)
        .values({
          clinicId,
          selectedTraits: dto.selectedTraits,
          greeting: dto.greeting,
          restrictSensitiveTopics: dto.restrictSensitiveTopics,
        })
        .returning()

      return created
    }
  }

  // NOTIFICATIONS
  async getNotifications(clinicId: string) {
    const result = await db
      .select()
      .from(clinicNotifications)
      .where(eq(clinicNotifications.clinicId, clinicId))
      .limit(1)

    if (!result.length) {
      throw new NotFoundException(
        'Configurações de notificações não encontradas para esta clínica'
      )
    }

    return result[0]
  }

  async saveNotifications(clinicId: string, dto: ClinicNotificationsDto) {
    const existing = await db
      .select()
      .from(clinicNotifications)
      .where(eq(clinicNotifications.clinicId, clinicId))
      .limit(1)

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
        .returning()

      return updated
    } else {
      const [created] = await db
        .insert(clinicNotifications)
        .values({
          clinicId,
          notificationSettings: dto.notificationSettings,
          alertChannel: dto.alertChannel,
          phoneNumber: dto.phoneNumber,
        })
        .returning()

      return created
    }
  }
}
```

### 3. Controller

```typescript
// clinic-settings.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger'
import { ClinicSettingsService } from './clinic-settings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../clinics/guards/is-clinic-admin.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface'
import { ClinicObjectivesDto } from './dto/clinic-objectives.dto'
import { ClinicServicesDto } from './dto/clinic-services.dto'
import { ClinicSchedulingDto } from './dto/clinic-scheduling.dto'
import { ClinicCarolSettingsDto } from './dto/clinic-carol-settings.dto'
import { ClinicNotificationsDto } from './dto/clinic-notifications.dto'

@ApiTags('Clinic Settings')
@Controller('clinics')
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth('bearer')
export class ClinicSettingsController {
  constructor(private service: ClinicSettingsService) {}

  // OBJECTIVES
  @Get(':clinicId/settings/objectives')
  @ApiOperation({
    summary: 'Obter configurações de objetivos da clínica',
  })
  async getObjectives(@Param('clinicId') clinicId: string) {
    return this.service.getObjectives(clinicId)
  }

  @Patch(':clinicId/settings/objectives')
  @ApiOperation({
    summary: 'Salvar configurações de objetivos da clínica',
  })
  async saveObjectives(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicObjectivesDto
  ) {
    return this.service.saveObjectives(clinicId, dto)
  }

  // SERVICES
  @Get(':clinicId/settings/services')
  @ApiOperation({
    summary: 'Obter configurações de serviços da clínica',
  })
  async getServices(@Param('clinicId') clinicId: string) {
    return this.service.getServices(clinicId)
  }

  @Patch(':clinicId/settings/services')
  @ApiOperation({
    summary: 'Salvar configurações de serviços da clínica',
  })
  async saveServices(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicServicesDto
  ) {
    return this.service.saveServices(clinicId, dto)
  }

  // SCHEDULING
  @Get(':clinicId/settings/scheduling')
  @ApiOperation({
    summary: 'Obter configurações de agendamento da clínica',
  })
  async getScheduling(@Param('clinicId') clinicId: string) {
    return this.service.getScheduling(clinicId)
  }

  @Patch(':clinicId/settings/scheduling')
  @ApiOperation({
    summary: 'Salvar configurações de agendamento da clínica',
  })
  async saveScheduling(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicSchedulingDto
  ) {
    return this.service.saveScheduling(clinicId, dto)
  }

  // CAROL SETTINGS
  @Get(':clinicId/settings/carol')
  @ApiOperation({
    summary: 'Obter configurações do Carol da clínica',
  })
  async getCarolSettings(@Param('clinicId') clinicId: string) {
    return this.service.getCarolSettings(clinicId)
  }

  @Patch(':clinicId/settings/carol')
  @ApiOperation({
    summary: 'Salvar configurações do Carol da clínica',
  })
  async saveCarolSettings(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicCarolSettingsDto
  ) {
    return this.service.saveCarolSettings(clinicId, dto)
  }

  // NOTIFICATIONS
  @Get(':clinicId/settings/notifications')
  @ApiOperation({
    summary: 'Obter configurações de notificações da clínica',
  })
  async getNotifications(@Param('clinicId') clinicId: string) {
    return this.service.getNotifications(clinicId)
  }

  @Patch(':clinicId/settings/notifications')
  @ApiOperation({
    summary: 'Salvar configurações de notificações da clínica',
  })
  async saveNotifications(
    @Param('clinicId') clinicId: string,
    @Body() dto: ClinicNotificationsDto
  ) {
    return this.service.saveNotifications(clinicId, dto)
  }
}
```

### 4. Module

```typescript
// clinic-settings.module.ts
import { Module } from '@nestjs/common'
import { ClinicSettingsService } from './clinic-settings.service'
import { ClinicSettingsController } from './clinic-settings.controller'

@Module({
  providers: [ClinicSettingsService],
  controllers: [ClinicSettingsController],
  exports: [ClinicSettingsService],
})
export class ClinicSettingsModule {}
```

### 5. Atualizar App Module

Em `apps/api/src/app.module.ts`, importar o novo módulo:

```typescript
import { ClinicSettingsModule } from './clinic-settings/clinic-settings.module'

@Module({
  imports: [
    // ... outros imports
    ClinicSettingsModule,
  ],
})
export class AppModule {}
```

---

## 📡 Endpoints

| Method | Path | Descrição |
|--------|------|-----------|
| GET | `/api/v1/clinics/:clinicId/settings/objectives` | Obter objetivos |
| PATCH | `/api/v1/clinics/:clinicId/settings/objectives` | Salvar objetivos |
| GET | `/api/v1/clinics/:clinicId/settings/services` | Obter serviços |
| PATCH | `/api/v1/clinics/:clinicId/settings/services` | Salvar serviços |
| GET | `/api/v1/clinics/:clinicId/settings/scheduling` | Obter agendamentos |
| PATCH | `/api/v1/clinics/:clinicId/settings/scheduling` | Salvar agendamentos |
| GET | `/api/v1/clinics/:clinicId/settings/carol` | Obter Carol settings |
| PATCH | `/api/v1/clinics/:clinicId/settings/carol` | Salvar Carol settings |
| GET | `/api/v1/clinics/:clinicId/settings/notifications` | Obter notificações |
| PATCH | `/api/v1/clinics/:clinicId/settings/notifications` | Salvar notificações |

---

## ✅ Critério de Sucesso

- [ ] Todos os DTOs criados e validando corretamente
- [ ] Service implementado com métodos get/save para cada aba (upsert pattern)
- [ ] Controller com endpoints GET e PATCH para cada configuração
- [ ] Autorizações: IsClinicAdminGuard em todos os endpoints
- [ ] Módulo registrado em app.module.ts
- [ ] Compilação sem erros TypeScript
- [ ] Endpoints testáveis em Postman (GET retorna 200, PATCH retorna 200 com dados salvos)
