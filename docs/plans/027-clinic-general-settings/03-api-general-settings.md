# Tarefa 03 — API: endpoint `/settings/general`

**Objetivo:** Criar DTOs, métodos de service e endpoints GET/PATCH para configurações gerais da clínica (nome, descrição, endereço).

**Pré-requisito:** Tarefa 02 concluída (migration aplicada).

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `apps/api/src/modules/clinic-settings/dto/clinic-general.dto.ts` | Criar |
| `apps/api/src/modules/clinic-settings/clinic-settings.service.ts` | Modificar |
| `apps/api/src/modules/clinic-settings/clinic-settings.controller.ts` | Modificar |

---

## Implementação

### `dto/clinic-general.dto.ts` (novo)

```typescript
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  state: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}

export class ClinicGeneralDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

export class GetClinicGeneralResponseDto {
  id: string;
  name: string;
  description?: string | null;
  address?: {
    id: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood?: string | null;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    createdAt: Date;
    updatedAt?: Date | null;
  } | null;
}
```

---

### `clinic-settings.service.ts` (modificar)

Adicionar imports necessários no topo:

```typescript
import { addresses, clinics } from "../../infrastructure/database/schema";
// (ajustar path conforme estrutura do projeto)
```

Adicionar dois métodos à classe `ClinicSettingsService`:

```typescript
async getGeneral(clinicId: string): Promise<GetClinicGeneralResponseDto | null> {
  // JOIN clinics com addresses
  const result = await this.db
    .select()
    .from(clinics)
    .leftJoin(addresses, eq(clinics.addressId, addresses.id))
    .where(eq(clinics.id, clinicId))
    .limit(1);

  if (!result.length) return null;

  const { clinics: clinic, addresses: address } = result[0];

  return {
    id: clinic.id,
    name: clinic.name,
    description: clinic.description,
    address: address
      ? {
          id: address.id,
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          country: address.country,
          createdAt: address.createdAt,
          updatedAt: address.updatedAt,
        }
      : null,
  };
}

async saveGeneral(
  clinicId: string,
  dto: ClinicGeneralDto,
): Promise<GetClinicGeneralResponseDto | null> {
  // 1. Buscar clínica atual para saber se já tem addressId
  const [existing] = await this.db
    .select({ addressId: clinics.addressId })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  if (!existing) return null;

  // 2. Upsert do endereço (se fornecido)
  let addressId = existing.addressId;
  if (dto.address) {
    const addressData = {
      street: dto.address.street,
      number: dto.address.number,
      complement: dto.address.complement ?? null,
      neighborhood: dto.address.neighborhood ?? null,
      city: dto.address.city,
      state: dto.address.state,
      zipCode: dto.address.zipCode,
      country: dto.address.country ?? "BR",
      updatedAt: new Date(),
    };

    if (addressId) {
      // Já tem endereço — atualizar
      await this.db
        .update(addresses)
        .set(addressData)
        .where(eq(addresses.id, addressId));
    } else {
      // Sem endereço — criar e vincular
      const [newAddress] = await this.db
        .insert(addresses)
        .values(addressData)
        .returning({ id: addresses.id });
      addressId = newAddress.id;
    }
  }

  // 3. Atualizar clínica (name, description, addressId)
  const clinicUpdates: Partial<typeof clinics.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (dto.name !== undefined) clinicUpdates.name = dto.name;
  if (dto.description !== undefined) clinicUpdates.description = dto.description;
  if (dto.address !== undefined) clinicUpdates.addressId = addressId;

  await this.db
    .update(clinics)
    .set(clinicUpdates)
    .where(eq(clinics.id, clinicId));

  // 4. Retornar estado atualizado
  return this.getGeneral(clinicId);
}
```

---

### `clinic-settings.controller.ts` (modificar)

Adicionar imports e dois novos endpoints no controller:

```typescript
import { ClinicGeneralDto, GetClinicGeneralResponseDto } from "./dto/clinic-general.dto";

// Dentro da classe ClinicSettingsController:

@Get("general")
async getGeneral(@Param("clinicId") clinicId: string): Promise<GetClinicGeneralResponseDto> {
  return this.clinicSettingsService.getGeneral(clinicId);
}

@Patch("general")
async saveGeneral(
  @Param("clinicId") clinicId: string,
  @Body() dto: ClinicGeneralDto,
): Promise<GetClinicGeneralResponseDto> {
  return this.clinicSettingsService.saveGeneral(clinicId, dto);
}
```

Esses endpoints herdam os guards já presentes na rota base (`JwtAuthGuard`, `IsClinicAdminGuard`) e o prefixo `/clinics/:clinicId/settings`.

**Rotas resultantes:**
- `GET  /api/v1/clinics/:clinicId/settings/general`
- `PATCH /api/v1/clinics/:clinicId/settings/general`

---

## Critério de conclusão

- `GET /clinics/:clinicId/settings/general` retorna `{ id, name, description, address: null }` para clínica sem endereço
- `PATCH /clinics/:clinicId/settings/general` com `{ name, description, address: {...} }` cria o endereço e vincula à clínica
- Segunda chamada PATCH com endereço atualiza o endereço existente (não cria duplicata)
- Campos opcionais não enviados no PATCH não são sobrescritos
