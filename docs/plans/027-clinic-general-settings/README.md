# Plano 027 — Configurações Gerais da Clínica (nome, descrição e endereço)

**Objetivo:** Implementar a aba "Geral" nas configurações da clínica, permitindo editar nome, descrição e endereço. O endereço é modelado como entidade reutilizável para ser compartilhada com outras entidades (médicos, hospitais, etc.).

---

## Contexto

A aba "Geral" em `clinic-settings-page.tsx` exibe apenas um `PlaceholderTab`. A tabela `clinics` no banco não possui os campos `description` nem `addressId`. Endereço será uma entidade independente (`addresses`) com FK nas entidades que precisam dela — padrão que evita duplicação quando médicos e hospitais também precisarem de endereço.

### Padrão existente (seguir)
- Backend: NestJS module em `apps/api/src/modules/clinic-settings/` com endpoint GET/PATCH por seção
- Frontend: hook React Query em `clinic-settings.api.ts` + componente de tab em `settings/tabs/`
- DB: Drizzle ORM — workflow `drizzle-kit generate` → `drizzle-kit migrate`

---

## Arquivos por tarefa

| Tarefa | Arquivo | Ação |
|--------|---------|------|
| 01 | `schema/address.schema.ts` | Criar |
| 01 | `schema/index.ts` | Modificar — re-exportar addresses |
| 02 | `schema/auth.schema.ts` | Modificar — adicionar `description` e `addressId` à tabela `clinics` |
| 02 | `drizzle/migrations/` | Gerar via CLI |
| 03 | `clinic-settings/dto/clinic-general.dto.ts` | Criar |
| 03 | `clinic-settings/clinic-settings.service.ts` | Modificar — adicionar getGeneral / saveGeneral |
| 03 | `clinic-settings/clinic-settings.controller.ts` | Modificar — adicionar GET/PATCH `/general` |
| 04 | `clinic/api/clinic-settings.api.ts` | Modificar — adicionar hooks useClinicGeneral / useSaveClinicGeneral |
| 04 | `clinic/components/settings/tabs/general-tab.tsx` | Criar |
| 04 | `clinic/components/settings/clinic-settings-page.tsx` | Modificar — substituir PlaceholderTab por GeneralTab |

---

## Ordem de execução

```
1. [01-address-schema.md]       — cria a tabela addresses (pré-requisito de tudo)
2. [02-clinic-schema-updates.md] — adiciona description + addressId + gera migration (depende de 01)
3. [03-api-general-settings.md] — DTOs, service, controller (depende de 02)
4. [04-frontend-geral-tab.md]   — hooks, componente, wiring (depende de 03)
```

Não há paralelismo possível nessa cadeia — cada etapa depende da anterior.

---

## Fora do escopo

- Geocodificação automática de CEP (não busca ViaCEP nem Google Maps)
- Validação de CEP no backend
- Endereço para outras entidades (médicos, hospitais) — somente o schema é projetado para reuso; o wiring virá em planos futuros
- Upload de logo/foto da clínica
- Histórico de alterações de endereço
