import { Badge } from "@/components/ui/badge";
import { IncidentType } from "@prisma/client";

const TYPE_LABELS: Record<IncidentType, string> = {
  SCAM: "Scam",
  RUG_PULL: "Rug Pull",
  PUMP_AND_DUMP: "Pump & Dump",
  MISLEADING_PROMOTION: "Misleading Promotion",
  INSIDER_DUMP: "Insider Dump",
  EXIT_SCAM: "Exit Scam",
  OTHER: "Other",
};

export function IncidentTypeBadge({ type }: { type: IncidentType }) {
  return <Badge variant={type}>{TYPE_LABELS[type]}</Badge>;
}
