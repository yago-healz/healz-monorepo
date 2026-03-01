# Fase 02 — Backend: Configuração + Sistema de Versões

## Objetivo

Criar os endpoints dedicados de configuração da Carol no módulo `carol`, com suporte a Draft/Published. Migrar a responsabilidade de config da Carol do `ClinicSettingsController` para um `CarolConfigController` próprio.

## Pré-requisitos

- Fase 01 concluída (schema com novos campos + status)

## Pode ser feita em paralelo com

- Fase 03 (Backend LangChain + Chat)

---

## Arquivos

### Criar
- `apps/api/src/modules/carol/carol-config.controller.ts`
- `apps/api/src/modules/carol/carol-config.service.ts`
- `apps/api/src/modules/carol/dto/save-carol-config.dto.ts`
- `apps/api/src/modules/carol/dto/carol-config-response.dto.ts`

### Modificar
- `apps/api/src/modules/carol/carol.module.ts` — adicionar controller + service
- `apps/api/src/modules/clinic-settings/clinic-settings.controller.ts` — remover endpoints de Carol
- `apps/api/src/modules/clinic-settings/clinic-settings.service.ts` — remover métodos de Carol (ou manter exportados para compatibilidade e refatorar depois)

---

## Endpoints

### Base: `/api/v1/clinics/:clinicId/carol`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/config` | Retorna configuração draft da clínica |
| `PUT` | `/config` | Salva/atualiza configuração draft |
| `POST` | `/config/publish` | Publica o draft (copia dados para row published) |
| `GET` | `/config/published` | Retorna configuração publicada (ou null) |

---

## Controller

```typescript
// carol-config.controller.ts

@ApiTags('Carol')
@Controller('clinics')
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth('bearer')
export class CarolConfigController {
  constructor(private readonly carolConfigService: CarolConfigService) {}

  @Get(':clinicId/carol/config')
  @ApiOperation({ summary: 'Get Carol draft config' })
  async getDraftConfig(@Param('clinicId') clinicId: string) {
    return this.carolConfigService.getDraftConfig(clinicId)
  }

  @Put(':clinicId/carol/config')
  @ApiOperation({ summary: 'Save Carol draft config' })
  async saveDraftConfig(
    @Param('clinicId') clinicId: string,
    @Body() dto: SaveCarolConfigDto,
  ) {
    return this.carolConfigService.saveDraftConfig(clinicId, dto)
  }

  @Post(':clinicId/carol/config/publish')
  @ApiOperation({ summary: 'Publish Carol draft config' })
  async publishConfig(@Param('clinicId') clinicId: string) {
    return this.carolConfigService.publishDraft(clinicId)
  }

  @Get(':clinicId/carol/config/published')
  @ApiOperation({ summary: 'Get Carol published config' })
  async getPublishedConfig(@Param('clinicId') clinicId: string) {
    return this.carolConfigService.getPublishedConfig(clinicId)
  }
}
```

---

## DTOs

### SaveCarolConfigDto (Request)

```typescript
export class SaveCarolConfigDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string  // default: 'Carol'

  @IsArray()
  @IsOptional()
  selectedTraits?: string[]

  @IsString()
  @IsIn(['formal', 'informal', 'empathetic'])
  @IsOptional()
  voiceTone?: string

  @IsString()
  @IsOptional()
  greeting?: string

  @IsBoolean()
  @IsOptional()
  restrictSensitiveTopics?: boolean

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SchedulingRulesDto)
  schedulingRules?: SchedulingRulesDto
}

export class SchedulingRulesDto {
  @IsBoolean()
  @IsOptional()
  confirmBeforeScheduling?: boolean

  @IsBoolean()
  @IsOptional()
  allowCancellation?: boolean

  @IsBoolean()
  @IsOptional()
  allowRescheduling?: boolean

  @IsString()
  @IsOptional()
  postSchedulingMessage?: string
}
```

### CarolConfigResponseDto (Response)

```typescript
export class CarolConfigResponseDto {
  id: string
  clinicId: string
  name: string
  selectedTraits: string[]
  voiceTone: string
  greeting: string
  restrictSensitiveTopics: boolean
  schedulingRules: Record<string, any>
  status: 'draft' | 'published'
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date | null
}
```

---

## Service

```typescript
// carol-config.service.ts

@Injectable()
export class CarolConfigService {
  // GET draft: busca row com status='draft'
  async getDraftConfig(clinicId: string): Promise<CarolConfigResponseDto | null> {
    const result = await db
      .select()
      .from(clinicCarolSettings)
      .where(
        and(
          eq(clinicCarolSettings.clinicId, clinicId),
          eq(clinicCarolSettings.status, 'draft'),
        ),
      )
      .limit(1)

    return result[0] ?? null
  }

  // SAVE draft: upsert na row draft
  async saveDraftConfig(clinicId: string, dto: SaveCarolConfigDto) {
    const existing = await this.getDraftConfig(clinicId)

    if (existing) {
      // UPDATE — merge parcial (só atualiza campos enviados)
      const [updated] = await db
        .update(clinicCarolSettings)
        .set({
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.selectedTraits !== undefined && { selectedTraits: dto.selectedTraits }),
          ...(dto.voiceTone !== undefined && { voiceTone: dto.voiceTone }),
          ...(dto.greeting !== undefined && { greeting: dto.greeting }),
          ...(dto.restrictSensitiveTopics !== undefined && { restrictSensitiveTopics: dto.restrictSensitiveTopics }),
          ...(dto.schedulingRules !== undefined && { schedulingRules: dto.schedulingRules }),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(clinicCarolSettings.clinicId, clinicId),
            eq(clinicCarolSettings.status, 'draft'),
          ),
        )
        .returning()

      return updated
    } else {
      // INSERT novo draft
      const [created] = await db
        .insert(clinicCarolSettings)
        .values({
          clinicId,
          name: dto.name ?? 'Carol',
          selectedTraits: dto.selectedTraits ?? [],
          voiceTone: dto.voiceTone ?? 'empathetic',
          greeting: dto.greeting ?? '',
          restrictSensitiveTopics: dto.restrictSensitiveTopics ?? true,
          schedulingRules: dto.schedulingRules ?? {},
          status: 'draft',
        })
        .returning()

      return created
    }
  }

  // PUBLISH: copia draft para published
  async publishDraft(clinicId: string) {
    const draft = await this.getDraftConfig(clinicId)
    if (!draft) throw new NotFoundException('Draft config not found')

    const publishedData = {
      clinicId,
      name: draft.name,
      selectedTraits: draft.selectedTraits,
      voiceTone: draft.voiceTone,
      greeting: draft.greeting,
      restrictSensitiveTopics: draft.restrictSensitiveTopics,
      schedulingRules: draft.schedulingRules,
      status: 'published' as const,
      publishedAt: new Date(),
      updatedAt: new Date(),
    }

    // Upsert na row published
    const existing = await this.getPublishedConfig(clinicId)

    if (existing) {
      const [updated] = await db
        .update(clinicCarolSettings)
        .set(publishedData)
        .where(
          and(
            eq(clinicCarolSettings.clinicId, clinicId),
            eq(clinicCarolSettings.status, 'published'),
          ),
        )
        .returning()
      return updated
    } else {
      const [created] = await db
        .insert(clinicCarolSettings)
        .values(publishedData)
        .returning()
      return created
    }
  }

  // GET published
  async getPublishedConfig(clinicId: string) {
    const result = await db
      .select()
      .from(clinicCarolSettings)
      .where(
        and(
          eq(clinicCarolSettings.clinicId, clinicId),
          eq(clinicCarolSettings.status, 'published'),
        ),
      )
      .limit(1)

    return result[0] ?? null
  }

  // Usado internamente pela Fase 03 (Chat) para buscar config ativa
  async getConfigByVersion(clinicId: string, version: 'draft' | 'published') {
    return version === 'draft'
      ? this.getDraftConfig(clinicId)
      : this.getPublishedConfig(clinicId)
  }
}
```

---

## Atualização do CarolModule

```typescript
// carol.module.ts (atualizado)

@Module({
  imports: [ClinicSettingsModule], // Para acesso a dados da clínica nas tools
  providers: [
    CarolConfigService,
    // Mock providers continuam por enquanto
    { provide: 'IIntentDetector', useClass: MockIntentDetector },
    { provide: 'IResponseGenerator', useClass: MockResponseGenerator },
  ],
  controllers: [CarolConfigController],
  exports: [CarolConfigService],
})
export class CarolModule {}
```

---

## Limpeza do ClinicSettings

Remover do `ClinicSettingsController`:
- `GET :clinicId/settings/carol`
- `PATCH :clinicId/settings/carol`

Remover do `ClinicSettingsService`:
- `getCarolSettings()`
- `saveCarolSettings()`

Atualizar no frontend `clinic-settings-endpoints.ts`:
- Remover `CAROL` dos endpoints de settings

**Nota:** Manter os dados existentes na tabela. A migration apenas adiciona campos, não remove.

---

## Migração de Dados Existentes

Os registros atuais em `clinic_carol_settings` não têm o campo `status`. A migration adicionará o campo com default `'draft'`, o que faz com que todos os registros existentes se tornem drafts automaticamente.

---

## Checklist

- [ ] Criar `SaveCarolConfigDto` e `CarolConfigResponseDto`
- [ ] Criar `CarolConfigService` com métodos de draft/published
- [ ] Criar `CarolConfigController` com 4 endpoints
- [ ] Atualizar `CarolModule` (imports, providers, controllers)
- [ ] Remover endpoints de Carol do `ClinicSettingsController`
- [ ] Remover métodos de Carol do `ClinicSettingsService`
- [ ] Testar: salvar draft, publicar, buscar published
