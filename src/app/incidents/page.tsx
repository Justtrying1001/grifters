import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IncidentTypeBadge } from "@/components/shared/incident-type-badge";
import { Card, CardContent } from "@/components/ui/card";
import { IncidentType } from "@prisma/client";

export const dynamic = "force-dynamic";

const INCIDENT_TYPES: IncidentType[] = [
  "SCAM", "RUG_PULL", "PUMP_AND_DUMP", "MISLEADING_PROMOTION", "INSIDER_DUMP", "EXIT_SCAM", "OTHER"
];
const TYPE_LABELS: Record<IncidentType, string> = {
  SCAM: "Scam", RUG_PULL: "Rug Pull", PUMP_AND_DUMP: "Pump & Dump",
  MISLEADING_PROMOTION: "Misleading Promotion", INSIDER_DUMP: "Insider Dump",
  EXIT_SCAM: "Exit Scam", OTHER: "Other",
};
const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

interface SearchParams {
  page?: string;
  type?: string;
  year?: string;
  chain?: string;
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;
  const type = sp.type as IncidentType | undefined;
  const year = sp.year;
  const chain = sp.chain;

  const where: Record<string, unknown> = { status: "APPROVED" };
  if (type) where.type = type;
  if (year) {
    where.date = {
      gte: new Date(`${year}-01-01`),
      lt: new Date(`${parseInt(year) + 1}-01-01`),
    };
  }
  if (chain) {
    where.projects = {
      some: { project: { chain: { contains: chain, mode: "insensitive" } } },
    };
  }

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "desc" },
      include: {
        people: { include: { person: { select: { slug: true, name: true } } } },
        projects: { include: { project: { select: { slug: true, name: true } } } },
        _count: { select: { sources: true } },
      },
    }),
    prisma.incident.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  function buildUrl(params: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { type, year, chain, page: undefined, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/incidents?${p.toString()}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 mb-1">Incidents Feed</h1>
        <p className="text-zinc-500">{total} documented incident{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters */}
        <aside className="lg:w-56 shrink-0">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Type</h3>
              <div className="space-y-1">
                <Link href={buildUrl({ type: undefined })} className={`block text-sm px-2 py-1.5 rounded ${!type ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                  All Types
                </Link>
                {INCIDENT_TYPES.map((t) => (
                  <Link key={t} href={buildUrl({ type: t })} className={`block text-sm px-2 py-1.5 rounded ${type === t ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
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
        <div className="flex-1 space-y-4">
          {incidents.map((incident) => (
            <Link key={incident.id} href={`/incidents/${incident.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <IncidentTypeBadge type={incident.type} />
                        <span className="text-xs text-zinc-400">
                          {new Date(incident.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </span>
                        <span className="text-xs text-zinc-400">
                          · {incident._count.sources} source{incident._count.sources !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-700 mb-2">{incident.summary}</p>
                      <div className="flex flex-wrap gap-2">
                        {incident.people.map((ip) => (
                          <span key={ip.personId} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                            {ip.person.name}
                          </span>
                        ))}
                        {incident.projects.map((ip) => (
                          <span key={ip.projectId} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                            {ip.project.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {incidents.length === 0 && (
            <div className="text-center py-16 text-zinc-400">No incidents found for the selected filters.</div>
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
