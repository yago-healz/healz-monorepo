# Tarefa 06 — Module Wiring

**Objetivo:** Registrar todos os providers/controllers do módulo Evolution API no NestJS e integrá-los com módulos existentes.

---

## Arquivo a criar

`apps/api/src/modules/evolution-api/evolution-api.module.ts`

```typescript
@Module({
  imports: [CarolModule, ClinicSettingsModule],
  controllers: [
    EvolutionApiController,         // endpoints /clinics/:id/connectors/whatsapp/*
    EvolutionApiWebhookController,  // endpoint /webhooks/whatsapp
  ],
  providers: [
    EvolutionApiService,
    EvolutionCarolHandler,
  ],
  exports: [EvolutionApiService],
})
export class EvolutionApiModule {}
```

---

## Modificações em módulos existentes

### `apps/api/src/app.module.ts`

1. Importar `EvolutionApiModule`
2. Adicionar `'api/v1/webhooks/whatsapp'` na lista de exclusões do `RlsMiddleware`

```typescript
// Adicionar ao array imports:
EvolutionApiModule,

// Atualizar exclude do RlsMiddleware:
.exclude(
  'api/v1/auth/*path',
  'api/v1/signup/*path',
  'api/v1/invites/accept',
  'api/v1/webhooks/whatsapp',
)
```

### `apps/api/src/modules/clinic-settings/clinic-settings.module.ts`

Injetar `EvolutionApiService` para que `ClinicSettingsService.getConnectors()` possa consultar o status do WhatsApp.

**Problema de dependência circular:** `ClinicSettingsModule` → `EvolutionApiModule` → `ClinicSettingsModule`

**Solução:** Não importar `EvolutionApiModule` dentro de `ClinicSettingsModule`. Em vez disso, o endpoint `GET /clinics/:clinicId/settings/connectors` deve ser movido para o `EvolutionApiController`, que já tem acesso a ambos os serviços. Ou usar `forwardRef()` do NestJS.

**Abordagem recomendada:** Mover o endpoint de connectors para o `EvolutionApiController`:

```typescript
// EvolutionApiController
@Get('clinics/:clinicId/settings/connectors')
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
async getConnectors(@Param('clinicId') clinicId: string) {
  const [gcalConnected, whatsappCreds] = await Promise.all([
    this.googleCalendarService.isConnected(clinicId),
    this.evolutionApiService.getCredentials(clinicId),
  ])
  return {
    googleCalendar: gcalConnected,
    whatsapp: whatsappCreds?.status === 'connected'
      ? { connected: true, phoneNumber: whatsappCreds.phoneNumber }
      : null,
  }
}
```

Isso requer importar `GoogleCalendarModule` no `EvolutionApiModule` também.

> **Verificar:** se `GoogleCalendarService` já expõe um método `isConnected(clinicId)`. Se não, adicionar método simples que consulta se existe registro ativo no banco.

---

## Critério de conclusão

- `pnpm build` compila sem erros
- Todos os endpoints acessíveis via Swagger/Postman
- `GET /clinics/:id/settings/connectors` retorna `googleCalendar` e `whatsapp`
- Webhook recebe e processa payloads corretamente
