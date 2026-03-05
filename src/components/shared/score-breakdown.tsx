"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { IncidentType } from "@prisma/client";
import { ScoreBreakdownItem } from "@/lib/risk-score";

const TYPE_LABELS: Record<IncidentType, string> = {
  SCAM: "Scam", RUG_PULL: "Rug Pull", PUMP_AND_DUMP: "Pump & Dump",
  MISLEADING_PROMOTION: "Misleading Promotion", INSIDER_DUMP: "Insider Dump",
  EXIT_SCAM: "Exit Scam", OTHER: "Other",
};

interface ScoreBreakdownProps {
  score: number;
  label: string;
  breakdown: ScoreBreakdownItem[];
}

export function ScoreBreakdown({ score, label, breakdown }: ScoreBreakdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
      >
        <span className="text-sm font-medium text-zinc-700">
          Why this score? ({score}/100 — {label})
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>

      {open && (
        <div className="p-4 bg-white border-t border-zinc-200">
          <div className="font-mono text-xs space-y-1.5">
            <div className="text-zinc-500 mb-3">
              Score: {score}/100 ({label})
            </div>
            {breakdown.map((item, i) => (
              <div key={i} className="text-zinc-600">
                <span className="text-zinc-400 mr-1">{i === breakdown.length - 1 ? "└─" : "├─"}</span>
                {TYPE_LABELS[item.type]} ({new Date(item.date).toISOString().slice(0, 7)})
                {" → "}base {item.baseScore}
                {" × "}recency {item.recencyFactor}
                {" × "}confidence {item.confidenceFactor}
                {" = "}
                <span className="font-semibold text-zinc-900">
                  {item.contribution.toFixed(1)}
                </span>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-zinc-100 text-zinc-700">
              Total: {score}/100
              {breakdown.length > 1 && (
                <span className="text-zinc-400 ml-1">(multiple incidents multiplier applied)</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
