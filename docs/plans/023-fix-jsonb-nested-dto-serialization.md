# Plano 023 — Fix: Serialização de objetos aninhados em DTOs JSONB

**Objetivo:** Corrigir a serialização incorreta de `priorities` e `painPoints` (e outros arrays de objetos) que chegam como `[[], [], []]` em vez dos objetos reais ao salvar configurações de objetivos da clínica.

---

## Contexto

### Root Cause

O `ValidationPipe` está configurado com:
```typescript
whitelist: true
transform: true
enableImplicitConversion: true
```

Os tipos aninhados nos DTOs (`Priority`, `PainPoint`, `Service`, `TimeBlock`) são **TypeScript interfaces** — não classes. Interfaces são apagadas em runtime (TypeScript erasure), portanto o `class-transformer` não consegue determinar o tipo de cada item no array.

Com `enableImplicitConversion: true`, o class-transformer tenta converter cada item do array para o tipo inferido via reflect-metadata. Como interfaces não existem em runtime, ele acaba fazendo algo equivalente a `Array.from({id, title, description})` — que para um objeto sem `Symbol.iterator` ou `length` retorna `[]`.

**Resultado:** cada objeto `{id, title, description}` vira `[]`.

### DTOs afetados

| Arquivo | Interface problemática |
|---|---|
| `clinic-objectives.dto.ts` | `Priority`, `PainPoint` |
| `clinic-services.dto.ts` | `Service` |
| `clinic-scheduling.dto.ts` | `TimeBlock` |

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/api/src/clinic-settings/dto/clinic-objectives.dto.ts` | Modificar |
| `apps/api/src/clinic-settings/dto/clinic-services.dto.ts` | Modificar |
| `apps/api/src/clinic-settings/dto/clinic-scheduling.dto.ts` | Modificar |

Nenhum outro arquivo precisa ser alterado. O service, controller, schema e frontend estão corretos.

---

## Implementação

### 1. Corrigir `clinic-objectives.dto.ts`

Converter `Priority` e `PainPoint` de interfaces para classes com decoradores de validação. Adicionar `@ValidateNested({ each: true })` e `@Type()` nos campos do DTO.

**Conteúdo final do arquivo:**

```typescript
import {
  IsArray,
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class PriorityDto {
  @IsString()
  id: string

  @IsString()
  title: string

  @IsString()
  description: string
}

export class PainPointDto {
  @IsString()
  id: string

  @IsString()
  title: string

  @IsString()
  description: string

  @IsBoolean()
  selected: boolean
}

export class ClinicObjectivesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriorityDto)
  priorities: PriorityDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PainPointDto)
  painPoints: PainPointDto[]

  @IsOptional()
  @IsString()
  additionalNotes?: string
}

export class GetClinicObjectivesResponseDto {
  id: string
  clinicId: string
  priorities: PriorityDto[]
  painPoints: PainPointDto[]
  additionalNotes?: string
  createdAt: Date
  updatedAt?: Date
}
```

> **Nota:** Manter `Priority` e `PainPoint` como aliases de tipo se necessário para compatibilidade, mas o DTO passa a usar as classes.

### 2. Corrigir `clinic-services.dto.ts`

```typescript
import { IsArray, IsString, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class ServiceDto {
  @IsString()
  id: string

  @IsString()
  title: string

  @IsString()
  description: string

  @IsString()
  duration: string

  @IsString()
  value: string

  @IsOptional()
  @IsString()
  note?: string
}

export class ClinicServicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  services: ServiceDto[]
}

export class GetClinicServicesResponseDto {
  id: string
  clinicId: string
  services: ServiceDto[]
  createdAt: Date
  updatedAt?: Date
}
```

### 3. Corrigir `clinic-scheduling.dto.ts`

```typescript
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class TimeBlockDto {
  @IsString()
  id: string

  @IsString()
  from: string // HH:MM

  @IsString()
  to: string // HH:MM
}

export class ClinicSchedulingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeBlockDto)
  timeBlocks: TimeBlockDto[]

  @IsInt()
  @Min(0)
  minimumInterval: number
}

export class GetClinicSchedulingResponseDto {
  id: string
  clinicId: string
  timeBlocks: TimeBlockDto[]
  minimumInterval: number
  createdAt: Date
  updatedAt?: Date
}
```

---

## Ordem de execução

Os 3 arquivos são **independentes entre si** — podem ser alterados em paralelo ou sequencialmente.

```
1. clinic-objectives.dto.ts  ─┐
2. clinic-services.dto.ts    ─┼─ paralelos (sem dependência mútua)
3. clinic-scheduling.dto.ts  ─┘
```

---

## Verificação

Após as alterações, testar via frontend ou curl:

```bash
# Salvar objetivos
curl -X PATCH http://localhost:3001/api/v1/clinics/{clinicId}/settings/objectives \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "priorities": [{"id":"efficiency","title":"Eficiência Operacional","description":"Reduza o tempo..."}],
    "painPoints": [{"id":"no-shows","title":"Pacientes que não comparecem","description":"...","selected":true}],
    "additionalNotes": "teste"
  }'
```

**Esperado:** response com `priorities` e `painPoints` contendo os objetos reais (não `[]`).

---

## Fora do escopo

- Alterações no frontend
- Alterações no service, controller ou schema Drizzle
- Migração de banco (nenhuma mudança de schema)
- DTOs de `clinic-carol-settings.dto.ts` e `clinic-notifications.dto.ts` (não usam arrays de objetos aninhados, não afetados)
