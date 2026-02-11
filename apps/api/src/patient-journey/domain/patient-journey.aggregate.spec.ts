import { JourneyStage } from "./journey-stage";
import { PatientJourney } from "./patient-journey.aggregate";
import { RISK_FACTORS } from "./risk-score";

describe("PatientJourney Aggregate", () => {
  it("should start journey", () => {
    const journey = PatientJourney.start({
      journeyId: "j-1",
      patientId: "patient-1",
      tenantId: "tenant-1",
      clinicId: "clinic-1",
      correlationId: "corr-1",
    });

    expect(journey.getCurrentStage()).toBe(JourneyStage.LEAD);
    const events = journey.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("JourneyStarted");
  });

  it("should transition from LEAD to ENGAGED", () => {
    const journey = createTestJourney();
    journey.clearUncommittedEvents();

    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "First message sent",
      triggeredBy: "system",
      correlationId: "corr-2",
    });

    expect(journey.getCurrentStage()).toBe(JourneyStage.ENGAGED);
    expect(journey.getUncommittedEvents()[0].event_type).toBe(
      "JourneyStageChanged",
    );
  });

  it("should not allow invalid transition", () => {
    const journey = createTestJourney();

    expect(() => {
      journey.transitionTo({
        newStage: JourneyStage.COMPLETED,
        reason: "Invalid",
        triggeredBy: "system",
        correlationId: "corr-2",
      });
    }).toThrow("Invalid transition");
  });

  it("should detect risk and transition to AT_RISK", () => {
    const journey = createTestJourney();
    // Transicionar para ENGAGED primeiro (LEAD -> ENGAGED)
    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "First message",
      triggeredBy: "system",
      correlationId: "corr-2",
    });
    journey.clearUncommittedEvents();

    journey.detectRisk({
      factors: [RISK_FACTORS.NO_SHOW],
      correlationId: "corr-3",
    });

    expect(journey.getRiskScore()).toBeGreaterThan(0);
    // RiskDetected + JourneyStageChanged (to AT_RISK)
    expect(journey.getUncommittedEvents()).toHaveLength(2);
  });

  it("should reach milestone", () => {
    const journey = createTestJourney();
    journey.clearUncommittedEvents();

    journey.reachMilestone({
      milestone: "first_message",
      correlationId: "corr-2",
    });

    expect(journey.getMilestones()).toContain("first_message");
  });

  it("should not reach same milestone twice", () => {
    const journey = createTestJourney();
    journey.reachMilestone({
      milestone: "first_message",
      correlationId: "corr-2",
    });
    journey.clearUncommittedEvents();

    journey.reachMilestone({
      milestone: "first_message",
      correlationId: "corr-3",
    });

    expect(journey.getUncommittedEvents()).toHaveLength(0);
  });

  it("should reconstruct from history", () => {
    const journey = PatientJourney.start({
      journeyId: "j-1",
      patientId: "patient-1",
      tenantId: "tenant-1",
      clinicId: "clinic-1",
      correlationId: "corr-1",
    });

    const events = journey.getUncommittedEvents();
    const reconstructed = new (PatientJourney as any)();
    reconstructed.loadFromHistory(events);

    expect(reconstructed.getCurrentStage()).toBe(JourneyStage.LEAD);
    expect(reconstructed.getPatientId()).toBe("patient-1");
  });

  it("should allow valid stage transitions", () => {
    const journey = createTestJourney();

    // LEAD -> ENGAGED
    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "Engaged",
      triggeredBy: "system",
      correlationId: "corr-2",
    });
    expect(journey.getCurrentStage()).toBe(JourneyStage.ENGAGED);

    // ENGAGED -> SCHEDULED
    journey.transitionTo({
      newStage: JourneyStage.SCHEDULED,
      reason: "Scheduled",
      triggeredBy: "system",
      correlationId: "corr-3",
    });
    expect(journey.getCurrentStage()).toBe(JourneyStage.SCHEDULED);

    // SCHEDULED -> CONFIRMED
    journey.transitionTo({
      newStage: JourneyStage.CONFIRMED,
      reason: "Confirmed",
      triggeredBy: "system",
      correlationId: "corr-4",
    });
    expect(journey.getCurrentStage()).toBe(JourneyStage.CONFIRMED);

    // CONFIRMED -> IN_TREATMENT
    journey.transitionTo({
      newStage: JourneyStage.IN_TREATMENT,
      reason: "In treatment",
      triggeredBy: "system",
      correlationId: "corr-5",
    });
    expect(journey.getCurrentStage()).toBe(JourneyStage.IN_TREATMENT);
  });

  it("should calculate risk score correctly", () => {
    const journey = createTestJourney();
    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "Engaged",
      triggeredBy: "system",
      correlationId: "corr-2",
    });
    journey.clearUncommittedEvents();

    journey.detectRisk({
      factors: [RISK_FACTORS.NO_SHOW],
      correlationId: "corr-3",
    });

    expect(journey.getRiskScore()).toBe(100); // NO_SHOW has score 100
    expect(journey.getRiskLevel()).toBe("critical");
  });

  it("should recalculate risk score", () => {
    const journey = createTestJourney();
    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "Engaged",
      triggeredBy: "system",
      correlationId: "corr-2",
    });
    journey.detectRisk({
      factors: [RISK_FACTORS.NO_SHOW],
      correlationId: "corr-3",
    });
    journey.clearUncommittedEvents();

    const previousScore = journey.getRiskScore();

    journey.recalculateRiskScore({
      factors: [RISK_FACTORS.NOT_CONFIRMED],
      correlationId: "corr-4",
    });

    expect(journey.getRiskScore()).toBe(50); // NOT_CONFIRMED has score 50
    expect(journey.getRiskScore()).not.toBe(previousScore);
    expect(journey.getUncommittedEvents()[0].event_type).toBe(
      "RiskScoreRecalculated",
    );
  });

  it("should track stage history", () => {
    const journey = createTestJourney();

    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "Engaged",
      triggeredBy: "system",
      correlationId: "corr-2",
    });

    journey.transitionTo({
      newStage: JourneyStage.SCHEDULED,
      reason: "Scheduled",
      triggeredBy: "system",
      correlationId: "corr-3",
    });

    const history = journey.getStageHistory();
    expect(history).toHaveLength(3); // LEAD + ENGAGED + SCHEDULED
    expect(history[0].stage).toBe(JourneyStage.LEAD);
    expect(history[1].stage).toBe(JourneyStage.ENGAGED);
    expect(history[2].stage).toBe(JourneyStage.SCHEDULED);
  });

  it("should not transition to AT_RISK if already COMPLETED", () => {
    const journey = createTestJourney();

    // Transition to COMPLETED
    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "Engaged",
      triggeredBy: "system",
      correlationId: "corr-2",
    });
    journey.transitionTo({
      newStage: JourneyStage.SCHEDULED,
      reason: "Scheduled",
      triggeredBy: "system",
      correlationId: "corr-3",
    });
    journey.transitionTo({
      newStage: JourneyStage.CONFIRMED,
      reason: "Confirmed",
      triggeredBy: "system",
      correlationId: "corr-4",
    });
    journey.transitionTo({
      newStage: JourneyStage.IN_TREATMENT,
      reason: "In treatment",
      triggeredBy: "system",
      correlationId: "corr-5",
    });
    journey.transitionTo({
      newStage: JourneyStage.COMPLETED,
      reason: "Completed",
      triggeredBy: "system",
      correlationId: "corr-6",
    });
    journey.clearUncommittedEvents();

    // Try to detect risk (should not transition to AT_RISK)
    journey.detectRisk({
      factors: [RISK_FACTORS.NO_SHOW],
      correlationId: "corr-7",
    });

    expect(journey.getCurrentStage()).toBe(JourneyStage.COMPLETED);
    // Only RiskDetected event, no JourneyStageChanged
    expect(journey.getUncommittedEvents()).toHaveLength(1);
    expect(journey.getUncommittedEvents()[0].event_type).toBe("RiskDetected");
  });

  it("should allow transition from AT_RISK to ENGAGED", () => {
    const journey = createTestJourney();

    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "Engaged",
      triggeredBy: "system",
      correlationId: "corr-2",
    });

    journey.detectRisk({
      factors: [RISK_FACTORS.NO_SHOW],
      correlationId: "corr-3",
    });

    expect(journey.getCurrentStage()).toBe(JourneyStage.AT_RISK);
    journey.clearUncommittedEvents();

    // Recover from risk
    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "Re-engaged",
      triggeredBy: "system",
      correlationId: "corr-4",
    });

    expect(journey.getCurrentStage()).toBe(JourneyStage.ENGAGED);
  });

  it("should allow transition from DROPPED to ENGAGED", () => {
    const journey = createTestJourney();

    journey.transitionTo({
      newStage: JourneyStage.DROPPED,
      reason: "Dropped",
      triggeredBy: "system",
      correlationId: "corr-2",
    });

    expect(journey.getCurrentStage()).toBe(JourneyStage.DROPPED);
    journey.clearUncommittedEvents();

    // Re-engage
    journey.transitionTo({
      newStage: JourneyStage.ENGAGED,
      reason: "Re-engaged",
      triggeredBy: "system",
      correlationId: "corr-3",
    });

    expect(journey.getCurrentStage()).toBe(JourneyStage.ENGAGED);
  });
});

function createTestJourney(): PatientJourney {
  return PatientJourney.start({
    journeyId: "j-1",
    patientId: "patient-1",
    tenantId: "tenant-1",
    clinicId: "clinic-1",
    correlationId: "corr-1",
  });
}
