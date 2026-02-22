import {
  calculateRiskScore,
  getRiskLevel,
  RISK_FACTORS,
  RiskFactor,
} from "./risk-score";

describe("Risk Score Functions", () => {
  describe("calculateRiskScore", () => {
    it("should return 0 for empty factors", () => {
      expect(calculateRiskScore([])).toBe(0);
    });

    it("should calculate weighted average correctly", () => {
      const factors: RiskFactor[] = [
        { name: "test1", weight: 1.0, score: 100 },
        { name: "test2", weight: 1.0, score: 0 },
      ];

      const result = calculateRiskScore(factors);
      expect(result).toBe(50); // (100 * 1 + 0 * 1) / 2 = 50
    });

    it("should respect factor weights", () => {
      const factors: RiskFactor[] = [
        { name: "test1", weight: 0.8, score: 100 },
        { name: "test2", weight: 0.2, score: 0 },
      ];

      const result = calculateRiskScore(factors);
      expect(result).toBe(80); // (100 * 0.8 + 0 * 0.2) / 1.0 = 80
    });

    it("should round to nearest integer", () => {
      const factors: RiskFactor[] = [
        { name: "test1", weight: 1.0, score: 66 },
        { name: "test2", weight: 1.0, score: 67 },
      ];

      const result = calculateRiskScore(factors);
      expect(result).toBe(67); // Math.round(66.5) = 67
    });

    it("should calculate NO_SHOW risk factor", () => {
      const result = calculateRiskScore([RISK_FACTORS.NO_SHOW]);
      expect(result).toBe(100);
    });

    it("should calculate FREQUENT_CANCELLATIONS risk factor", () => {
      const result = calculateRiskScore([RISK_FACTORS.FREQUENT_CANCELLATIONS]);
      expect(result).toBe(75);
    });

    it("should calculate multiple factors", () => {
      const factors = [
        RISK_FACTORS.NO_SHOW,
        RISK_FACTORS.FREQUENT_CANCELLATIONS,
      ];
      const result = calculateRiskScore(factors);
      // (100 * 1.0 + 75 * 0.8) / 1.8 = 88.89 => 89
      expect(result).toBe(89);
    });
  });

  describe("getRiskLevel", () => {
    it("should return low for score < 25", () => {
      expect(getRiskLevel(0)).toBe("low");
      expect(getRiskLevel(24)).toBe("low");
    });

    it("should return medium for score 25-49", () => {
      expect(getRiskLevel(25)).toBe("medium");
      expect(getRiskLevel(49)).toBe("medium");
    });

    it("should return high for score 50-74", () => {
      expect(getRiskLevel(50)).toBe("high");
      expect(getRiskLevel(74)).toBe("high");
    });

    it("should return critical for score >= 75", () => {
      expect(getRiskLevel(75)).toBe("critical");
      expect(getRiskLevel(100)).toBe("critical");
    });
  });

  describe("RISK_FACTORS", () => {
    it("should have NO_SHOW as highest risk", () => {
      expect(RISK_FACTORS.NO_SHOW.weight).toBe(1.0);
      expect(RISK_FACTORS.NO_SHOW.score).toBe(100);
    });

    it("should have INACTIVE as lowest risk", () => {
      expect(RISK_FACTORS.INACTIVE.weight).toBe(0.3);
      expect(RISK_FACTORS.INACTIVE.score).toBe(30);
    });

    it("should have all required properties", () => {
      Object.values(RISK_FACTORS).forEach((factor) => {
        expect(factor).toHaveProperty("name");
        expect(factor).toHaveProperty("weight");
        expect(factor).toHaveProperty("score");
        expect(typeof factor.name).toBe("string");
        expect(typeof factor.weight).toBe("number");
        expect(typeof factor.score).toBe("number");
      });
    });

    it("should have weights between 0 and 1", () => {
      Object.values(RISK_FACTORS).forEach((factor) => {
        expect(factor.weight).toBeGreaterThanOrEqual(0);
        expect(factor.weight).toBeLessThanOrEqual(1);
      });
    });

    it("should have scores between 0 and 100", () => {
      Object.values(RISK_FACTORS).forEach((factor) => {
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(100);
      });
    });
  });
});
