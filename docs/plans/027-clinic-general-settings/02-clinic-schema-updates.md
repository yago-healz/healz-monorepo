# Tarefa 02 — Atualizar schema da tabela `clinics` e gerar migration

**Objetivo:** Adicionar `description` e `address_id` à tabela `clinics`, gerar e aplicar a migration Drizzle.

**Pré-requisito:** Tarefa 01 concluída (tabela `addresses` definida no schema).

---

## Arquivos a modificar

| Arquivo | Ação |
|---------|------|
| `apps/api/src/infrastructure/database/schema/auth.schema.ts` | Modificar |
| `apps/api/drizzle/` (ou caminho configurado) | Migration gerada via CLI |

---

## Implementação

### `auth.schema.ts` — tabela `clinics`

Importar `text` e `addresses` e adicionar as duas colunas novas:

```typescript
import { boolean, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { addresses } from "./address.schema";

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),                          // NOVO — nullable
  addressId: uuid("address_id").references(() => addresses.id), // NOVO — nullable
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
```

**Decisões:**
- `description`: `text` (sem limite de tamanho) e nullable — a clínica pode não ter descrição
- `addressId`: nullable — clínica pode não ter endereço cadastrado ainda
- Sem `onDelete` na FK de `addressId` — endereço não deve ser deletado em cascata ao deletar a clínica (endereços são compartilháveis no futuro)

---

## Geração e aplicação da migration

Execute a partir de `apps/api/`:

```bash
# Gerar o arquivo SQL de migration
npx drizzle-kit generate

# Aplicar ao banco de dados
npx drizzle-kit migrate
```

A migration gerada deve produzir SQL equivalente a:

```sql
ALTER TABLE "clinics" ADD COLUMN "description" text;
ALTER TABLE "clinics" ADD COLUMN "address_id" uuid REFERENCES "addresses"("id");

-- A tabela addresses é criada antes (depende da tarefa 01 estar no mesmo conjunto de migrations)
CREATE TABLE "addresses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "street" varchar(255) NOT NULL,
  "number" varchar(20) NOT NULL,
  "complement" varchar(100),
  "neighborhood" varchar(100),
  "city" varchar(100) NOT NULL,
  "state" varchar(2) NOT NULL,
  "zip_code" varchar(9) NOT NULL,
  "country" varchar(2) NOT NULL DEFAULT 'BR',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);
```

> **Atenção:** Se as tarefas 01 e 02 forem executadas em sequência sem aplicar a migration intermediária, o `drizzle-kit generate` incluirá ambas as alterações (criação de `addresses` + alteração de `clinics`) em um único arquivo de migration. Isso é o comportamento esperado.

---

## Critério de conclusão

- `drizzle-kit generate` roda sem erros
- `drizzle-kit migrate` aplica com sucesso
- Colunas `description` e `address_id` existem na tabela `clinics` no banco
- Tabela `addresses` existe no banco
