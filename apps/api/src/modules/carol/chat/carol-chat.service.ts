import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages'
import { StructuredTool } from '@langchain/core/tools'
import { CarolConfigService } from '../carol-config.service'
import { CarolConfigResponseDto } from '../dto/carol-config-response.dto'
import { ClinicSettingsService } from '../../clinic-settings/clinic-settings.service'
import { DoctorGoogleCalendarService } from '../../google-calendar/doctor-google-calendar.service'
import { AppointmentService } from '../../appointment/application/appointment.service'
import { ChannelContextDto, ChatRequestDto, ChatResponseDto } from './dto/chat.dto'
import { GetClinicInfoTool } from '../tools/get-clinic-info.tool'
import { GetServicesTool } from '../tools/get-services.tool'
import { CreateAppointmentTool } from '../tools/create-appointment.tool'
import { GetPaymentMethodsTool } from '../tools/get-payment-methods.tool'
import { FindOrCreatePatientTool } from '../tools/find-or-create-patient.tool'
import { ListDoctorsTool } from '../tools/list-doctors.tool'
import { GetDoctorAvailabilityTool } from '../tools/get-doctor-availability.tool'
import { GetPatientAppointmentsTool } from '../tools/get-patient-appointments.tool'

@Injectable()
export class CarolChatService {
  // Session history map (sessionId -> messages)
  // In-memory only — clears on server restart (OK for Playground MVP)
  private sessions = new Map<string, BaseMessage[]>()
  private readonly logger = new Logger(CarolChatService.name)

  constructor(
    private readonly carolConfigService: CarolConfigService,
    private readonly clinicSettingsService: ClinicSettingsService,
    private readonly doctorGoogleCalendarService: DoctorGoogleCalendarService,
    private readonly appointmentService: AppointmentService,
  ) {}

  async processMessage(clinicId: string, dto: ChatRequestDto): Promise<ChatResponseDto> {
    const sessionId = dto.sessionId || randomUUID()

    this.logger.log(`[CarolChat] New message from clinic ${clinicId}`, {
      sessionId,
      message: dto.message,
      version: dto.version,
    })

    const config = await this.carolConfigService.getConfigByVersion(clinicId, dto.version)
    if (!config) {
      this.logger.warn(`[CarolChat] Carol not configured for clinic ${clinicId}`)
      return {
        reply: 'Carol ainda não foi configurada para esta clínica.',
        sessionId,
      }
    }

    this.logger.debug(`[CarolChat] Carol config loaded for clinic ${clinicId}:`, {
      name: config.name,
      voiceTone: config.voiceTone,
      selectedTraits: config.selectedTraits,
      schedulingRules: config.schedulingRules,
    })

    const tools = this.createTools(clinicId)
    this.logger.debug(`[CarolChat] Created ${tools.length} tools:`, {
      tools: tools.map((t) => t.name),
    })

    const toolMap = new Map(tools.map((t) => [t.name, t]))

    const model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    })

    const modelWithTools = model.bindTools(tools)

    const history = this.sessions.get(sessionId) || []
    this.logger.debug(`[CarolChat] Session history retrieved:`, {
      sessionId,
      historyLength: history.length,
    })

    const messages: BaseMessage[] = [
      new SystemMessage(this.buildSystemPrompt(config, dto.channelContext)),
      ...history,
      new HumanMessage(dto.message),
    ]

    this.logger.debug(`[CarolChat] Message chain ready:`, {
      totalMessages: messages.length,
      systemMessageLength: messages[0].content.toString().length,
      historyCount: history.length,
      userMessageLength: dto.message.length,
    })

    const toolsUsed: string[] = []

    // Tool-calling loop
    this.logger.log(`[CarolChat] Starting tool-calling loop for sessionId ${sessionId}`)
    let response = await modelWithTools.invoke(messages)
    let toolCallIteration = 0

    while (response.tool_calls && response.tool_calls.length > 0) {
      toolCallIteration++
      this.logger.log(`[CarolChat] Tool-calling iteration ${toolCallIteration}:`, {
        sessionId,
        toolCallsCount: response.tool_calls.length,
        toolNames: response.tool_calls.map((tc) => tc.name),
      })

      const toolMessages: ToolMessage[] = await Promise.all(
        response.tool_calls.map(async (toolCall) => {
          this.logger.log(`[CarolChat] Invoking tool: ${toolCall.name}`, {
            sessionId,
            toolName: toolCall.name,
            toolId: toolCall.id,
            args: toolCall.args,
          })

          toolsUsed.push(toolCall.name)
          const toolInstance = toolMap.get(toolCall.name)

          let toolResult: string
          try {
            toolResult = toolInstance
              ? await toolInstance.invoke(toolCall.args as Record<string, unknown>)
              : JSON.stringify({ error: `Tool '${toolCall.name}' not found` })

            this.logger.log(`[CarolChat] Tool ${toolCall.name} completed successfully`, {
              sessionId,
              toolName: toolCall.name,
              resultLength: toolResult.length,
              result: toolResult.substring(0, 500), // Log first 500 chars for brevity
            })
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            this.logger.error(`[CarolChat] Tool ${toolCall.name} failed:`, {
              sessionId,
              toolName: toolCall.name,
              error: errorMsg,
              stack: err instanceof Error ? err.stack : undefined,
            })
            toolResult = JSON.stringify({
              error: `Tool '${toolCall.name}' failed: ${errorMsg}`,
            })
          }

          return new ToolMessage({
            tool_call_id: toolCall.id ?? randomUUID(),
            content: toolResult,
          })
        }),
      )

      messages.push(response, ...toolMessages)
      this.logger.debug(`[CarolChat] Message chain updated with tool results`, {
        sessionId,
        totalMessages: messages.length,
      })

      response = await modelWithTools.invoke(messages)
      this.logger.debug(`[CarolChat] Model invoked again after tool results`, {
        sessionId,
        hasMoreToolCalls: !!(response.tool_calls && response.tool_calls.length > 0),
      })
    }

    const reply = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

    this.logger.log(`[CarolChat] Final response generated`, {
      sessionId,
      toolsUsedCount: toolsUsed.length,
      toolsUsed,
      replyLength: reply.length,
      reply: reply.substring(0, 200), // Log first 200 chars
    })

    // Update session history (without system message)
    history.push(new HumanMessage(dto.message))
    history.push(new AIMessage(reply))
    this.sessions.set(sessionId, history)

    this.logger.debug(`[CarolChat] Session history updated`, {
      sessionId,
      newHistoryLength: history.length,
    })

    return {
      reply,
      sessionId,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
    }
  }

  private buildSystemPrompt(config: CarolConfigResponseDto, channelContext?: ChannelContextDto): string {
    const tonalidade: Record<string, string> = {
      formal: 'Seja formal e profissional. Use "senhor/senhora" e linguagem técnica quando apropriado.',
      informal: 'Seja descontraída e acessível. Use linguagem simples e amigável.',
      empathetic: 'Seja empática e acolhedora. Demonstre compreensão e cuidado genuíno.',
    }

    const traits = config.selectedTraits?.length > 0
      ? `Sua personalidade é: ${config.selectedTraits.join(', ')}.`
      : ''

    const schedulingRules = config.schedulingRules as Record<string, unknown>

    const now = new Date()
    const timezone = process.env.CLINIC_TIMEZONE ?? 'America/Sao_Paulo'

    const currentDateTime = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(now)

    const currentDate = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
    }).format(now)

    const channelBlock = channelContext?.phone
      ? `\nCONTEXTO DO CANAL:
O paciente está entrando em contato pelo ${channelContext.channel || 'canal externo'}.
Telefone do paciente: ${channelContext.phone}
Use find_or_create_patient com este telefone no início da conversa para identificá-lo.`
      : ''

    return `Você é ${config.name}, secretária virtual inteligente de uma clínica de saúde.

DATA E HORA ATUAL: ${currentDateTime} (use esta data para interpretar "hoje", "amanhã", etc.)
DATA ATUAL (formato YYYY-MM-DD): ${currentDate}

PERSONALIDADE:
${tonalidade[config.voiceTone] || tonalidade.empathetic}
${traits}

SAUDAÇÃO:
Quando o paciente iniciar a conversa, use esta saudação: "${config.greeting || `Olá! Sou ${config.name}. Como posso ajudar?`}"

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

   IMPORTANTE: O doctorId é sempre um UUID (ex: "550e8400-..."). Use o valor EXATO retornado pelo list_doctors. NUNCA crie ou modifique o ID.

2. VERIFICAR DISPONIBILIDADE: Use get_doctor_availability com o doctorId + data desejada.
   Se o paciente não especificou data, pergunte.
   Se não houver horários, sugira outro dia ou outro médico da mesma especialidade.

3. COLETAR DADOS DO PACIENTE: Peça nome completo e telefone (mínimo).
   Use find_or_create_patient para identificar/cadastrar.

4. CONFIRMAR ANTES DE AGENDAR: Sempre resuma todos os dados antes de criar:
   - Médico, data, horário, procedimento, nome do paciente
   Só prossiga após confirmação explícita do paciente.

5. CRIAR AGENDAMENTO: Use create_appointment com todos os dados.${schedulingRules?.postSchedulingMessage ? `\n   Após confirmar: "${schedulingRules.postSchedulingMessage}"` : ''}

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
${config.restrictSensitiveTopics ? '- NÃO discuta diagnósticos médicos, tratamentos específicos ou valores detalhados de faturamento' : ''}${channelBlock}`
  }

  private createTools(clinicId: string): StructuredTool[] {
    return [
      new GetClinicInfoTool(clinicId, this.clinicSettingsService),
      new ListDoctorsTool(clinicId),
      new GetDoctorAvailabilityTool(clinicId, this.doctorGoogleCalendarService),
      new GetServicesTool(clinicId),
      new CreateAppointmentTool(clinicId, this.appointmentService),
      new GetPaymentMethodsTool(clinicId),
      new FindOrCreatePatientTool(clinicId),
      new GetPatientAppointmentsTool(clinicId),
    ]
  }
}
