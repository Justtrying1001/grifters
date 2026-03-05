import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RiskLabelBadge } from "@/components/shared/risk-label";
import { IncidentTypeBadge } from "@/components/shared/incident-type-badge";
import { ScoreBreakdown } from "@/components/shared/score-breakdown";
import { DisclaimerFooter } from "@/components/shared/disclaimer-banner";
import { Card, CardContent } from "@/components/ui/card";
import { computeRiskScore } from "@/lib/risk-score";
import { Globe, ExternalLink } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
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
      people: { include: { person: true } },
    },
  });

  if (!project) notFound();

  const approvedIncidents = project.incidents.filter(
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

  const links = project.links as Record<string, string>;

  const responses = await prisma.response.findMany({
    where: { entityId: project.id, status: "APPROVED" },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">{project.name}</h1>
            <div className="flex gap-3 text-sm text-zinc-500 mt-1">
              {project.chain && <span>Chain: {project.chain}</span>}
              {project.category && <span>· {project.category}</span>}
            </div>
          </div>
          <RiskLabelBadge label={project.riskLabel} score={project.riskScore} showScore />
        </div>

        {/* Links */}
        {Object.keys(links).length > 0 && (
          <div className="flex flex-wrap gap-3">
            {Object.entries(links).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded px-3 py-1.5"
              >
                <Globe className="h-3.5 w-3.5" />
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <div className="mb-8">
          <p className="text-zinc-600 leading-relaxed">{project.description}</p>
        </div>
      )}

      {/* Contract Addresses */}
      {project.contractAddresses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">Contract Addresses</h2>
          <div className="space-y-1">
            {project.contractAddresses.map((addr) => (
              <code key={addr} className="block text-xs bg-zinc-100 px-3 py-2 rounded font-mono text-zinc-700">
                {addr}
              </code>
            ))}
          </div>
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

      {/* Linked People */}
      {project.people.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Linked Individuals</h2>
          <div className="flex flex-wrap gap-2">
            {project.people.map(({ person }) => (
              <Link
                key={person.id}
                href={`/people/${person.slug}`}
                className="inline-flex items-center gap-2 text-sm border border-zinc-200 rounded px-3 py-1.5 hover:bg-zinc-50"
              >
                {person.name}
                <RiskLabelBadge label={person.riskLabel} />
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
          <p className="text-zinc-500 text-sm">No approved incidents linked to this project.</p>
        ) : (
          <div className="space-y-3">
            {approvedIncidents.map(({ incident }) => (
              <Link key={incident.id} href={`/incidents/${incident.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <IncidentTypeBadge type={incident.type} />
                      <span className="text-xs text-zinc-400">
                        {new Date(incident.date).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700">{incident.summary}</p>
                    <p className="text-xs text-zinc-400 mt-1">{incident.sources.length} source{incident.sources.length !== 1 ? "s" : ""}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Response */}
      {responses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Response from {project.name}</h2>
          {responses.map((r) => (
            <div key={r.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{r.content}</p>
              <p className="text-xs text-zinc-400 mt-2">Submitted {new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <Link href={`/dispute?target=/projects/${project.slug}`} className="text-sm border border-zinc-300 px-4 py-2 rounded hover:bg-zinc-50">
          Dispute this profile
        </Link>
      </div>

      <DisclaimerFooter />
    </div>
  );
}
