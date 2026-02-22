# Task 05 — Atualizar app.module.ts e Imports Cruzados

**Objetivo:** Garantir que `app.module.ts` e todos os imports cruzados entre módulos estejam corretos após as movimentações.

---

## app.module.ts — novos imports

```typescript
// Infrastructure
import { AuditModule } from "./infrastructure/audit/audit.module";
import { EventSourcingModule } from "./infrastructure/event-sourcing/event-sourcing.module";
import { MailModule } from "./infrastructure/mail/mail.module";
import { RlsMiddleware } from "./infrastructure/database/middleware/rls.middleware";

// Common
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";

// Feature Modules
import { AuthModule } from "./modules/auth/auth.module";
import { SignupModule } from "./modules/signup/signup.module";
import { InvitesModule } from "./modules/invites/invites.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { ClinicsModule } from "./modules/clinics/clinics.module";
import { ClinicSettingsModule } from "./modules/clinic-settings/clinic-settings.module";
import { PatientModule } from "./modules/patient/patient.module";
import { ConversationModule } from "./modules/conversation/conversation.module";
import { AppointmentModule } from "./modules/appointment/appointment.module";
import { PatientJourneyModule } from "./modules/patient-journey/patient-journey.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { CarolModule } from "./modules/carol/carol.module";
import { PlatformAdminModule } from "./modules/platform-admin/platform-admin.module";
```

O restante do `app.module.ts` (decorator, providers, middleware config) **não muda**.

---

## Imports cruzados a verificar

### Database (`infrastructure/database/`)
O `db` é importado por praticamente todos os services. Verificar todos:

```bash
grep -r "from.*['\"].*\/db" apps/api/src/ --include="*.ts" | grep -v node_modules | grep -v ".d.ts"
```

Cada um muda de:
```typescript
// ANTES (dentro de src/qualquer-modulo/)
import { db } from "../db";
// DEPOIS (dentro de src/modules/qualquer-modulo/)
import { db } from "../../infrastructure/database";
```

### Event Sourcing base classes
```bash
grep -r "from.*event-sourcing" apps/api/src/ --include="*.ts"
```

Imports em aggregates e handlers mudam:
```typescript
// ANTES
import { AggregateRoot } from "../event-sourcing/domain/aggregate-root";
// DEPOIS
import { AggregateRoot } from "../../infrastructure/event-sourcing/domain/aggregate-root";
```

### Guards e Decorators (agora em common/)
```bash
grep -r "from.*auth/decorators\|from.*auth/guards\|from.*auth/interfaces" apps/api/src/ --include="*.ts"
```

---

## Checklist de verificação

- [ ] `app.module.ts` compila
- [ ] Nenhum import aponta para path antigo (`src/auth/`, `src/db/`, etc.)
- [ ] Imports entre módulos em `modules/` usam paths relativos corretos
- [ ] Imports de `common/` e `infrastructure/` usam paths relativos corretos

---

## Done when

- `pnpm exec tsc --noEmit` compila sem erros
- `grep -r "from.*['\"]\.\.\/auth\/" apps/api/src/` retorna vazio (nenhum import antigo)
- `grep -r "from.*['\"]\.\.\/db" apps/api/src/` retorna vazio
- `grep -r "from.*['\"]\.\.\/audit\/" apps/api/src/` retorna vazio
- `grep -r "from.*['\"]\.\.\/mail\/" apps/api/src/` retorna vazio
