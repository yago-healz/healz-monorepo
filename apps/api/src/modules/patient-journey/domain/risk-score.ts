export interface RiskFactor {
  name: string;
  weight: number; // 0-1
  score: number; // 0-100
}

export function calculateRiskScore(factors: RiskFactor[]): number {
  if (factors.length === 0) return 0;

  const weightedSum = factors.reduce(
    (sum, factor) => sum + factor.score * factor.weight,
    0,
  );
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);

  return Math.round(weightedSum / totalWeight);
}

export function getRiskLevel(
  score: number,
): "low" | "medium" | "high" | "critical" {
  if (score < 25) return "low";
  if (score < 50) return "medium";
  if (score < 75) return "high";
  return "critical";
}

export const RISK_FACTORS = {
  NO_SHOW: { name: "no_show", weight: 1.0, score: 100 },
  FREQUENT_CANCELLATIONS: {
    name: "frequent_cancellations",
    weight: 0.8,
    score: 75,
  },
  UNRESPONSIVE: { name: "unresponsive", weight: 0.6, score: 60 },
  NOT_CONFIRMED: { name: "not_confirmed", weight: 0.5, score: 50 },
  MULTIPLE_RESCHEDULES: {
    name: "multiple_reschedules",
    weight: 0.4,
    score: 40,
  },
  INACTIVE: { name: "inactive", weight: 0.3, score: 30 },
};
