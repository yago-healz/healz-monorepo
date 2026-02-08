import { Conversation } from "./conversation.aggregate";
import { randomUUID } from "crypto";

describe("Conversation Aggregate", () => {
  const createTestConversation = () => {
    return Conversation.start({
      conversationId: "conv-123",
      patientId: "patient-123",
      clinicId: "clinic-1",
      tenantId: "tenant-1",
      channel: "whatsapp",
      startedBy: "patient",
      correlationId: "corr-1",
    });
  };

  describe("start", () => {
    it("should start new conversation", () => {
      const conversation = Conversation.start({
        conversationId: "conv-123",
        patientId: "patient-123",
        clinicId: "clinic-1",
        tenantId: "tenant-1",
        channel: "whatsapp",
        startedBy: "patient",
        correlationId: "corr-1",
      });

      const events = conversation.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("ConversationStarted");
      expect(events[0].aggregate_type).toBe("Conversation");
      expect(events[0].event_data.conversation_id).toBe("conv-123");
      expect(conversation.getStatus()).toBe("active");
      expect(conversation.isEscalatedToHuman()).toBe(false);
    });
  });

  describe("receiveMessage", () => {
    it("should receive message", () => {
      const conversation = createTestConversation();
      conversation.clearUncommittedEvents();

      conversation.receiveMessage({
        messageId: "msg-1",
        fromPhone: "+5511999999999",
        content: "Ola",
        correlationId: "corr-2",
      });

      const events = conversation.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("MessageReceived");
      expect(events[0].event_data.message_id).toBe("msg-1");
      expect(events[0].event_data.content).toBe("Ola");
    });
  });

  describe("sendMessage", () => {
    it("should send message", () => {
      const conversation = createTestConversation();
      conversation.clearUncommittedEvents();

      conversation.sendMessage({
        messageId: "msg-1",
        toPhone: "+5511999999999",
        content: "Ola, como posso ajudar?",
        sentBy: "bot",
        correlationId: "corr-2",
      });

      const events = conversation.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("MessageSent");
      expect(events[0].event_data.sent_by).toBe("bot");
    });

    it("should not allow more than 3 consecutive bot messages", () => {
      const conversation = createTestConversation();
      conversation.clearUncommittedEvents();

      for (let i = 0; i < 3; i++) {
        conversation.sendMessage({
          messageId: randomUUID(),
          toPhone: "+5511999999999",
          content: `Bot msg ${i}`,
          sentBy: "bot",
          correlationId: "corr-1",
        });
      }

      expect(() => {
        conversation.sendMessage({
          messageId: randomUUID(),
          toPhone: "+5511999999999",
          content: "Bot msg 4",
          sentBy: "bot",
          correlationId: "corr-1",
        });
      }).toThrow("Cannot send more than 3 consecutive bot messages");
    });

    it("should reset consecutive bot messages counter when patient sends message", () => {
      const conversation = createTestConversation();
      conversation.clearUncommittedEvents();

      // Enviar 2 mensagens do bot
      conversation.sendMessage({
        messageId: randomUUID(),
        toPhone: "+5511999999999",
        content: "Bot msg 1",
        sentBy: "bot",
        correlationId: "corr-1",
      });
      conversation.sendMessage({
        messageId: randomUUID(),
        toPhone: "+5511999999999",
        content: "Bot msg 2",
        sentBy: "bot",
        correlationId: "corr-1",
      });

      // Paciente responde (reseta contador)
      conversation.receiveMessage({
        messageId: randomUUID(),
        fromPhone: "+5511999999999",
        content: "Ok",
        correlationId: "corr-2",
      });

      // Deve permitir mais 3 mensagens do bot
      expect(() => {
        for (let i = 0; i < 3; i++) {
          conversation.sendMessage({
            messageId: randomUUID(),
            toPhone: "+5511999999999",
            content: `Bot msg ${i}`,
            sentBy: "bot",
            correlationId: "corr-1",
          });
        }
      }).not.toThrow();
    });

    it("should allow agent messages even after 3 bot messages", () => {
      const conversation = createTestConversation();
      conversation.clearUncommittedEvents();

      // Enviar 3 mensagens do bot
      for (let i = 0; i < 3; i++) {
        conversation.sendMessage({
          messageId: randomUUID(),
          toPhone: "+5511999999999",
          content: `Bot msg ${i}`,
          sentBy: "bot",
          correlationId: "corr-1",
        });
      }

      // Agente pode enviar mensagem (reseta contador)
      expect(() => {
        conversation.sendMessage({
          messageId: randomUUID(),
          toPhone: "+5511999999999",
          content: "Agente respondendo",
          sentBy: "agent",
          correlationId: "corr-1",
        });
      }).not.toThrow();
    });
  });

  describe("detectIntent", () => {
    it("should detect intent", () => {
      const conversation = createTestConversation();
      conversation.clearUncommittedEvents();

      conversation.detectIntent({
        messageId: "msg-1",
        intent: "schedule_appointment",
        confidence: 0.95,
        entities: { specialty: "cardiology" },
        correlationId: "corr-2",
      });

      const events = conversation.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("IntentDetected");
      expect(events[0].event_data.intent).toBe("schedule_appointment");
      expect(events[0].event_data.confidence).toBe(0.95);
    });
  });

  describe("escalate", () => {
    it("should escalate conversation", () => {
      const conversation = createTestConversation();
      conversation.clearUncommittedEvents();

      conversation.escalate({
        reason: "manual_request",
        correlationId: "corr-3",
      });

      expect(conversation.getStatus()).toBe("escalated");
      expect(conversation.isEscalatedToHuman()).toBe(true);

      const events = conversation.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("ConversationEscalated");
      expect(events[0].event_data.reason).toBe("manual_request");
    });

    it("should not escalate already escalated conversation", () => {
      const conversation = createTestConversation();
      conversation.escalate({
        reason: "manual_request",
        correlationId: "corr-1",
      });

      expect(() => {
        conversation.escalate({ reason: "error", correlationId: "corr-2" });
      }).toThrow("Conversation already escalated");
    });

    it("should escalate with user assignment", () => {
      const conversation = createTestConversation();
      conversation.clearUncommittedEvents();

      conversation.escalate({
        reason: "low_confidence",
        escalatedToUserId: "user-123",
        correlationId: "corr-3",
      });

      const events = conversation.getUncommittedEvents();
      expect(events[0].event_data.escalated_to_user_id).toBe("user-123");
    });
  });

  describe("loadFromHistory", () => {
    it("should rebuild state from history", () => {
      const conversation1 = Conversation.start({
        conversationId: "conv-123",
        patientId: "patient-123",
        clinicId: "clinic-1",
        tenantId: "tenant-1",
        channel: "whatsapp",
        startedBy: "patient",
        correlationId: "corr-1",
      });

      conversation1.receiveMessage({
        messageId: "msg-1",
        fromPhone: "+5511999999999",
        content: "Ola",
        correlationId: "corr-2",
      });

      conversation1.sendMessage({
        messageId: "msg-2",
        toPhone: "+5511999999999",
        content: "Ola, como posso ajudar?",
        sentBy: "bot",
        correlationId: "corr-3",
      });

      const events = conversation1.getUncommittedEvents();

      // Criar nova instancia e carregar do historico
      // @ts-ignore - Acessando construtor privado para testes
      const conversation2 = new Conversation();
      conversation2.loadFromHistory(events);

      expect(conversation2.getConversationId()).toBe("conv-123");
      expect(conversation2.getPatientId()).toBe("patient-123");
      expect(conversation2.getStatus()).toBe("active");
      expect(conversation2.isEscalatedToHuman()).toBe(false);
    });
  });
});
