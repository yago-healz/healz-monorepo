# 02 — Migration Drizzle

**Objetivo:** Gerar e aplicar a migration para criar as 6 novas tabelas no banco.

---

## Comandos

```bash
cd apps/api
pnpm drizzle-kit generate   # gera SQL em src/infrastructure/database/migrations/
pnpm drizzle-kit migrate     # aplica no banco
```

## Validação

- [ ] Migration gerada com as 6 tabelas: `doctor_profiles`, `doctor_clinics`, `procedures`, `doctor_clinic_procedures`, `doctor_clinic_schedules`, `payment_methods`
- [ ] Migration gerada com o enum `payment_method_type`
- [ ] Migration gerada com os índices e unique constraints
- [ ] Migration aplicada sem erros
- [ ] Verificar no banco que as tabelas existem

## Done when

- [ ] Migration gerada e aplicada com sucesso
- [ ] Tabelas criáveis no banco de desenvolvimento
