import { Badge } from "@/components/ui/badge";
import { RiskLabel as RiskLabelType } from "@prisma/client";

const RISK_EMOJI: Record<RiskLabelType, string> = {
  LOW: "",
  MEDIUM: "",
  HIGH: "",
  CRITICAL: "",
};

const RISK_TEXT: Record<RiskLabelType, string> = {
  LOW: "Low Risk",
  MEDIUM: "Medium Risk",
  HIGH: "High Risk",
  CRITICAL: "Critical Risk",
};

interface RiskLabelProps {
  label: RiskLabelType;
  score?: number;
  showScore?: boolean;
}

export function RiskLabelBadge({ label, score, showScore = false }: RiskLabelProps) {
  return (
    <Badge variant={label}>
      {RISK_EMOJI[label]} {RISK_TEXT[label]}
      {showScore && score !== undefined && ` (${Math.round(score)}/100)`}
    </Badge>
  );
}
