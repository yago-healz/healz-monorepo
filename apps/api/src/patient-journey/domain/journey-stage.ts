export enum JourneyStage {
  LEAD = "lead",
  ENGAGED = "engaged",
  SCHEDULED = "scheduled",
  CONFIRMED = "confirmed",
  IN_TREATMENT = "in_treatment",
  COMPLETED = "completed",
  DROPPED = "dropped",
  AT_RISK = "at_risk",
}

export const STAGE_TRANSITIONS: Record<JourneyStage, JourneyStage[]> = {
  [JourneyStage.LEAD]: [JourneyStage.ENGAGED, JourneyStage.DROPPED],
  [JourneyStage.ENGAGED]: [
    JourneyStage.SCHEDULED,
    JourneyStage.AT_RISK,
    JourneyStage.DROPPED,
  ],
  [JourneyStage.SCHEDULED]: [
    JourneyStage.CONFIRMED,
    JourneyStage.AT_RISK,
    JourneyStage.ENGAGED,
    JourneyStage.DROPPED,
  ],
  [JourneyStage.CONFIRMED]: [
    JourneyStage.IN_TREATMENT,
    JourneyStage.AT_RISK,
    JourneyStage.SCHEDULED,
  ],
  [JourneyStage.IN_TREATMENT]: [
    JourneyStage.COMPLETED,
    JourneyStage.SCHEDULED,
  ],
  [JourneyStage.COMPLETED]: [],
  [JourneyStage.DROPPED]: [JourneyStage.ENGAGED],
  [JourneyStage.AT_RISK]: [
    JourneyStage.ENGAGED,
    JourneyStage.SCHEDULED,
    JourneyStage.CONFIRMED,
    JourneyStage.DROPPED,
  ],
};
