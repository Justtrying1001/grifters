import { IncidentType, RiskLabel } from "@prisma/client";

const BASE_SCORES: Record<IncidentType, number> = {
  MISLEADING_PROMOTION: 10,
  PUMP_AND_DUMP: 20,
  INSIDER_DUMP: 25,
  SCAM: 35,
  RUG_PULL: 40,
  EXIT_SCAM: 45,
  OTHER: 15,
};

function getRecencyFactor(incidentDate: Date): number {
  const now = new Date();
  const ageMonths =
    (now.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (ageMonths < 6) return 1.0;
  if (ageMonths < 18) return 0.85;
  if (ageMonths < 36) return 0.65;
  return 0.45;
}

function getConfidenceFactor(
  sourceCount: number,
  hasArchived: boolean
): number {
  if (sourceCount >= 3 && hasArchived) return 1.0;
  if (sourceCount >= 2 || hasArchived) return 0.8;
  return 0.6;
}

function getRiskLabel(score: number): RiskLabel {
  if (score <= 25) return "LOW";
  if (score <= 50) return "MEDIUM";
  if (score <= 75) return "HIGH";
  return "CRITICAL";
}

export interface IncidentScoreInput {
  type: IncidentType;
  date: Date;
  sourceCount: number;
  hasArchivedSource: boolean;
}

export interface ScoreBreakdownItem {
  type: IncidentType;
  date: Date;
  baseScore: number;
  recencyFactor: number;
  confidenceFactor: number;
  contribution: number;
}

export interface ScoreResult {
  score: number;
  label: RiskLabel;
  breakdown: ScoreBreakdownItem[];
}

export function computeRiskScore(incidents: IncidentScoreInput[]): ScoreResult {
  const breakdown: ScoreBreakdownItem[] = incidents.map((incident) => {
    const baseScore = BASE_SCORES[incident.type];
    const recencyFactor = getRecencyFactor(incident.date);
    const confidenceFactor = getConfidenceFactor(
      incident.sourceCount,
      incident.hasArchivedSource
    );
    const contribution = baseScore * recencyFactor * confidenceFactor;

    return {
      type: incident.type,
      date: incident.date,
      baseScore,
      recencyFactor,
      confidenceFactor,
      contribution,
    };
  });

  const rawSum = breakdown.reduce((sum, item) => sum + item.contribution, 0);

  // Apply multiple incidents multiplier: each additional incident adds diminishing value
  let multipliedScore = rawSum;
  if (breakdown.length > 1) {
    // Soft cap: normalize using sqrt to prevent runaway scores
    multipliedScore = rawSum * Math.sqrt(1 + (breakdown.length - 1) * 0.3);
  }

  const score = Math.min(100, Math.round(multipliedScore));
  const label = getRiskLabel(score);

  return { score, label, breakdown };
}

export function formatIncidentTypeLabel(type: IncidentType): string {
  const labels: Record<IncidentType, string> = {
    SCAM: "Scam",
    RUG_PULL: "Rug Pull",
    PUMP_AND_DUMP: "Pump & Dump",
    MISLEADING_PROMOTION: "Misleading Promotion",
    INSIDER_DUMP: "Insider Dump",
    EXIT_SCAM: "Exit Scam",
    OTHER: "Other",
  };
  return labels[type];
}

export { getRiskLabel, BASE_SCORES };
