# Tarefa 01 — Schema da tabela `addresses`

**Objetivo:** Criar a tabela `addresses` no Drizzle ORM como entidade reutilizável, exportá-la no index do schema.

---

## Contexto

Endereço será compartilhado por clínicas, médicos e hospitais. A estratégia adotada é FK direta na entidade pai (ex.: `clinics.address_id → addresses.id`), sem polimorfismo. A tabela é standalone; cada entidade que precisa de endereço adiciona uma coluna `address_id` nullable.

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `apps/api/src/infrastructure/database/schema/address.schema.ts` | Criar |
| `apps/api/src/infrastructure/database/schema/index.ts` | Modificar |

---

## Implementação

### `address.schema.ts` (novo)

```typescript
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  street: varchar("street", { length: 255 }).notNull(),
  number: varchar("number", { length: 20 }).notNull(),
  complement: varchar("complement", { length: 100 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),     // "SP", "RJ", etc.
  zipCode: varchar("zip_code", { length: 9 }).notNull(), // "01310-100"
  country: varchar("country", { length: 2 }).default("BR").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
```

**Decisões de modelagem:**
- `state`: 2 chars (sigla UF) — adequado para BR; pode ser expandido futuramente
- `zipCode`: 9 chars para suportar formato com hífen ("01310-100")
- `country`: ISO 3166-1 alpha-2, default "BR"
- Sem latitude/longitude neste plano (geocodificação fora do escopo)
- Todos os campos de endereço são `notNull` exceto `complement` e `neighborhood` (opcionais na prática)

### `schema/index.ts` (modificar)

Adicionar a exportação:

```typescript
export * from "./address.schema";
```

---

## Critério de conclusão

- Arquivo `address.schema.ts` criado com a tabela acima
- `index.ts` exporta `addresses`
- `npx drizzle-kit check` não acusa erros no schema (verificar depois da tarefa 02)
