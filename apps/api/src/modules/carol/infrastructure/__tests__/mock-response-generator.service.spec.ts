import { MockResponseGenerator } from "../mock-response-generator.service";

describe("MockResponseGenerator", () => {
  let generator: MockResponseGenerator;

  beforeEach(() => {
    generator = new MockResponseGenerator();
  });

  describe("generateResponse", () => {
    it("should generate response for greeting intent", async () => {
      const response = await generator.generateResponse({ intent: "greeting" });
      expect(response.length).toBeGreaterThan(0);
      expect(typeof response).toBe("string");
    });

    it("should generate response for schedule_appointment intent", async () => {
      const response = await generator.generateResponse({ intent: "schedule_appointment" });
      expect(response.length).toBeGreaterThan(0);
    });

    it("should generate response for confirm_appointment intent", async () => {
      const response = await generator.generateResponse({ intent: "confirm_appointment" });
      expect(response.length).toBeGreaterThan(0);
    });

    it("should generate response for cancel_appointment intent", async () => {
      const response = await generator.generateResponse({ intent: "cancel_appointment" });
      expect(response.length).toBeGreaterThan(0);
    });

    it("should generate response for reschedule_appointment intent", async () => {
      const response = await generator.generateResponse({ intent: "reschedule_appointment" });
      expect(response.length).toBeGreaterThan(0);
    });

    it("should generate response for request_info intent", async () => {
      const response = await generator.generateResponse({ intent: "request_info" });
      expect(response.length).toBeGreaterThan(0);
    });

    it("should generate response for request_human intent", async () => {
      const response = await generator.generateResponse({ intent: "request_human" });
      expect(response.length).toBeGreaterThan(0);
    });

    it("should generate response for goodbye intent", async () => {
      const response = await generator.generateResponse({ intent: "goodbye" });
      expect(response.length).toBeGreaterThan(0);
    });

    it("should generate unknown response for unrecognized intent", async () => {
      const response = await generator.generateResponse({ intent: "unknown" });
      expect(response.length).toBeGreaterThan(0);
      expect(response.toLowerCase()).toMatch(/desculpe|nao/);
    });

    it("should inject entities into response", async () => {
      const response = await generator.generateResponse({
        intent: "schedule_appointment",
        entities: { date: "15/02", time: "14h" },
      });
      expect(response.length).toBeGreaterThan(0);
    });

    it("should return different responses on multiple calls (randomness)", async () => {
      const responses = new Set<string>();

      // Generate 10 responses - should get at least some variation
      for (let i = 0; i < 10; i++) {
        const response = await generator.generateResponse({ intent: "greeting" });
        responses.add(response);
      }

      // With 2 possible responses, we should get both after 10 tries (very high probability)
      expect(responses.size).toBeGreaterThan(1);
    });
  });

  describe("generateConfirmation", () => {
    it("should generate appointment_scheduled confirmation", async () => {
      const response = await generator.generateConfirmation("appointment_scheduled", {
        date: "15/02",
        time: "14h",
        doctor: "Dr. Joao",
      });
      expect(response).toContain("15/02");
      expect(response).toContain("14h");
      expect(response).toContain("Dr. Joao");
    });

    it("should generate appointment_cancelled confirmation", async () => {
      const response = await generator.generateConfirmation("appointment_cancelled", {
        date: "15/02",
      });
      expect(response).toContain("15/02");
      expect(response).toContain("cancelada");
    });

    it("should generate appointment_rescheduled confirmation", async () => {
      const response = await generator.generateConfirmation("appointment_rescheduled", {
        newDate: "20/02",
        newTime: "15h",
      });
      expect(response).toContain("20/02");
      expect(response).toContain("15h");
      expect(response).toContain("reagendada");
    });

    it("should generate generic confirmation for unknown action", async () => {
      const response = await generator.generateConfirmation("unknown_action", {});
      expect(response).toBe("Acao realizada com sucesso!");
    });
  });

  describe("generateErrorMessage", () => {
    it("should generate error for slot_not_available", async () => {
      const response = await generator.generateErrorMessage("slot_not_available");
      expect(response).toContain("disponivel");
    });

    it("should generate error for invalid_date", async () => {
      const response = await generator.generateErrorMessage("invalid_date");
      expect(response).toContain("valida");
    });

    it("should generate error for past_date", async () => {
      const response = await generator.generateErrorMessage("past_date");
      expect(response).toContain("passadas");
    });

    it("should generate error for appointment_not_found", async () => {
      const response = await generator.generateErrorMessage("appointment_not_found");
      expect(response).toContain("encontrei");
    });

    it("should generate generic error for unknown error code", async () => {
      const response = await generator.generateErrorMessage("unknown_error");
      expect(response).toBe("Ops! Algo deu errado. Pode tentar novamente?");
    });
  });

  describe("injectEntities", () => {
    it("should inject multiple entities into template", async () => {
      const response = await generator.generateConfirmation("appointment_scheduled", {
        date: "25/03",
        time: "10h30",
        doctor: "Dra. Maria",
      });
      expect(response).toContain("25/03");
      expect(response).toContain("10h30");
      expect(response).toContain("Dra. Maria");
    });

    it("should handle missing entities gracefully", async () => {
      const response = await generator.generateConfirmation("appointment_scheduled", {
        date: "15/02",
        // Missing time and doctor
      });
      expect(response).toContain("15/02");
    });
  });
});
