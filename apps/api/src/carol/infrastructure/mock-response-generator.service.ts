import { Injectable, Logger } from "@nestjs/common";
import { IResponseGenerator, ResponseOptions } from "../domain/response-generator.interface";

@Injectable()
export class MockResponseGenerator implements IResponseGenerator {
  private readonly logger = new Logger(MockResponseGenerator.name);

  private readonly responses: Record<string, string[]> = {
    greeting: [
      "Ola! Como posso ajudar voce hoje?",
      "Oi! Bem-vindo a nossa clinica. Em que posso ajudar?",
    ],
    schedule_appointment: [
      "Otimo! Vou te ajudar a agendar uma consulta. Qual dia e horario voce prefere?",
      "Perfeito! Para qual dia voce gostaria de agendar?",
    ],
    confirm_appointment: [
      "Consulta confirmada com sucesso!",
      "Perfeito! Sua consulta esta confirmada.",
    ],
    cancel_appointment: [
      "Entendi. Vou cancelar sua consulta. Confirma?",
      "Sem problemas! Quer cancelar a consulta?",
    ],
    reschedule_appointment: [
      "Vou te ajudar a remarcar. Qual o novo dia e horario?",
      "Sem problemas! Para quando voce gostaria de reagendar?",
    ],
    request_info: [
      "Sobre o que voce gostaria de saber?",
      "Claro! Qual informacao voce precisa?",
    ],
    request_human: [
      "Vou transferir voce para um atendente. Um momento, por favor!",
      "Claro! Vou conectar voce com nossa equipe.",
    ],
    goodbye: [
      "Ate logo! Se precisar, estou aqui.",
      "Tchau! Qualquer coisa e so chamar.",
    ],
    unknown: [
      "Desculpe, nao entendi. Pode reformular?",
      "Nao compreendi. Pode explicar de outra forma?",
    ],
  };

  async generateResponse(options: ResponseOptions): Promise<string> {
    const responses = this.responses[options.intent] || this.responses.unknown;
    const response = responses[Math.floor(Math.random() * responses.length)];

    let finalResponse = response;
    if (options.entities) {
      finalResponse = this.injectEntities(response, options.entities);
    }

    this.logger.log(`[MOCK] Response for intent: ${options.intent}`);
    return finalResponse;
  }

  async generateConfirmation(
    action: string,
    details: Record<string, any>,
  ): Promise<string> {
    switch (action) {
      case "appointment_scheduled":
        return `Consulta agendada para ${details.date} as ${details.time} com ${details.doctor}!`;
      case "appointment_cancelled":
        return `Consulta do dia ${details.date} cancelada com sucesso.`;
      case "appointment_rescheduled":
        return `Consulta reagendada para ${details.newDate} as ${details.newTime}!`;
      default:
        return "Acao realizada com sucesso!";
    }
  }

  async generateErrorMessage(error: string): Promise<string> {
    const errorMessages: Record<string, string> = {
      slot_not_available: "Desculpe, este horario nao esta disponivel. Temos outras opcoes?",
      invalid_date: "Esta data nao e valida. Pode escolher outra?",
      past_date: "Nao e possivel agendar para datas passadas. Escolha uma data futura.",
      appointment_not_found: "Nao encontrei nenhuma consulta agendada.",
      generic: "Ops! Algo deu errado. Pode tentar novamente?",
    };

    return errorMessages[error] || errorMessages.generic;
  }

  private injectEntities(template: string, entities: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(entities)) {
      result = result.replace(new RegExp(`{${key}}`, "g"), String(value));
    }
    return result;
  }
}
