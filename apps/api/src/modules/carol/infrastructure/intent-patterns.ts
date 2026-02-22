export interface IntentPattern {
  intent: string;
  patterns: RegExp[];
  keywords: string[];
  confidence: number;
  entityExtractors?: Record<string, RegExp>;
}

export const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "schedule_appointment",
    patterns: [
      /\b(agendar|marcar|consulta|atendimento)\b/i,
      /\b(quero|preciso|gostaria).*(consulta|atendimento)\b/i,
      /\b(horario|disponivel|vaga)\b.*\b(consulta|atendimento)\b/i,
    ],
    keywords: ["agendar", "marcar", "consulta", "horario", "disponivel"],
    confidence: 0.85,
    entityExtractors: {
      date: /\b(amanha|hoje|segunda|terca|quarta|quinta|sexta|sabado|domingo|\d{1,2}\/\d{1,2})\b/i,
      time: /\b(\d{1,2}[h:]?\d{0,2})\b/i,
    },
  },
  {
    intent: "confirm_appointment",
    patterns: [
      /\b(confirmar|confirmacao|confirmo)\b/i,
      /\b(sim|ok|tudo bem|pode ser)\b.*\b(consulta|agendamento)\b/i,
    ],
    keywords: ["confirmar", "confirmacao", "sim", "ok"],
    confidence: 0.90,
  },
  {
    intent: "cancel_appointment",
    patterns: [
      /\b(cancelar|desmarcar)\b.*\b(consulta|agendamento)\b/i,
      /\b(nao).*(poder|consigo|vou conseguir)\b.*\b(consulta|ir)\b/i,
    ],
    keywords: ["cancelar", "desmarcar", "nao posso"],
    confidence: 0.85,
  },
  {
    intent: "reschedule_appointment",
    patterns: [
      /\b(remarcar|reagendar|mudar).*(consulta|horario|data)\b/i,
      /\b(outro|outra).*(horario|data|dia)\b/i,
    ],
    keywords: ["remarcar", "reagendar", "mudar", "outro horario"],
    confidence: 0.80,
  },
  {
    intent: "request_info",
    patterns: [
      /\b(informacao|info|saber|onde|como|quando|qual)\b/i,
      /\b(endereco|localizacao|telefone|contato)\b/i,
    ],
    keywords: ["informacao", "onde", "como", "endereco"],
    confidence: 0.70,
  },
  {
    intent: "request_human",
    patterns: [
      /\b(falar|atendente|pessoa|humano)\b/i,
      /\b(preciso|quero).*(falar|conversar).*(alguem|pessoa)\b/i,
    ],
    keywords: ["atendente", "pessoa", "humano", "falar"],
    confidence: 0.95,
  },
  {
    intent: "greeting",
    patterns: [
      /\b(oi|ola|bom dia|boa tarde|boa noite|hey|alo)\b/i,
    ],
    keywords: ["oi", "ola", "bom dia", "boa tarde"],
    confidence: 0.95,
  },
  {
    intent: "goodbye",
    patterns: [
      /\b(tchau|ate logo|ate|obrigado|valeu|bye)\b/i,
    ],
    keywords: ["tchau", "ate", "obrigado"],
    confidence: 0.90,
  },
];
