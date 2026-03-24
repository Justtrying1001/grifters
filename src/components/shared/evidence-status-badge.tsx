interface EvidenceStatusBadgeProps {
  status: "ALLEGED" | "VERIFIED" | "CONTESTED";
  size?: "sm" | "md";
}

const CONFIGS = {
  ALLEGED: {
    label: "Alleged",
    icon: "🔍",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  VERIFIED: {
    label: "Verified",
    icon: "✅",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  CONTESTED: {
    label: "Contested",
    icon: "⚠️",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export function EvidenceStatusBadge({ status, size = "sm" }: EvidenceStatusBadgeProps) {
  const config = CONFIGS[status] ?? CONFIGS.ALLEGED;
  const sizeClass = size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${sizeClass} ${config.className}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
