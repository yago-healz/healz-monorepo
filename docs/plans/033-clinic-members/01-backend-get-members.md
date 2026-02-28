# Tarefa 01 — Backend: GET /clinics/{clinicId}/members

**Objetivo:** Criar endpoint de listagem de membros com busca server-side, paginação e inclusão de convites pendentes.

---

## Arquivos a criar/modificar

| Ação | Arquivo |
|------|---------|
| CRIAR | `apps/api/src/modules/clinics/dto/list-members-query.dto.ts` |
| CRIAR | `apps/api/src/modules/clinics/dto/clinic-member-response.dto.ts` |
| MODIFICAR | `apps/api/src/modules/clinics/clinics.service.ts` |
| MODIFICAR | `apps/api/src/modules/clinics/clinics.controller.ts` |

---

## 1. DTO: `list-members-query.dto.ts`

```typescript
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class ListMembersQueryDto {
  @ApiPropertyOptional({ description: "Filtro por nome ou email" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
```

---

## 2. DTO: `clinic-member-response.dto.ts`

```typescript
export class ClinicMemberDto {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending";
  emailVerified: boolean;
  joinedAt: string; // ISO string (createdAt do userClinicRole ou invites.createdAt)
}

export class ClinicMembersResponseDto {
  data: ClinicMemberDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

## 3. Service: `clinics.service.ts` — método `listMembers`

Adicionar método ao `ClinicsService`:

```typescript
async listMembers(
  clinicId: string,
  query: ListMembersQueryDto,
): Promise<ClinicMembersResponseDto> {
  const { search, page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;

  // 1. Membros ativos: JOIN userClinicRoles + users
  //    WHERE clinicId = clinicId
  //    AND (ilike name OR ilike email) se search
  //    ORDER BY userClinicRoles.createdAt DESC
  //    LIMIT limit OFFSET offset

  // 2. Convites pendentes: SELECT FROM invites
  //    WHERE clinicId = clinicId AND usedAt IS NULL AND expiresAt > NOW()
  //    AND (ilike name OR ilike email) se search

  // 3. UNION das duas listas — membros ativos primeiro, pendentes depois
  //    Mapear convites para ClinicMemberDto com:
  //      userId: invite.id  (sem userId real)
  //      status: 'pending'
  //      emailVerified: false
  //      role: invite.role
  //      joinedAt: invite.createdAt

  // 4. Calcular total = count membros + count pendentes (para meta)
  //    Retornar paginado
}
```

**Imports a adicionar no service:**
```typescript
import { ilike, or, and, eq, isNull, gt, count, desc } from "drizzle-orm";
import { invites } from "../../infrastructure/database/schema";
import { ListMembersQueryDto } from "./dto/list-members-query.dto";
import { ClinicMembersResponseDto } from "./dto/clinic-member-response.dto";
```

---

## 4. Controller: `clinics.controller.ts` — endpoint GET

```typescript
@Get(":clinicId/members")
@HttpCode(200)
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth("bearer")
@ApiOperation({ summary: "Listar membros da clínica" })
@ApiParam({ name: "clinicId", type: String })
@ApiQuery({ name: "search", required: false, type: String })
@ApiQuery({ name: "page", required: false, type: Number })
@ApiQuery({ name: "limit", required: false, type: Number })
async listMembers(
  @Param("clinicId") clinicId: string,
  @Query() query: ListMembersQueryDto,
) {
  return this.clinicsService.listMembers(clinicId, query);
}
```

**Imports adicionais no controller:**
```typescript
import { Get, Query } from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";
import { ListMembersQueryDto } from "./dto/list-members-query.dto";
```

---

## Pronto quando

- `GET /api/v1/clinics/{clinicId}/members` retorna `{ data: [...], meta: { total, page, limit, totalPages } }`
- Membros ativos têm `status: "active"` (ou `"inactive"` se `users.status !== 'active'`)
- Convites pendentes (não usados e não expirados) aparecem com `status: "pending"`
- `search` filtra por `name` ILIKE e `email` ILIKE
- Requer autenticação + `IsClinicAdminGuard`
- 401 sem token, 403 sem permissão
