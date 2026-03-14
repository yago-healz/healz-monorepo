# 05 — Procedures API

**Objetivo:** CRUD para o catálogo de procedimentos da clínica.

---

## Arquivos a criar

```
apps/api/src/modules/procedures/
├── procedures.module.ts
├── procedures.controller.ts
├── procedures.service.ts
└── dto/
    ├── create-procedure.dto.ts
    ├── update-procedure.dto.ts
    └── list-procedures-query.dto.ts
```

## Endpoints

| Método | Rota | Descrição | Guard |
|--------|------|-----------|-------|
| `POST` | `/clinics/:clinicId/procedures` | Criar procedimento | JwtAuthGuard + IsClinicAdminGuard |
| `GET` | `/clinics/:clinicId/procedures` | Listar procedimentos (com filtro por categoria e search) | JwtAuthGuard |
| `GET` | `/clinics/:clinicId/procedures/:id` | Detalhe de um procedimento | JwtAuthGuard |
| `PATCH` | `/clinics/:clinicId/procedures/:id` | Atualizar procedimento | JwtAuthGuard + IsClinicAdminGuard |
| `DELETE` | `/clinics/:clinicId/procedures/:id` | Desativar procedimento (soft delete) | JwtAuthGuard + IsClinicAdminGuard |

## DTOs

### CreateProcedureDto
```typescript
export class CreateProcedureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @IsInt()
  @Min(5)
  @Max(480)
  defaultDuration: number
}
```

### UpdateProcedureDto
```typescript
export class UpdateProcedureDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  defaultDuration?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
```

### ListProceduresQueryDto (extends PaginationQueryDto)
```typescript
export class ListProceduresQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string           // busca por name

  @IsOptional()
  @IsString()
  category?: string         // filtro exato por categoria

  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all' = 'active'
}
```

## Resposta (GET)

```typescript
{
  id: string
  clinicId: string
  name: string
  description: string | null
  category: string | null
  defaultDuration: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date | null
}
```

## Resposta (LIST)

```typescript
{
  data: ProcedureResponse[]
  meta: { page, limit, total, totalPages }
}
```

## Done when

- [ ] Module registrado no AppModule
- [ ] 5 endpoints funcionando com paginação e filtros
- [ ] Validações nos DTOs
- [ ] Guards aplicados
