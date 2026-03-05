import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RiskLabelBadge } from "@/components/shared/risk-label";
import { IncidentTypeBadge } from "@/components/shared/incident-type-badge";
import { ScoreBreakdown } from "@/components/shared/score-breakdown";
import { DisclaimerFooter } from "@/components/shared/disclaimer-banner";
import { Card, CardContent } from "@/components/ui/card";
import { computeRiskScore } from "@/lib/risk-score";
import { Twitter, Globe, ExternalLink } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;

  const person = await prisma.person.findUnique({
    where: { slug },
    include: {
      incidents: {
        where: { incident: { status: "APPROVED" } },
        include: {
          incident: {
            include: { sources: true },
          },
        },
        orderBy: { incident: { date: "desc" } },
      },
      projects: { include: { project: true } },
    },
  });

  if (!person) notFound();

  const approvedIncidents = person.incidents.filter(
    (ip) => ip.incident.status === "APPROVED"
  );

  const scoreResult = computeRiskScore(
    approvedIncidents.map((ip) => ({
      type: ip.incident.type,
      date: ip.incident.date,
      sourceCount: ip.incident.sources.length,
      hasArchivedSource: ip.incident.sources.some((s) => !!s.archiveUrl),
    }))
  );

  const socials = person.socials as Record<string, string>;

  // Get approved responses
  const responses = await prisma.response.findMany({
    where: { entityId: person.id, status: "APPROVED" },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">{person.name}</h1>
            {person.aliases.length > 0 && (
              <p className="text-zinc-500 mt-1">
                Also known as: {person.aliases.join(", ")}
              </p>
            )}
            {person.roles.length > 0 && (
              <p className="text-sm text-zinc-400 mt-1">{person.roles.join(" · ")}</p>
            )}
          </div>
          <RiskLabelBadge label={person.riskLabel} score={person.riskScore} showScore />
        </div>

        {/* Socials */}
        {Object.keys(socials).length > 0 && (
          <div className="flex flex-wrap gap-3">
            {Object.entries(socials).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded px-3 py-1.5"
              >
                {platform === "twitter" ? <Twitter className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      {person.description && (
        <div className="mb-8">
          <p className="text-zinc-600 leading-relaxed">{person.description}</p>
        </div>
      )}

      {/* Risk Score */}
      {approvedIncidents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Risk Assessment</h2>
          <ScoreBreakdown
            score={scoreResult.score}
            label={scoreResult.label}
            breakdown={scoreResult.breakdown}
          />
        </div>
      )}

      {/* Linked Projects */}
      {person.projects.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Linked Projects</h2>
          <div className="flex flex-wrap gap-2">
            {person.projects.map(({ project }) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="inline-flex items-center gap-1.5 text-sm border border-zinc-200 rounded px-3 py-1.5 hover:bg-zinc-50"
              >
                {project.name}
                {project.chain && (
                  <span className="text-xs text-zinc-400">· {project.chain}</span>
                )}
                <RiskLabelBadge label={project.riskLabel} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Incidents */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 mb-3">
          Linked Incidents ({approvedIncidents.length})
        </h2>
        {approvedIncidents.length === 0 ? (
          <p className="text-zinc-500 text-sm">No approved incidents linked to this profile.</p>
        ) : (
          <div className="space-y-3">
            {approvedIncidents.map(({ incident }) => (
              <Link key={incident.id} href={`/incidents/${incident.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <IncidentTypeBadge type={incident.type} />
                          <span className="text-xs text-zinc-400">
                            {new Date(incident.date).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-700">{incident.summary}</p>
                        <p className="text-xs text-zinc-400 mt-1">{incident.sources.length} source{incident.sources.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Response section */}
      {responses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Response from {person.name}</h2>
          {responses.map((r) => (
            <div key={r.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{r.content}</p>
              <p className="text-xs text-zinc-400 mt-2">
                Submitted {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-8">
        <Link
          href={`/dispute?target=/people/${person.slug}`}
          className="text-sm border border-zinc-300 px-4 py-2 rounded hover:bg-zinc-50"
        >
          Dispute this profile
        </Link>
      </div>

      <DisclaimerFooter />
    </div>
  );
}
