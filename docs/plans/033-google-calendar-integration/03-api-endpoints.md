# Tarefa 03 — API Endpoints

**Objetivo:** Expor os endpoints REST necessários para o fluxo OAuth, seleção de calendário, status de conexão e desconexão.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/api/src/modules/google-calendar/google-calendar.controller.ts` | Criar |
| `apps/api/src/modules/google-calendar/google-calendar.module.ts` | Modificar — registrar controller |
| `apps/api/src/modules/clinic-settings/clinic-settings.controller.ts` | Modificar — implementar GET connectors |
| `apps/api/src/modules/clinic-settings/clinic-settings.service.ts` | Modificar — implementar getConnectors |

---

## Endpoints

### Controller: `GoogleCalendarController`

Prefixo: `/clinics/:clinicId/connectors/google-calendar` (exceto o callback)

```typescript
@Controller()
export class GoogleCalendarController {

  // GET /clinics/:clinicId/connectors/google-calendar/auth-url
  // Retorna a URL OAuth para redirecionar o usuário
  // Auth: JWT guard (usuário da clínica)
  @Get('clinics/:clinicId/connectors/google-calendar/auth-url')
  getAuthUrl(@Param('clinicId') clinicId: string): { authUrl: string }

  // GET /auth/google-calendar/callback
  // Callback do Google OAuth — SEM JWT guard (é chamado pelo Google)
  // Após sucesso: redireciona para {FRONTEND_URL}/clinic/settings?tab=conectores&gcal=pending-calendar-selection
  // Após falha: redireciona para {FRONTEND_URL}/clinic/settings?tab=conectores&gcal=error
  @Get('auth/google-calendar/callback')
  @Public()  // sem auth guard
  handleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response): Promise<void>

  // GET /clinics/:clinicId/connectors/google-calendar/calendars
  // Lista calendários disponíveis (requer OAuth já feito)
  @Get('clinics/:clinicId/connectors/google-calendar/calendars')
  listCalendars(@Param('clinicId') clinicId: string): Promise<CalendarListEntry[]>

  // POST /clinics/:clinicId/connectors/google-calendar/select-calendar
  // Body: { calendarId: string, calendarName: string }
  // Salva o calendário escolhido e finaliza a conexão
  @Post('clinics/:clinicId/connectors/google-calendar/select-calendar')
  selectCalendar(
    @Param('clinicId') clinicId: string,
    @Body() dto: SelectCalendarDto,
  ): Promise<void>

  // DELETE /clinics/:clinicId/connectors/google-calendar
  // Desconecta: revoga tokens, marca isActive = false
  @Delete('clinics/:clinicId/connectors/google-calendar')
  disconnect(@Param('clinicId') clinicId: string): Promise<void>
}
```

**DTO de seleção de calendário:**
```typescript
class SelectCalendarDto {
  @IsString() @IsNotEmpty()
  calendarId: string

  @IsString() @IsNotEmpty()
  calendarName: string
}
```

**Redirect após callback:**
- Usar `process.env.FRONTEND_URL` (ex: `http://localhost:3000`)
- Success: `{FRONTEND_URL}/clinic/settings?tab=conectores&gcal=pending-calendar-selection`
- Error: `{FRONTEND_URL}/clinic/settings?tab=conectores&gcal=error&reason=access_denied`

### Atualização: `ClinicSettingsController` — GET connectors

Implementar o endpoint de connectors que já existe como placeholder:

```typescript
// GET /clinics/:clinicId/settings/connectors
async getConnectors(@Param('clinicId') clinicId: string) {
  return this.clinicSettingsService.getConnectors(clinicId)
}
```

No `ClinicSettingsService`, adicionar:

```typescript
async getConnectors(clinicId: string): Promise<{ googleCalendar: boolean; whatsapp: boolean }> {
  const gcalConnected = await this.googleCalendarService.isConnected(clinicId)
  return {
    googleCalendar: gcalConnected,
    whatsapp: false,  // não implementado ainda
  }
}
```

> Injetar `GoogleCalendarService` em `ClinicSettingsService` via módulo.

---

## Variável de Ambiente Adicional

```env
FRONTEND_URL=http://localhost:3000
```

---

## Critério de aceite

- `GET /clinics/:id/connectors/google-calendar/auth-url` retorna `{ authUrl: string }` com URL válida do Google
- `GET /auth/google-calendar/callback` redireciona para o frontend com `?gcal=pending-calendar-selection` após sucesso
- `GET /clinics/:id/connectors/google-calendar/calendars` retorna lista de calendários quando há credencial ativa
- `GET /clinics/:id/connectors/google-calendar/calendars` retorna 400/401 quando não há credencial (sem OAuth feito)
- `POST /clinics/:id/connectors/google-calendar/select-calendar` persiste `selectedCalendarId` no banco
- `DELETE /clinics/:id/connectors/google-calendar` marca `isActive = false`
- `GET /clinics/:id/settings/connectors` retorna `{ googleCalendar: true, whatsapp: false }` após conexão completa
