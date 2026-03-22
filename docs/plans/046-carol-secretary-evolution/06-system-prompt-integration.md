# Fase 6: System Prompt, Integração Final e Deprecação

## Objetivos

1. Reescrever o system prompt para refletir as novas capacidades
2. Integrar todas as tools novas no `CarolChatService`
3. Deprecar agenda da clínica no contexto da Carol
4. Adicionar channel context (preparação WhatsApp)
5. Ajustar fluxo de conversa para agendamento inteligente

## 1. Novo System Prompt

### Estrutura Proposta:

```typescript
buildSystemPrompt(config: CarolConfigResponseDto, channelContext?: ChannelContext): string {
  return `Você é ${config.name}, secretária virtual inteligente de uma clínica de saúde.

DATA E HORA ATUAL: ${currentDateTime}
DATA ATUAL (formato YYYY-MM-DD): ${currentDate}

PERSONALIDADE:
${tonalidade[config.voiceTone]}
${traits}

SAUDAÇÃO:
${greeting}

SUAS CAPACIDADES:
Você tem acesso às seguintes ferramentas para atender o paciente:
- list_doctors: Buscar médicos por nome, especialidade ou procedimento
- get_doctor_availability: Verificar horários disponíveis de um médico em uma data
- create_appointment: Criar agendamento real com um médico
- find_or_create_patient: Identificar ou cadastrar o paciente
- get_patient_appointments: Ver agendamentos existentes do paciente
- get_services: Listar procedimentos/serviços (opcionalmente por médico)
- get_clinic_info: Informações da clínica
- get_payment_methods: Formas de pagamento aceitas

FLUXO DE AGENDAMENTO:
Siga estas etapas ao agendar uma consulta:
1. IDENTIFICAR O MÉDICO: Se o paciente pedir por nome → use list_doctors com name.
   Se pedir por especialidade → use list_doctors com specialty.
   Se pedir por procedimento → use list_doctors com procedure.
   Se não especificar → pergunte qual médico ou especialidade deseja.

2. VERIFICAR DISPONIBILIDADE: Use get_doctor_availability com o doctorId + data desejada.
   Se o paciente não especificou data, pergunte.
   Se não houver horários, sugira outro dia ou outro médico da mesma especialidade.

3. COLETAR DADOS DO PACIENTE: Peça nome completo e telefone (mínimo).
   Use find_or_create_patient para identificar/cadastrar.

4. CONFIRMAR ANTES DE AGENDAR: Sempre resuma todos os dados antes de criar:
   - Médico, data, horário, procedimento, nome do paciente
   Só prossiga após confirmação explícita do paciente.

5. CRIAR AGENDAMENTO: Use create_appointment com todos os dados.
   ${schedulingRules?.postSchedulingMessage ? `Após confirmar: "${schedulingRules.postSchedulingMessage}"` : ''}

${schedulingRules?.allowCancellation !== false ? '- Você pode cancelar consultas a pedido do paciente' : '- NÃO cancele consultas — encaminhe para atendimento humano'}
${schedulingRules?.allowRescheduling !== false ? '- Você pode reagendar consultas' : '- NÃO reagende consultas — encaminhe para atendimento humano'}

DIRETRIZES:
- Responda sempre em português brasileiro
- Seja objetiva e clara, com respostas curtas (máximo 2-3 frases por mensagem)
- Não invente informações — use SEMPRE as tools para buscar dados reais
- Se não souber responder, ofereça transferir para atendimento humano
- Quando o paciente perguntar "quais médicos atendem?", use list_doctors sem filtros
- Quando perguntar sobre um médico específico por nome, use list_doctors com name
- Nunca assuma dados — sempre confirme com o paciente
${config.restrictSensitiveTopics ? '- NÃO discuta diagnósticos médicos, tratamentos específicos ou valores detalhados de faturamento' : ''}

${channelContext?.phone ? `CONTEXTO DO CANAL:
O paciente está entrando em contato pelo ${channelContext.channel}.
Telefone do paciente: ${channelContext.phone}
Use find_or_create_patient com este telefone no início da conversa para identificá-lo.` : ''}
`
}
```

### Mudanças em relação ao prompt atual:
- Remove referências à agenda da clínica
- Adiciona fluxo de agendamento detalhado por etapas
- Lista explicitamente as 8 tools disponíveis
- Inclui contexto de canal (WhatsApp/Web)
- Orienta sobre quando usar cada tool
- Mantém regras de scheduling configuráveis

## 2. Integração das Tools no CarolChatService

### createTools() atualizado:

```typescript
private createTools(clinicId: string): StructuredTool[] {
  return [
    // Informações da clínica
    new GetClinicInfoTool(clinicId, this.clinicSettingsService),
    new GetPaymentMethodsTool(clinicId),

    // Médicos e serviços
    new ListDoctorsTool(clinicId),
    new GetServicesTool(clinicId),  // evoluído com doctorId opcional

    // Disponibilidade e agendamento
    new GetDoctorAvailabilityTool(
      clinicId,
      this.doctorService,
      this.doctorGoogleCalendarService,
    ),
    new CreateAppointmentTool(
      clinicId,
      this.appointmentService,
      this.doctorService,
    ),

    // Pacientes
    new FindOrCreatePatientTool(clinicId),
    new GetPatientAppointmentsTool(clinicId),
  ]
}
```

### Novas dependências no CarolChatService:

```typescript
@Injectable()
export class CarolChatService {
  constructor(
    private readonly carolConfigService: CarolConfigService,
    private readonly clinicSettingsService: ClinicSettingsService,
    private readonly googleCalendarService: GoogleCalendarService,          // manter (para GetClinicInfo)
    private readonly doctorService: DoctorService,                          // NOVO
    private readonly doctorGoogleCalendarService: DoctorGoogleCalendarService, // NOVO
    private readonly appointmentService: AppointmentService,                // NOVO
  ) {}
}
```

### CarolModule imports atualizados:

```typescript
@Module({
  imports: [
    ClinicSettingsModule,
    GoogleCalendarModule,    // já existe
    DoctorModule,            // NOVO
    AppointmentModule,       // NOVO
  ],
  providers: [
    CarolConfigService,
    CarolChatService,
    // ... demais providers
  ],
})
export class CarolModule {}
```

## 3. ChatRequestDto — Channel Context

### Evolução do DTO:

```typescript
// chat.dto.ts
export class ChannelContextDto {
  @IsOptional()
  @IsEnum(['whatsapp', 'web', 'playground'])
  channel?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  whatsappId?: string
}

export class ChatRequestDto {
  @IsString()
  @MaxLength(2000)
  message: string

  @IsEnum(['draft', 'published'])
  version: 'draft' | 'published'

  @IsOptional()
  @IsUUID()
  sessionId?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelContextDto)
  channelContext?: ChannelContextDto
}
```

Isso permite que:
- **Playground**: Não envia channelContext (comportamento atual)
- **WhatsApp (futuro)**: Envia `{ channel: 'whatsapp', phone: '+5511...' }`
- **Web chat (futuro)**: Envia `{ channel: 'web' }`

## 4. Deprecação da Agenda da Clínica na Carol

### O que remover:
1. **`GetOperatingHoursTool`** — remove completamente
2. **`CheckAvailabilityTool`** — remove completamente (substituída por `GetDoctorAvailabilityTool`)
3. **Referência a `clinicSettingsService.getScheduling()`** nas tools — apenas `GetDoctorAvailabilityTool` usa `doctorService.getSchedule()`

### O que NÃO remover:
- `clinic_scheduling` na base de dados (pode ser usada por outras partes do sistema)
- `ClinicSettingsService` (ainda usado por `GetClinicInfoTool`)
- `GoogleCalendarService` da clínica (pode ter outros usos)

### Arquivos a deletar:
```
apps/api/src/modules/carol/tools/get-operating-hours.tool.ts
apps/api/src/modules/carol/tools/check-availability.tool.ts
```

## 5. Fluxos de Conversa Esperados

### Fluxo 1: Agendamento por nome do médico
```
Paciente: "Oi, quero marcar uma consulta com a Dra. Vitória"
Carol: list_doctors({ name: "Vitória" })
Carol: "Encontrei a Dra. Vitória Santos, dermatologista. Para qual data gostaria de agendar?"
Paciente: "Próxima segunda"
Carol: get_doctor_availability({ doctorId: "...", date: "2026-03-23" })
Carol: "A Dra. Vitória tem horários disponíveis na segunda, 23/03: 09:00, 10:00, 11:00, 14:00, 15:00. Qual prefere?"
Paciente: "10h"
Carol: "Para confirmar o agendamento, preciso do seu nome completo e telefone."
Paciente: "João da Silva, 11 98765-4321"
Carol: find_or_create_patient({ name: "João da Silva", phone: "+5511987654321" })
Carol: "Confirmando: Consulta com Dra. Vitória Santos (Dermatologia), dia 23/03/2026 às 10:00. Paciente: João da Silva. Confirma?"
Paciente: "Sim"
Carol: create_appointment({ doctorId: "...", contactId: "...", date: "2026-03-23", time: "10:00" })
Carol: "Agendamento confirmado! Consulta com Dra. Vitória no dia 23/03 às 10:00."
```

### Fluxo 2: Agendamento por especialidade
```
Paciente: "Preciso de um oftalmologista"
Carol: list_doctors({ specialty: "oftalmologista" })
Carol: "Temos o Dr. Ricardo Silva, oftalmologista. Gostaria de agendar uma consulta?"
Paciente: "Sim, tem horário essa semana?"
Carol: get_doctor_availability({ doctorId: "...", date: "2026-03-23" })
      get_doctor_availability({ doctorId: "...", date: "2026-03-24" })
      ... (Carol pode checar múltiplos dias)
```

### Fluxo 3: Agendamento por procedimento
```
Paciente: "Quero fazer uma limpeza de pele"
Carol: list_doctors({ procedure: "limpeza de pele" })
Carol: "A Dra. Vitória Santos realiza limpeza de pele. Duração: 45 min, valor: R$ 200,00. Deseja agendar?"
```

### Fluxo 4: Consulta de agendamentos
```
Paciente: "Tenho alguma consulta marcada?"
Carol: find_or_create_patient({ phone: "+5511..." })  // se veio do WhatsApp
Carol: get_patient_appointments({ contactId: "..." })
Carol: "Sim, você tem 2 consultas marcadas:
        - Dr. Ricardo Silva (Oftalmologia) em 26/03 às 14:00
        - Dra. Vitória (Dermatologia) em 02/04 às 09:30"
```

### Fluxo 5: Pergunta sobre médicos
```
Paciente: "Quais médicos atendem aí?"
Carol: list_doctors({})
Carol: "Atendemos com os seguintes profissionais:
        - Dr. Ricardo Silva — Oftalmologia
        - Dra. Vitória Santos — Dermatologia
        - Dr. Carlos Mendes — Cardiologia
        Deseja agendar com algum deles?"
```

## 6. Checklist Final de Integração

- [ ] Todas as 8 tools registradas no `createTools()`
- [ ] System prompt atualizado com fluxo de agendamento
- [ ] Channel context passado para `buildSystemPrompt()`
- [ ] Tools antigas removidas (GetOperatingHours, CheckAvailability)
- [ ] Imports do module atualizados (DoctorModule, AppointmentModule)
- [ ] Providers do CarolChatService atualizados
- [ ] ChatRequestDto com channelContext opcional
- [ ] Testes E2E do fluxo completo de agendamento
- [ ] Testes E2E do fluxo de busca por especialidade
- [ ] Testes E2E do fluxo de busca por procedimento
- [ ] Teste de reconhecimento de paciente recorrente
