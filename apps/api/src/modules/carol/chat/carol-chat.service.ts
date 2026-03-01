import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages'
import { StructuredTool } from '@langchain/core/tools'
import { CarolConfigService } from '../carol-config.service'
import { CarolConfigResponseDto } from '../dto/carol-config-response.dto'
import { ClinicSettingsService } from '../../clinic-settings/clinic-settings.service'
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto'
import { GetClinicInfoTool } from '../tools/get-clinic-info.tool'
import { GetServicesTool } from '../tools/get-services.tool'
import { GetOperatingHoursTool } from '../tools/get-operating-hours.tool'
import { CheckAvailabilityTool } from '../tools/check-availability.tool'
import { CreateAppointmentTool } from '../tools/create-appointment.tool'

@Injectable()
export class CarolChatService {
  // Session history map (sessionId -> messages)
  // In-memory only — clears on server restart (OK for Playground MVP)
  private sessions = new Map<string, BaseMessage[]>()

  constructor(
    private readonly carolConfigService: CarolConfigService,
    private readonly clinicSettingsService: ClinicSettingsService,
  ) {}

  async processMessage(clinicId: string, dto: ChatRequestDto): Promise<ChatResponseDto> {
    const sessionId = dto.sessionId || randomUUID()

    const config = await this.carolConfigService.getConfigByVersion(clinicId, dto.version)
    if (!config) {
      return {
        reply: 'Carol ainda não foi configurada para esta clínica.',
        sessionId,
      }
    }

    const tools = this.createTools(clinicId)
    const toolMap = new Map(tools.map((t) => [t.name, t]))

    const model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    })

    const modelWithTools = model.bindTools(tools)

    const history = this.sessions.get(sessionId) || []

    const messages: BaseMessage[] = [
      new SystemMessage(this.buildSystemPrompt(config)),
      ...history,
      new HumanMessage(dto.message),
    ]

    const toolsUsed: string[] = []

    // Tool-calling loop
    let response = await modelWithTools.invoke(messages)

    while (response.tool_calls && response.tool_calls.length > 0) {
      const toolMessages: ToolMessage[] = await Promise.all(
        response.tool_calls.map(async (toolCall) => {
          toolsUsed.push(toolCall.name)
          const toolInstance = toolMap.get(toolCall.name)
          const result = toolInstance
            ? await toolInstance.invoke(toolCall.args as Record<string, unknown>)
            : JSON.stringify({ error: `Tool '${toolCall.name}' not found` })
          return new ToolMessage({
            tool_call_id: toolCall.id ?? randomUUID(),
            content: String(result),
          })
        }),
      )

      messages.push(response, ...toolMessages)
      response = await modelWithTools.invoke(messages)
    }

    const reply = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

    // Update session history (without system message)
    history.push(new HumanMessage(dto.message))
    history.push(new AIMessage(reply))
    this.sessions.set(sessionId, history)

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
${schedulingRules?.confirmBeforeScheduling !== false ? '- Sempre confirme os dados antes de criar um agendamento' : ''}
${schedulingRules?.allowCancellation !== false ? '- Você pode cancelar consultas a pedido do paciente' : '- NÃO cancele consultas — encaminhe para atendimento humano'}
${schedulingRules?.allowRescheduling !== false ? '- Você pode reagendar consultas' : '- NÃO reagende consultas — encaminhe para atendimento humano'}
${schedulingRules?.postSchedulingMessage ? `- Após agendar, diga: "${schedulingRules.postSchedulingMessage}"` : ''}`
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
