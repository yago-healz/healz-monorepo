# Plano 042 — Refatorar GetServicesTool e Remover clinic_services

**Objetivo:** Fazer a Carol responder com os procedimentos reais da clínica (tabela `procedures`) ao invés de dados desatualizados da tabela legacy `clinic_services`, e remover toda referência à tabela legacy.

---

## Contexto

A Carol usa a tool `get_services` para responder sobre procedimentos. Essa tool chama `ClinicSettingsService.getServices()` que busca da tabela `clinic_services` (JSON blob legacy). Porém, a clínica agora gerencia procedimentos via tabela normalizada `procedures` com CRUD completo no frontend (aba Serviços em Settings). Os dados em `clinic_services` estão desatualizados/vazios, causando respostas incorretas.

### Fonte de verdade atual

```
procedures (catálogo da clínica)
├── id, clinicId, name, description, category, defaultDuration, isActive

doctor_clinic_procedures (preço/duração por médico)
├── id, doctorClinicId, procedureId, price, durationOverride, isActive
```

### Análise de uso da `clinic_services`

| Local | Uso | Ação |
|---|---|---|
| `clinic-settings.schema.ts` | Definição da tabela | Remover export |
| `clinic-settings.service.ts` | `getServices()` / `saveServices()` | Remover métodos |
| `clinic-settings.controller.ts` | `GET/PATCH :clinicId/settings/services` | Remover endpoints |
| `clinic-services.dto.ts` | DTOs do JSONB | Deletar arquivo |
| `get-services.tool.ts` | Carol tool | Refatorar para usar `procedures` |
| `09-clinic-settings.seeder.ts` | Seed de dados | Remover bloco de services |
| `seed.ts` / `reset.ts` | Referência `clinic_services` na lista de truncate | Remover |
| `clinic-settings.data.ts` | `CLINIC_SERVICES_DATA` | Remover constante |
| `clinic-settings.api.ts` (web) | `useClinicServices` / `useSaveClinicServices` | Remover (nunca importados) |
| `clinic-settings-endpoints.ts` (web) | `SERVICES` endpoint | Remover |
| Migration Drizzle | Tabela no banco | Gerar migration para DROP TABLE |

## Arquivos afetados

### Modificar
1. `apps/api/src/modules/carol/tools/get-services.tool.ts` — refatorar para buscar de `procedures` + `doctorClinicProcedures`
2. `apps/api/src/modules/carol/chat/carol-chat.service.ts` — passar `ProceduresService` ao invés de `ClinicSettingsService` para o GetServicesTool
3. `apps/api/src/modules/carol/carol.module.ts` — importar `ProceduresModule`
4. `apps/api/src/modules/clinic-settings/clinic-settings.service.ts` — remover `getServices()` e `saveServices()`
5. `apps/api/src/modules/clinic-settings/clinic-settings.controller.ts` — remover endpoints services
6. `apps/api/src/infrastructure/database/schema/clinic-settings.schema.ts` — remover export de `clinicServices`
7. `apps/api/src/infrastructure/database/seeds/seeders/09-clinic-settings.seeder.ts` — remover bloco de services
8. `apps/api/src/infrastructure/database/seeds/seed.ts` — remover `clinic_services` do truncate
9. `apps/api/src/infrastructure/database/seeds/reset.ts` — remover `clinic_services` do truncate
10. `apps/api/src/infrastructure/database/seeds/data/clinic-settings.data.ts` — remover `CLINIC_SERVICES_DATA`
11. `apps/web/src/features/clinic/api/clinic-settings.api.ts` — remover hooks e tipos de services
12. `apps/web/src/lib/api/clinic-settings-endpoints.ts` — remover `SERVICES`

### Deletar
13. `apps/api/src/modules/clinic-settings/dto/clinic-services.dto.ts`

### Criar
14. Migration Drizzle para DROP TABLE `clinic_services`

---

## Implementação

### 1. Refatorar GetServicesTool para usar `procedures`

**Arquivo:** `apps/api/src/modules/carol/tools/get-services.tool.ts`

Trocar a dependência de `ClinicSettingsService` para buscar diretamente da tabela `procedures` via Drizzle (query simples, sem precisar injetar ProceduresService inteiro). Incluir preços dos médicos quando disponíveis.

**Nova implementação:**
```typescript
import { StructuredTool } from "@langchain/core/tools";
import { Logger } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../infrastructure/database";
import { procedures, doctorClinicProcedures, doctorClinics } from "../../../infrastructure/database/schema";

export class GetServicesTool extends StructuredTool {
  name = "get_services";
  description = "Lista os procedimentos oferecidos pela clínica com duração e valores por profissional";
  schema = z.object({});

  private readonly logger = new Logger(GetServicesTool.name);

  constructor(private readonly clinicId: string) {
    super();
  }

  async _call(): Promise<string> {
    this.logger.debug(`Fetching procedures for clinic ${this.clinicId}`);

    // 1. Buscar procedimentos ativos da clínica
    const rows = await db
      .select()
      .from(procedures)
      .where(and(
        eq(procedures.clinicId, this.clinicId),
        eq(procedures.isActive, true),
      ));

    if (!rows.length) {
      return JSON.stringify({ services: [] });
    }

    // 2. Buscar preços dos profissionais (LEFT JOIN simplificado)
    const procedureIds = rows.map(r => r.id);
    const prices = await db
      .select({
        procedureId: doctorClinicProcedures.procedureId,
        price: doctorClinicProcedures.price,
        durationOverride: doctorClinicProcedures.durationOverride,
      })
      .from(doctorClinicProcedures)
      .innerJoin(doctorClinics, eq(doctorClinicProcedures.doctorClinicId, doctorClinics.id))
      .where(and(
        eq(doctorClinics.clinicId, this.clinicId),
        eq(doctorClinicProcedures.isActive, true),
      ));

    // 3. Agrupar preços por procedimento (pegar range min-max)
    const priceMap = new Map<string, { minPrice: number | null; maxPrice: number | null }>();
    for (const p of prices) {
      const current = priceMap.get(p.procedureId) ?? { minPrice: null, maxPrice: null };
      const val = p.price ? Number(p.price) : null;
      if (val !== null) {
        current.minPrice = current.minPrice === null ? val : Math.min(current.minPrice, val);
        current.maxPrice = current.maxPrice === null ? val : Math.max(current.maxPrice, val);
      }
      priceMap.set(p.procedureId, current);
    }

    // 4. Montar resposta
    const services = rows.map(proc => {
      const pricing = priceMap.get(proc.id);
      return {
        name: proc.name,
        description: proc.description,
        category: proc.category,
        duration: `${proc.defaultDuration} minutos`,
        ...(pricing?.minPrice != null && {
          price: pricing.minPrice === pricing.maxPrice
            ? `R$ ${pricing.minPrice.toFixed(2)}`
            : `R$ ${pricing.minPrice.toFixed(2)} - R$ ${pricing.maxPrice.toFixed(2)}`,
        }),
      };
    });

    this.logger.debug(`Found ${services.length} procedures for clinic ${this.clinicId}`);
    return JSON.stringify({ services });
  }
}
```

**Done when:** Carol retorna procedimentos reais cadastrados na aba Settings > Serviços.

### 2. Atualizar carol-chat.service.ts

**Arquivo:** `apps/api/src/modules/carol/chat/carol-chat.service.ts`

O `GetServicesTool` não precisa mais de `ClinicSettingsService`. Simplificar a instanciação:

```typescript
// Antes
new GetServicesTool(clinicId, this.clinicSettingsService),

// Depois
new GetServicesTool(clinicId),
```

**Done when:** Tool é criada apenas com `clinicId`.

### 3. Remover código legacy do backend

#### 3a. `clinic-settings.service.ts`
Remover os métodos `getServices()` e `saveServices()`, e remover import de `clinicServices`.

#### 3b. `clinic-settings.controller.ts`
Remover os dois endpoints:
- `GET :clinicId/settings/services`
- `PATCH :clinicId/settings/services`

Remover import de `ClinicServicesDto`.

#### 3c. Deletar `dto/clinic-services.dto.ts`

#### 3d. `clinic-settings.schema.ts`
Remover o export `clinicServices` (linhas 36-50). Manter as demais tabelas intactas.

**Done when:** Nenhuma referência a `clinicServices` ou `clinic-services.dto` existe no módulo `clinic-settings`.

### 4. Limpar seeds

#### 4a. `09-clinic-settings.seeder.ts`
Remover:
- Import de `clinicServices`
- Bloco que insere na tabela `clinicServices` (linhas 56-62)

#### 4b. `data/clinic-settings.data.ts`
Remover a constante `CLINIC_SERVICES_DATA` e seu export.

#### 4c. `seed.ts` e `reset.ts`
Remover `clinic_services` da lista de tabelas para truncate.

**Done when:** Seeds rodam sem referência à tabela `clinic_services`.

### 5. Limpar frontend

#### 5a. `clinic-settings.api.ts`
Remover:
- Interface `ClinicServicesResponse` (linhas 111-117)
- Hook `useClinicServices` (linhas 119-130)
- Hook `useSaveClinicServices` (linhas 132-153)
- Import do tipo `Service` (se ficar sem uso)

#### 5b. `clinic-settings-endpoints.ts`
Remover a linha `SERVICES`.

**Done when:** Nenhuma referência a services settings no frontend.

### 6. Gerar migration para DROP TABLE

```bash
cd apps/api && pnpm drizzle-kit generate
```

Isso vai gerar um arquivo de migration que inclui `DROP TABLE clinic_services`.

**Done when:** Migration gerada e aplicável. Tabela `clinic_services` removida do banco.

---

## Ordem de execução

```
1. [Task 1] Refatorar GetServicesTool — é o fix principal
2. [Task 2] Atualizar carol-chat.service.ts — depende de 1
3. [Task 3a-3d] + [Task 4a-4c] + [Task 5a-5b] ← paralelo (remoções independentes)
4. [Task 6] Gerar migration — depende de 3d (schema alterado)
```

## Fora do escopo

- Alterar a tabela `procedures` (já está correta)
- Alterar a UI de gerenciamento de procedimentos (já usa `procedures`)
- Incluir dados de médicos específicos na resposta da Carol (apenas preços agregados)
- Alterar outras tools da Carol (`get_clinic_info`, `check_availability`, etc.)
