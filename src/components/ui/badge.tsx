import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-zinc-100 text-zinc-800",
        LOW: "bg-green-100 text-green-800",
        MEDIUM: "bg-yellow-100 text-yellow-800",
        HIGH: "bg-orange-100 text-orange-800",
        CRITICAL: "bg-red-100 text-red-800",
        SCAM: "bg-red-100 text-red-700",
        RUG_PULL: "bg-red-200 text-red-900",
        PUMP_AND_DUMP: "bg-orange-100 text-orange-800",
        MISLEADING_PROMOTION: "bg-yellow-100 text-yellow-800",
        INSIDER_DUMP: "bg-orange-200 text-orange-900",
        EXIT_SCAM: "bg-red-300 text-red-900",
        OTHER: "bg-zinc-100 text-zinc-700",
        PENDING: "bg-yellow-100 text-yellow-800",
        APPROVED: "bg-green-100 text-green-800",
        REJECTED: "bg-red-100 text-red-800",
        CHANGES_REQUESTED: "bg-orange-100 text-orange-800",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
