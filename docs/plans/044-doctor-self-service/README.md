# Plano 044 — Doctor Self-Service Profile

**Objetivo:** Permitir que um usuario com role `doctor` visualize e edite seu proprio perfil, agenda e procedimentos — sem depender do manager.

---

## Contexto

Hoje, doctors so veem placeholders de Pacientes e Agenda. Toda configuracao (perfil, agenda, procedimentos) e feita pelo manager via `/clinic/doctors/$doctorId`.

Os componentes de UI ja existem e sao reutilizaveis (`DoctorProfileCard`, `DoctorScheduleTab`, `DoctorProceduresTab`). O problema principal e de **permissao**: o backend usa `IsClinicAdminGuard` em todos endpoints de escrita, bloqueando doctors.

Alem disso, nao ha como o doctor descobrir seu proprio `doctorId` (que e `doctorProfiles.id`, diferente de `userId`).

## Decisoes Arquiteturais

1. **Endpoint `/doctors/me`** em vez de enviar `doctorId` no JWT — evita alterar o fluxo de auth/token e o formato do JWT.
2. **Guard novo `IsClinicAdminOrSelfDoctorGuard`** — reutiliza logica do `IsClinicAdminGuard` e adiciona verificacao de self-ownership. Aplicado nos endpoints de escrita do doctor.
3. **Doctor cria procedimento** — novo endpoint ou rota dedicada nao necessaria; basta relaxar o guard do `POST /clinics/:clinicId/procedures` para permitir doctors (com auto-link no service). Alternativa mais segura: criar endpoint especifico `POST /clinics/:clinicId/doctors/:doctorId/procedures/create-and-link` para isolar a logica.
4. **Frontend** — nova rota `/clinic/profile` reutiliza os mesmos componentes, passando o `doctorId` resolvido via `/doctors/me`. Componentes recebem prop `isSelfView` para esconder controles que o doctor nao deve ter (ex: desativar vinculo).

## Tarefas

| # | Arquivo | Descricao | Depende de |
|---|---------|-----------|------------|
| 01 | [01-backend-guard.md](./01-backend-guard.md) | Criar `IsClinicAdminOrSelfDoctorGuard` | — |
| 02 | [02-backend-me-endpoint.md](./02-backend-me-endpoint.md) | Endpoint `GET /doctors/me` + `findByUserId` no service | — |
| 03 | [03-backend-update-guards.md](./03-backend-update-guards.md) | Trocar guards nos endpoints de escrita do doctor | 01 |
| 04 | [04-backend-doctor-create-procedure.md](./04-backend-doctor-create-procedure.md) | Permitir doctor criar procedimento + auto-vincular | 01 |
| 05 | [05-frontend-api-hooks.md](./05-frontend-api-hooks.md) | Hook `useMyDoctorProfile`, endpoint constant, tipos | 02 |
| 06 | [06-frontend-profile-page.md](./06-frontend-profile-page.md) | Rota `/clinic/profile` + sidebar + adaptar componentes | 05 |
| 07 | [07-frontend-create-procedure-flow.md](./07-frontend-create-procedure-flow.md) | Dialog "Criar Procedimento" na tab de procedimentos | 04, 06 |

## Ordem de Execucao

```
1. [01] + [02] ← paralelo (sem dependencia mutua)
2. [03] + [04] ← paralelo (ambos dependem de 01, mas nao entre si)
3. [05]        ← depende de 02
4. [06]        ← depende de 05
5. [07]        ← depende de 04 e 06
```

## Fora do Escopo

- Alterar o JWT/token para incluir `doctorId`
- Alterar paginas do manager (continuam funcionando como antes)
- Visualizacao de agenda (calendario) — ja existe placeholder separado em `/clinic/schedule`
- Gestao de pacientes
- Testes E2E (podem ser adicionados depois)
