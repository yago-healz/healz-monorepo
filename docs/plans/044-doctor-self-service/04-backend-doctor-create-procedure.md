# 04 — Permitir Doctor Criar Procedimento + Auto-Vincular

**Objetivo:** Doctor cria um procedimento no catalogo da clinica e este e automaticamente vinculado a ele.

**Depende de:** 01 (guard)

## Arquivos

**Modificar:**
- `apps/api/src/modules/doctor/doctor-clinic-procedures.controller.ts` — novo endpoint
- `apps/api/src/modules/doctor/doctor.service.ts` — novo metodo

**Criar:**
- `apps/api/src/modules/doctor/dto/create-and-link-procedure.dto.ts`

## Abordagem

Criar endpoint dedicado `POST /clinics/:clinicId/doctors/:doctorId/procedures/create` que:
1. Cria o procedimento no catalogo da clinica (reutilizando `ProceduresService.create`)
2. Vincula ao doctor automaticamente (reutilizando `DoctorService.linkProcedure`)

Isso e mais seguro que relaxar o guard do `POST /clinics/:clinicId/procedures` generico.

## DTO

```typescript
// create-and-link-procedure.dto.ts
export class CreateAndLinkProcedureDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsNumber()
  @Min(5)
  @Max(480)
  defaultDuration: number;

  // Campos opcionais do vinculo doctor<->procedure
  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(480)
  durationOverride?: number;
}
```

## Service

```typescript
// doctor.service.ts
async createAndLinkProcedure(
  clinicId: string,
  doctorId: string,
  dto: CreateAndLinkProcedureDto,
) {
  // 1. Criar procedimento no catalogo da clinica
  const procedure = await this.proceduresService.create(clinicId, {
    name: dto.name,
    description: dto.description,
    category: dto.category,
    defaultDuration: dto.defaultDuration,
  });

  // 2. Vincular ao doctor
  const link = await this.linkProcedure(clinicId, doctorId, {
    procedureId: procedure.id,
    price: dto.price,
    durationOverride: dto.durationOverride,
  });

  return link;
}
```

**Injecao:** O `DoctorService` precisa receber `ProceduresService` via constructor injection. Verificar se o `DoctorModule` importa `ProceduresModule` (ou se precisa usar `forwardRef`).

## Controller

```typescript
// doctor-clinic-procedures.controller.ts
@Post('create')
@UseGuards(IsClinicAdminOrSelfDoctorGuard)
@ApiOperation({ summary: 'Criar procedimento e vincular ao medico' })
createAndLink(
  @Param('clinicId') clinicId: string,
  @Param('doctorId') doctorId: string,
  @Body() dto: CreateAndLinkProcedureDto,
) {
  return this.doctorService.createAndLinkProcedure(clinicId, doctorId, dto);
}
```

**Rota resultante:** `POST /clinics/:clinicId/doctors/:doctorId/procedures/create`

## Dependencias de modulo

Verificar `apps/api/src/modules/doctor/doctor.module.ts`:
- Se `ProceduresService` nao esta disponivel, importar `ProceduresModule`
- Pode precisar exportar `ProceduresService` no `ProceduresModule`

## Feito quando

- [ ] `POST /clinics/:clinicId/doctors/:doctorId/procedures/create` existe e funciona
- [ ] Procedimento criado aparece no catalogo da clinica
- [ ] Procedimento automaticamente vinculado ao doctor
- [ ] Guard permite doctor fazer no seu proprio perfil
- [ ] Guard permite admin/manager fazer em qualquer doctor
- [ ] Guard bloqueia doctor fazendo em outro doctor
