import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RiskLabelBadge } from "@/components/shared/risk-label";
import { Card, CardContent } from "@/components/ui/card";
import { RiskLabel, IncidentType } from "@prisma/client";

export const dynamic = "force-dynamic";

const INCIDENT_TYPES: IncidentType[] = [
  "SCAM", "RUG_PULL", "PUMP_AND_DUMP", "MISLEADING_PROMOTION", "INSIDER_DUMP", "EXIT_SCAM", "OTHER"
];
const RISK_LABELS: RiskLabel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TYPE_LABELS: Record<IncidentType, string> = {
  SCAM: "Scam", RUG_PULL: "Rug Pull", PUMP_AND_DUMP: "Pump & Dump",
  MISLEADING_PROMOTION: "Misleading Promotion", INSIDER_DUMP: "Insider Dump",
  EXIT_SCAM: "Exit Scam", OTHER: "Other",
};
const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

interface SearchParams {
  page?: string;
  riskLabel?: string;
  incidentType?: string;
  year?: string;
  chain?: string;
  category?: string;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;
  const riskLabel = sp.riskLabel as RiskLabel | undefined;
  const incidentType = sp.incidentType as IncidentType | undefined;
  const year = sp.year;
  const chain = sp.chain;
  const category = sp.category;

  const where: Record<string, unknown> = {};
  if (riskLabel) where.riskLabel = riskLabel;
  if (chain) where.chain = { contains: chain, mode: "insensitive" };
  if (category) where.category = { contains: category, mode: "insensitive" };
  if (incidentType || year) {
    where.incidents = {
      some: {
        incident: {
          status: "APPROVED",
          ...(incidentType && { type: incidentType }),
          ...(year && {
            date: {
              gte: new Date(`${year}-01-01`),
              lt: new Date(`${parseInt(year) + 1}-01-01`),
            },
          }),
        },
      },
    };
  }

  // Get distinct chains and categories for filters
  const [projects, total, chains] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { riskScore: "desc" },
      include: { _count: { select: { incidents: true } } },
    }),
    prisma.project.count({ where }),
    prisma.project.findMany({
      select: { chain: true },
      where: { chain: { not: null } },
      distinct: ["chain"],
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  function buildUrl(params: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { riskLabel, incidentType, year, chain, category, page: undefined, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/projects?${p.toString()}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 mb-1">Projects Directory</h1>
        <p className="text-zinc-500">{total} documented project{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters */}
        <aside className="lg:w-56 shrink-0">
          <div className="space-y-6">
            {chains.filter(c => c.chain).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Chain</h3>
                <div className="space-y-1">
                  <Link href={buildUrl({ chain: undefined })} className={`block text-sm px-2 py-1.5 rounded ${!chain ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                    All Chains
                  </Link>
                  {chains.map((c) => c.chain && (
                    <Link key={c.chain} href={buildUrl({ chain: c.chain })} className={`block text-sm px-2 py-1.5 rounded ${chain === c.chain ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                      {c.chain}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Risk Level</h3>
              <div className="space-y-1">
                <Link href={buildUrl({ riskLabel: undefined })} className={`block text-sm px-2 py-1.5 rounded ${!riskLabel ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                  All Levels
                </Link>
                {RISK_LABELS.map((l) => (
                  <Link key={l} href={buildUrl({ riskLabel: l })} className={`block text-sm px-2 py-1.5 rounded ${riskLabel === l ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                    {l.charAt(0) + l.slice(1).toLowerCase()}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Incident Type</h3>
              <div className="space-y-1">
                <Link href={buildUrl({ incidentType: undefined })} className={`block text-sm px-2 py-1.5 rounded ${!incidentType ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                  All Types
                </Link>
                {INCIDENT_TYPES.map((t) => (
                  <Link key={t} href={buildUrl({ incidentType: t })} className={`block text-sm px-2 py-1.5 rounded ${incidentType === t ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                    {TYPE_LABELS[t]}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Year</h3>
              <div className="space-y-1">
                <Link href={buildUrl({ year: undefined })} className={`block text-sm px-2 py-1.5 rounded ${!year ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                  All Years
                </Link>
                {YEARS.map((y) => (
                  <Link key={y} href={buildUrl({ year: y })} className={`block text-sm px-2 py-1.5 rounded ${year === y ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                    {y}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900">{project.name}</p>
                        <div className="flex gap-2 text-xs text-zinc-400 mt-0.5">
                          {project.chain && <span>{project.chain}</span>}
                          {project.category && <span>· {project.category}</span>}
                        </div>
                      </div>
                      <RiskLabelBadge label={project.riskLabel} score={project.riskScore} showScore />
                    </div>
                    <p className="text-xs text-zinc-400">
                      {project._count.incidents} linked incident{project._count.incidents !== 1 ? "s" : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {projects.length === 0 && (
            <div className="text-center py-16 text-zinc-400">No results found for the selected filters.</div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })} className="px-4 py-2 border border-zinc-300 rounded text-sm hover:bg-white">
                  Previous
                </Link>
              )}
              <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link href={buildUrl({ page: String(page + 1) })} className="px-4 py-2 border border-zinc-300 rounded text-sm hover:bg-white">
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
