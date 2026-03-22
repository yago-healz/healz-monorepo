import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages'
import { StructuredTool } from '@langchain/core/tools'
import { CarolConfigService } from '../carol-config.service'
import { CarolConfigResponseDto } from '../dto/carol-config-response.dto'
import { ClinicSettingsService } from '../../clinic-settings/clinic-settings.service'
import { DoctorGoogleCalendarService } from '../../google-calendar/doctor-google-calendar.service'
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto'
import { GetClinicInfoTool } from '../tools/get-clinic-info.tool'
import { GetServicesTool } from '../tools/get-services.tool'
import { CreateAppointmentTool } from '../tools/create-appointment.tool'
import { GetPaymentMethodsTool } from '../tools/get-payment-methods.tool'
import { FindOrCreatePatientTool } from '../tools/find-or-create-patient.tool'
import { ListDoctorsTool } from '../tools/list-doctors.tool'
import { GetDoctorAvailabilityTool } from '../tools/get-doctor-availability.tool'

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
      new SystemMessage(this.buildSystemPrompt(config)),
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

  private buildSystemPrompt(config: CarolConfigResponseDto): string {
    const tonalidade: Record<string, string> = {
      formal: 'Seja formal e profissional. Use "senhor/senhora" e linguagem técnica quando apropriado.',
      informal: 'Seja descontraída e acessível. Use linguagem simples e amigável.',
      empathetic: 'Seja empática e acolhedora. Demonstre compreensão e cuidado genuíno.',
    }

    const traits = config.selectedTraits?.length > 0
      ? `Sua personalidade é: ${config.selectedTraits.join(', ')}.`
      : ''

    const schedulingRules = config.schedulingRules as Record<string, unknown>

    // Injetar data e hora atual no timezone da clínica
    const now = new Date()
    const timezone = process.env.CLINIC_TIMEZONE ?? 'America/Sao_Paulo'

    const tzFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'short',
    })
    const currentDateTime = tzFormatter.format(now)

    const currentDate = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
    }).format(now) // Retorna "YYYY-MM-DD"

    return `Você é ${config.name}, assistente virtual de uma clínica de saúde.

DATA E HORA ATUAL: ${currentDateTime} (use esta data para interpretar "hoje", "amanhã", etc.)
DATA ATUAL (formato YYYY-MM-DD): ${currentDate}

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
${schedulingRules?.confirmBeforeScheduling !== false ? '- Sempre confirme os dados antes de criar um agendamento' : ''}
${schedulingRules?.allowCancellation !== false ? '- Você pode cancelar consultas a pedido do paciente' : '- NÃO cancele consultas — encaminhe para atendimento humano'}
${schedulingRules?.allowRescheduling !== false ? '- Você pode reagendar consultas' : '- NÃO reagende consultas — encaminhe para atendimento humano'}
${schedulingRules?.postSchedulingMessage ? `- Após agendar, diga: "${schedulingRules.postSchedulingMessage}"` : ''}`
  }

  private createTools(clinicId: string): StructuredTool[] {
    return [
      new GetClinicInfoTool(clinicId, this.clinicSettingsService),
      new ListDoctorsTool(clinicId),
      new GetDoctorAvailabilityTool(clinicId, this.doctorGoogleCalendarService),
      new GetServicesTool(clinicId),
      new CreateAppointmentTool(clinicId),
      new GetPaymentMethodsTool(clinicId),
      new FindOrCreatePatientTool(clinicId),
    ]
  }
}
