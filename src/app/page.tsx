import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/components/shared/search-bar";
import { RiskLabelBadge } from "@/components/shared/risk-label";
import { IncidentTypeBadge } from "@/components/shared/incident-type-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Users, FolderOpen, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [latestIncidents, notableProfiles, counts] = await Promise.all([
    prisma.incident.findMany({
      where: { status: "APPROVED" },
      take: 5,
      orderBy: { date: "desc" },
      include: {
        people: { include: { person: { select: { slug: true, name: true } } } },
        projects: { include: { project: { select: { slug: true, name: true } } } },
      },
    }),
    prisma.person.findMany({
      where: { riskScore: { gt: 0 } },
      take: 5,
      orderBy: { riskScore: "desc" },
      include: { _count: { select: { incidents: true } } },
    }),
    Promise.all([
      prisma.person.count(),
      prisma.project.count(),
      prisma.incident.count({ where: { status: "APPROVED" } }),
    ]),
  ]);

  const [peopleCount, projectCount, incidentCount] = counts;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight mb-4">
          The Crypto Incident Database
        </h1>
        <p className="text-lg text-zinc-500 max-w-2xl mx-auto mb-8">
          Evidence-based documentation of scams, rug pulls, pump &amp; dump schemes, and grift
          incidents. Every claim is sourced. All presented neutrally.
        </p>

        <SearchBar className="max-w-2xl mx-auto mb-8" />

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-md hover:bg-zinc-700 transition-colors font-medium"
          >
            Submit an Incident
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-2 border border-zinc-300 text-zinc-700 px-6 py-3 rounded-md hover:bg-white transition-colors font-medium"
          >
            About our Methodology
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        {[
          { count: peopleCount, label: "Documented Persons", icon: Users, href: "/people" },
          { count: projectCount, label: "Documented Projects", icon: FolderOpen, href: "/projects" },
          { count: incidentCount, label: "Verified Incidents", icon: AlertTriangle, href: "/incidents" },
        ].map(({ count, label, icon: Icon, href }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <Icon className="h-6 w-6 mx-auto mb-2 text-zinc-400" />
                <div className="text-2xl font-bold text-zinc-900">{count}</div>
                <div className="text-sm text-zinc-500">{label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* Latest Incidents */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-zinc-900">Latest Incidents</h2>
            <Link href="/incidents" className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {latestIncidents.map((incident) => (
              <Link key={incident.id} href={`/incidents/${incident.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <IncidentTypeBadge type={incident.type} />
                          <span className="text-xs text-zinc-400">
                            {new Date(incident.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-700 line-clamp-2">{incident.summary}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {incident.people.slice(0, 2).map((ip) => (
                            <span key={ip.personId} className="text-xs text-zinc-400">
                              {ip.person.name}
                            </span>
                          ))}
                          {incident.projects.slice(0, 1).map((ip) => (
                            <span key={ip.projectId} className="text-xs text-zinc-400">
                              · {ip.project.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Notable Profiles */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-zinc-900">Notable Profiles</h2>
            <Link href="/people" className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {notableProfiles.map((person) => (
              <Link key={person.id} href={`/people/${person.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-zinc-900 truncate">{person.name}</p>
                        {person.aliases.length > 0 && (
                          <p className="text-xs text-zinc-400 truncate">{person.aliases.slice(0,2).join(", ")}</p>
                        )}
                        <p className="text-xs text-zinc-500 mt-1">
                          {person._count.incidents} incident{person._count.incidents !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <RiskLabelBadge label={person.riskLabel} score={person.riskScore} showScore />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
