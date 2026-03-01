# Fase 03 — Backend: LangChain + Chat API

## Objetivo

Integrar LangChain com OpenAI para substituir o mock de Carol por um agente real com tool calling. Criar o endpoint de chat que o Playground consumirá.

## Pré-requisitos

- Fase 01 concluída (schema com novos campos)

## Pode ser feita em paralelo com

- Fase 02 (Backend Config + Versões)

---

## Dependências a Instalar

```bash
cd apps/api
pnpm add langchain @langchain/openai @langchain/core
```

---

## Arquivos

### Criar
- `apps/api/src/modules/carol/chat/carol-chat.controller.ts`
- `apps/api/src/modules/carol/chat/carol-chat.service.ts`
- `apps/api/src/modules/carol/chat/dto/chat.dto.ts`
- `apps/api/src/modules/carol/tools/get-clinic-info.tool.ts`
- `apps/api/src/modules/carol/tools/get-services.tool.ts`
- `apps/api/src/modules/carol/tools/get-operating-hours.tool.ts`
- `apps/api/src/modules/carol/tools/check-availability.tool.ts`
- `apps/api/src/modules/carol/tools/create-appointment.tool.ts`

### Modificar
- `apps/api/src/modules/carol/carol.module.ts` — adicionar chat controller + service + tools
- `apps/api/.env` — adicionar `OPENAI_API_KEY`

---

## Estrutura de Diretórios

```
apps/api/src/modules/carol/
├── carol.module.ts
├── carol-config.controller.ts     (Fase 02)
├── carol-config.service.ts        (Fase 02)
├── chat/
│   ├── carol-chat.controller.ts
│   ├── carol-chat.service.ts
│   └── dto/
│       └── chat.dto.ts
├── tools/
│   ├── get-clinic-info.tool.ts
│   ├── get-services.tool.ts
│   ├── get-operating-hours.tool.ts
│   ├── check-availability.tool.ts
│   └── create-appointment.tool.ts
├── domain/
│   ├── intent-detector.interface.ts   (existente)
│   └── response-generator.interface.ts (existente)
├── infrastructure/
│   ├── mock-intent-detector.service.ts     (existente — manter para testes)
│   ├── mock-response-generator.service.ts  (existente — manter para testes)
│   └── intent-patterns.ts                  (existente)
└── dto/
    ├── save-carol-config.dto.ts       (Fase 02)
    └── carol-config-response.dto.ts   (Fase 02)
```

---

## Chat Endpoint

### `POST /api/v1/clinics/:clinicId/carol/chat`

Guards: `JwtAuthGuard`, `IsClinicAdminGuard`

### DTOs

```typescript
// chat/dto/chat.dto.ts

export class ChatRequestDto {
  @IsString()
  @MaxLength(2000)
  message: string

  @IsString()
  @IsIn(['draft', 'published'])
  version: 'draft' | 'published'

  // ID da sessão no Playground (para manter contexto dentro da mesma sessão)
  @IsString()
  @IsOptional()
  sessionId?: string
}

export class ChatResponseDto {
  reply: string
  sessionId: string
  toolsUsed?: string[]  // nomes das tools chamadas (para debug/transparência no Playground)
}
```

---

## Controller

```typescript
// chat/carol-chat.controller.ts

@ApiTags('Carol')
@Controller('clinics')
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth('bearer')
export class CarolChatController {
  constructor(private readonly chatService: CarolChatService) {}

  @Post(':clinicId/carol/chat')
  @ApiOperation({ summary: 'Send message to Carol' })
  async chat(
    @Param('clinicId') clinicId: string,
    @Body() dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    return this.chatService.processMessage(clinicId, dto)
  }
}
```

---

## Chat Service

O `CarolChatService` orquestra:
1. Carrega a config da Carol (draft ou published via `CarolConfigService`)
2. Monta o system prompt personalizado
3. Inicializa o agente LangChain com as tools
4. Processa a mensagem e retorna a resposta

```typescript
// chat/carol-chat.service.ts

@Injectable()
export class CarolChatService {
  // Map de sessões em memória (sessionId -> messageHistory)
  // Não persiste — limpa quando o servidor reinicia (OK para Playground MVP)
  private sessions = new Map<string, BaseMessage[]>()

  constructor(
    private readonly carolConfigService: CarolConfigService,
    private readonly clinicSettingsService: ClinicSettingsService,
  ) {}

  async processMessage(clinicId: string, dto: ChatRequestDto): Promise<ChatResponseDto> {
    const sessionId = dto.sessionId || randomUUID()

    // 1. Carregar config da Carol
    const config = await this.carolConfigService.getConfigByVersion(clinicId, dto.version)
    if (!config) {
      return {
        reply: 'Carol ainda não foi configurada para esta clínica.',
        sessionId,
      }
    }

    // 2. Montar system prompt personalizado
    const systemPrompt = this.buildSystemPrompt(config)

    // 3. Criar tools com clinicId injetado
    const tools = this.createTools(clinicId)

    // 4. Criar modelo OpenAI
    const model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    })

    // 5. Recuperar ou criar histórico da sessão
    const history = this.sessions.get(sessionId) || []

    // 6. Criar agente com tools
    const agent = createToolCallingAgent({
      llm: model,
      tools,
      prompt: ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        new MessagesPlaceholder('chat_history'),
        ['human', '{input}'],
        new MessagesPlaceholder('agent_scratchpad'),
      ]),
    })

    const executor = AgentExecutor.fromAgentAndTools({
      agent,
      tools,
    })

    // 7. Executar
    const result = await executor.invoke({
      input: dto.message,
      chat_history: history,
    })

    // 8. Atualizar histórico da sessão
    history.push(new HumanMessage(dto.message))
    history.push(new AIMessage(result.output))
    this.sessions.set(sessionId, history)

    // 9. Extrair tools usadas (se houver)
    const toolsUsed = result.intermediateSteps
      ?.map((step: any) => step.action?.tool)
      .filter(Boolean)

    return {
      reply: result.output,
      sessionId,
      toolsUsed,
    }
  }

  private buildSystemPrompt(config: any): string {
    const tonalidade = {
      formal: 'Seja formal e profissional. Use "senhor/senhora" e linguagem técnica quando apropriado.',
      informal: 'Seja descontraída e acessível. Use linguagem simples e amigável.',
      empathetic: 'Seja empática e acolhedora. Demonstre compreensão e cuidado genuíno.',
    }

    const traits = config.selectedTraits?.length > 0
      ? `Sua personalidade é: ${config.selectedTraits.join(', ')}.`
      : ''

    return `Você é ${config.name}, assistente virtual de uma clínica de saúde.

PERSONALIDADE:
${tonalidade[config.voiceTone] || tonalidade.empathetic}
${traits}

SAUDAÇÃO:
Quando o paciente iniciar a conversa, use esta saudação: "${config.greeting || `Olá! Sou ${config.name}. Como posso ajudar?`}"

DIRETRIZES:
- Responda sempre em português brasileiro
- Seja objetiva e clara, com respostas curtas (máximo 2-3 frases)
- Não invente informações — use as tools disponíveis para buscar dados reais
- Se não souber responder, ofereça transferir para atendimento humano
${config.restrictSensitiveTopics ? '- NÃO discuta diagnósticos médicos, tratamentos específicos ou valores de faturamento detalhados' : ''}

AGENDAMENTO:
${config.schedulingRules?.confirmBeforeScheduling !== false ? '- Sempre confirme os dados antes de criar um agendamento' : ''}
${config.schedulingRules?.allowCancellation !== false ? '- Você pode cancelar consultas a pedido do paciente' : '- NÃO cancele consultas — encaminhe para atendimento humano'}
${config.schedulingRules?.allowRescheduling !== false ? '- Você pode reagendar consultas' : '- NÃO reagende consultas — encaminhe para atendimento humano'}
${config.schedulingRules?.postSchedulingMessage ? `- Após agendar, diga: "${config.schedulingRules.postSchedulingMessage}"` : ''}`
  }

  private createTools(clinicId: string): StructuredTool[] {
    return [
      new GetClinicInfoTool(clinicId, this.clinicSettingsService),
      new GetServicesTool(clinicId, this.clinicSettingsService),
      new GetOperatingHoursTool(clinicId, this.clinicSettingsService),
      new CheckAvailabilityTool(clinicId),
      new CreateAppointmentTool(clinicId),
    ]
  }
}
```

---

## Tools

### Tool 1: `get_clinic_info` (Real)

```typescript
// tools/get-clinic-info.tool.ts

export class GetClinicInfoTool extends StructuredTool {
  name = 'get_clinic_info'
  description = 'Busca informações gerais da clínica: nome, descrição, endereço'
  schema = z.object({}) // Sem parâmetros — clinicId é injetado

  constructor(
    private readonly clinicId: string,
    private readonly settingsService: ClinicSettingsService,
  ) { super() }

  async _call(): Promise<string> {
    const general = await this.settingsService.getGeneral(this.clinicId)
    if (!general) return JSON.stringify({ error: 'Clínica não encontrada' })
    return JSON.stringify({
      name: general.name,
      description: general.description,
      address: general.address
        ? `${general.address.street}, ${general.address.number} - ${general.address.neighborhood}, ${general.address.city}/${general.address.state}`
        : null,
    })
  }
}
```

### Tool 2: `get_services` (Real)

```typescript
// tools/get-services.tool.ts

export class GetServicesTool extends StructuredTool {
  name = 'get_services'
  description = 'Lista os serviços oferecidos pela clínica com valores e duração'
  schema = z.object({})

  constructor(
    private readonly clinicId: string,
    private readonly settingsService: ClinicSettingsService,
  ) { super() }

  async _call(): Promise<string> {
    const data = await this.settingsService.getServices(this.clinicId)
    if (!data?.services) return JSON.stringify({ services: [] })
    return JSON.stringify({ services: data.services })
  }
}
```

### Tool 3: `get_operating_hours` (Real)

```typescript
// tools/get-operating-hours.tool.ts

export class GetOperatingHoursTool extends StructuredTool {
  name = 'get_operating_hours'
  description = 'Retorna os horários de funcionamento da clínica por dia da semana'
  schema = z.object({})

  constructor(
    private readonly clinicId: string,
    private readonly settingsService: ClinicSettingsService,
  ) { super() }

  async _call(): Promise<string> {
    const data = await this.settingsService.getScheduling(this.clinicId)
    if (!data?.weeklySchedule) return JSON.stringify({ schedule: [] })
    return JSON.stringify({
      schedule: data.weeklySchedule,
      appointmentDuration: data.defaultAppointmentDuration,
    })
  }
}
```

### Tool 4: `check_availability` (Mockada)

```typescript
// tools/check-availability.tool.ts

export class CheckAvailabilityTool extends StructuredTool {
  name = 'check_availability'
  description = 'Verifica horários disponíveis para agendamento em uma data específica'
  schema = z.object({
    date: z.string().describe('Data no formato YYYY-MM-DD'),
  })

  constructor(private readonly clinicId: string) { super() }

  async _call(input: { date: string }): Promise<string> {
    // MOCKADO para MVP — retorna slots simulados
    const mockSlots = [
      { time: '09:00', available: true },
      { time: '10:00', available: true },
      { time: '11:00', available: false },
      { time: '14:00', available: true },
      { time: '15:00', available: true },
      { time: '16:00', available: false },
    ]

    return JSON.stringify({
      date: input.date,
      slots: mockSlots,
      note: '[Playground] Dados simulados — não refletem disponibilidade real',
    })
  }
}
```

### Tool 5: `create_appointment` (Mockada)

```typescript
// tools/create-appointment.tool.ts

export class CreateAppointmentTool extends StructuredTool {
  name = 'create_appointment'
  description = 'Cria um agendamento de consulta para o paciente'
  schema = z.object({
    date: z.string().describe('Data no formato YYYY-MM-DD'),
    time: z.string().describe('Horário no formato HH:MM'),
    patientName: z.string().describe('Nome do paciente'),
    service: z.string().optional().describe('Serviço desejado'),
  })

  constructor(private readonly clinicId: string) { super() }

  async _call(input: any): Promise<string> {
    // MOCKADO para MVP — não cria no banco
    return JSON.stringify({
      success: true,
      appointmentId: `mock-${Date.now()}`,
      date: input.date,
      time: input.time,
      patientName: input.patientName,
      service: input.service || 'Consulta geral',
      note: '[Playground] Agendamento simulado — não foi criado no sistema',
    })
  }
}
```

---

## Variáveis de Ambiente

Adicionar ao `.env`:

```bash
# Carol / OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

---

## Atualização do CarolModule

```typescript
// carol.module.ts (final)

@Module({
  imports: [ClinicSettingsModule],
  providers: [
    CarolConfigService,
    CarolChatService,
  ],
  controllers: [CarolConfigController, CarolChatController],
  exports: [CarolConfigService],
})
export class CarolModule {}
```

**Nota:** Os providers de `IIntentDetector` e `IResponseGenerator` (mock) podem ser removidos, pois o LangChain substitui sua função. Manter os arquivos de mock para referência/testes se desejado.

---

## Gerenciamento de Sessões

O Map em memória é suficiente para o MVP (Playground):
- Cada sessão vive enquanto o servidor está rodando
- O Playground inicia uma nova sessão a cada "Nova conversa"
- Sem persistência — ao reiniciar o servidor, sessões são perdidas (OK para Playground)

Para produção futura (WhatsApp), será necessário persistir sessões no banco.

---

## Checklist

- [ ] Instalar `langchain`, `@langchain/openai`, `@langchain/core`
- [ ] Criar `ChatRequestDto` e `ChatResponseDto`
- [ ] Implementar 3 tools reais (`get_clinic_info`, `get_services`, `get_operating_hours`)
- [ ] Implementar 2 tools mockadas (`check_availability`, `create_appointment`)
- [ ] Implementar `CarolChatService` com LangChain agent
- [ ] Implementar `CarolChatController` com endpoint POST
- [ ] Configurar `OPENAI_API_KEY` no `.env`
- [ ] Atualizar `CarolModule`
- [ ] Testar: enviar mensagem e receber resposta coerente com config
- [ ] Testar: tool calling funciona (ex: "quais serviços vocês oferecem?")
