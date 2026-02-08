import { MockIntentDetector } from "../mock-intent-detector.service";

describe("MockIntentDetector", () => {
  let detector: MockIntentDetector;

  beforeEach(() => {
    detector = new MockIntentDetector();
  });

  describe("detectIntent", () => {
    it("should detect schedule_appointment intent", async () => {
      const result = await detector.detectIntent("Quero marcar uma consulta");
      expect(result.intent).toBe("schedule_appointment");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should detect schedule_appointment with keywords", async () => {
      const result = await detector.detectIntent("Preciso de um horario disponivel para consulta");
      expect(result.intent).toBe("schedule_appointment");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should detect greeting intent", async () => {
      const result = await detector.detectIntent("Oi, tudo bem?");
      expect(result.intent).toBe("greeting");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should detect greeting with different variations", async () => {
      const greetings = ["Ola", "Bom dia", "Boa tarde", "Boa noite", "Alo"];

      for (const greeting of greetings) {
        const result = await detector.detectIntent(greeting);
        expect(result.intent).toBe("greeting");
        expect(result.confidence).toBeGreaterThan(0.7);
      }
    });

    it("should detect confirm_appointment intent", async () => {
      const result = await detector.detectIntent("Sim, confirmo a consulta");
      expect(result.intent).toBe("confirm_appointment");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should detect cancel_appointment intent", async () => {
      const result = await detector.detectIntent("Quero cancelar o agendamento");
      expect(result.intent).toBe("cancel_appointment");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should detect reschedule_appointment intent", async () => {
      const result = await detector.detectIntent("Quero remarcar para outro horario");
      expect(result.intent).toBe("reschedule_appointment");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should detect request_human intent", async () => {
      const result = await detector.detectIntent("Quero falar com uma pessoa");
      expect(result.intent).toBe("request_human");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should detect goodbye intent", async () => {
      const result = await detector.detectIntent("Tchau, obrigado!");
      expect(result.intent).toBe("goodbye");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should return unknown for unrecognized message", async () => {
      const result = await detector.detectIntent("xpto abc 123 random gibberish");
      expect(result.intent).toBe("unknown");
      expect(result.confidence).toBe(0);
    });

    it("should normalize messages with accents", async () => {
      const result = await detector.detectIntent("Gostaria muito de agendar uma consulta");
      expect(result.intent).toBe("schedule_appointment");
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("extractEntities", () => {
    it("should extract date entity from schedule_appointment", async () => {
      const result = await detector.detectIntent("Quero marcar para amanha");
      expect(result.entities?.date).toBe("amanha");
    });

    it("should extract time entity from schedule_appointment", async () => {
      const result = await detector.detectIntent("Quero marcar para as 14h");
      expect(result.entities?.time).toBe("14h");
    });

    it("should extract both date and time entities", async () => {
      const result = await detector.detectIntent("Quero marcar para amanha as 15:30");
      expect(result.entities?.date).toBe("amanha");
      expect(result.entities?.time).toBe("15:30");
    });

    it("should extract date in format DD/MM", async () => {
      const result = await detector.detectIntent("Quero marcar para 15/02");
      expect(result.entities?.date).toBe("15/02");
    });

    it("should return empty object when no entities found", async () => {
      const result = await detector.detectIntent("Quero marcar uma consulta");
      expect(result.entities).toEqual({});
    });

    it("should return empty object for intents without entity extractors", async () => {
      const result = await detector.detectIntent("Oi!");
      expect(result.entities).toEqual({});
    });
  });

  describe("calculateConfidence", () => {
    it("should return higher confidence for pattern matches", async () => {
      const result1 = await detector.detectIntent("Quero agendar uma consulta");
      const result2 = await detector.detectIntent("agendar");

      expect(result1.confidence).toBeGreaterThan(result2.confidence);
    });

    it("should cap confidence at 1.0", async () => {
      const result = await detector.detectIntent("Oi ola bom dia boa tarde");
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });
});
