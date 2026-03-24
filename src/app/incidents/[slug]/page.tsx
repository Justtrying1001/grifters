import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IncidentTypeBadge } from "@/components/shared/incident-type-badge";
import { RiskLabelBadge } from "@/components/shared/risk-label";
import { DisclaimerFooter } from "@/components/shared/disclaimer-banner";
import { EvidenceStatusBadge } from "@/components/shared/evidence-status-badge";
import { ExternalLink, Archive } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function IncidentPage({ params }: Props) {
  const { slug } = await params;

  const incident = await prisma.incident.findUnique({
    where: { slug, status: "APPROVED" },
    include: {
      sources: true,
      onChainEvidence: true,
      people: { include: { person: { select: { slug: true, name: true, riskLabel: true } } } },
      projects: { include: { project: { select: { slug: true, name: true, riskLabel: true } } } },
      responses: { where: { status: "APPROVED" } },
    },
  });

  if (!incident) notFound();

  const evidenceStatus = incident.evidenceStatus as "ALLEGED" | "VERIFIED" | "CONTESTED";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <IncidentTypeBadge type={incident.type} />
          <EvidenceStatusBadge status={evidenceStatus} size="md" />
          <span className="text-sm text-zinc-500">
            {new Date(incident.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
            Approved
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 leading-tight mb-4">
          {incident.summary}
        </h1>

        {/* Linked entities */}
        <div className="flex flex-wrap gap-3">
          {incident.people.map((ip) => (
            <Link
              key={ip.personId}
              href={`/people/${ip.person.slug}`}
              className="inline-flex items-center gap-1.5 text-sm border border-zinc-200 rounded px-3 py-1 hover:bg-zinc-50"
            >
              {ip.person.name}
              <RiskLabelBadge label={ip.person.riskLabel} />
            </Link>
          ))}
          {incident.projects.map((ip) => (
            <Link
              key={ip.projectId}
              href={`/projects/${ip.project.slug}`}
              className="inline-flex items-center gap-1.5 text-sm border border-zinc-200 rounded px-3 py-1 hover:bg-zinc-50"
            >
              {ip.project.name}
              <RiskLabelBadge label={ip.project.riskLabel} />
            </Link>
          ))}
        </div>
      </div>

      {/* Narrative */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-zinc-900 mb-3">Incident Report</h2>
        <div className="prose prose-zinc max-w-none">
          <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap">{incident.narrative}</p>
        </div>
      </div>

      {/* On-chain evidence — shown for VERIFIED incidents */}
      {evidenceStatus === "VERIFIED" && incident.onChainEvidence.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">
            On-Chain Evidence ({incident.onChainEvidence.length})
          </h2>
          <div className="space-y-2">
            {incident.onChainEvidence.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between border border-zinc-200 rounded-lg px-4 py-2.5">
                <div>
                  <code className="text-xs font-mono text-zinc-700">{ev.txHash}</code>
                  <span className="ml-2 text-xs text-zinc-400">{ev.chain}</span>
                  {ev.externallyConfirmed && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">confirmed</span>
                  )}
                </div>
                <a
                  href={ev.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on explorer
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-zinc-900 mb-3">
          Sources ({incident.sources.length})
        </h2>
        <div className="space-y-3">
          {incident.sources.map((source) => (
            <div key={source.id} className="border border-zinc-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-sm text-zinc-900 hover:underline flex items-center gap-1"
                >
                  {source.title}
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                </a>
                <div className="flex items-center gap-2 shrink-0">
                  {source.archiveUrl && (
                    <a
                      href={source.archiveUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded px-2 py-0.5"
                    >
                      <Archive className="h-3 w-3" />
                      Archived
                    </a>
                  )}
                </div>
              </div>
              {source.excerpt && (
                <blockquote className="text-sm text-zinc-500 italic border-l-2 border-zinc-200 pl-3 leading-relaxed">
                  {source.excerpt}
                </blockquote>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Response section */}
      {incident.responses.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Response / Right to Reply</h2>
          {incident.responses.map((r) => (
            <div key={r.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{r.content}</p>
              <p className="text-xs text-zinc-400 mt-2">Submitted {new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mb-6 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-xs text-zinc-500 leading-relaxed">
        Information on this page is based on public reporting and on-chain data. Grifter does not
        assert legal guilt. Evidence status reflects independent verification by Grifter only.
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        <Link
          href={`/dispute?target=/incidents/${incident.slug}`}
          className="text-sm border border-zinc-300 px-4 py-2 rounded hover:bg-zinc-50"
        >
          Dispute this incident
        </Link>
      </div>

      <DisclaimerFooter />
    </div>
  );
}
