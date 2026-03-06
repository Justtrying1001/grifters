import "dotenv/config";
import { CandidateEntityKind, IncidentStatus, IncidentType, Prisma, PrismaClient } from "@prisma/client";

type CliOptions = {
  dryRun: boolean;
  limit?: number;
  sourceId?: string;
  minIncidentConfidence: number;
};

type MaterializeStats = {
  createdEntities: number;
  mergedEntities: number;
  createdIncidents: number;
  createdClaims: number;
  createdWalletLinks: number;
  queuedAmbiguous: number;
  linkedIncidentEntities: number;
};

const prisma = new PrismaClient();

function parseOptions(argv: string[]): CliOptions {
  const dryRun = argv.includes("--dry-run");
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const sourceArg = argv.find((arg) => arg.startsWith("--source-id="));
  const minIncidentConfidenceArg = argv.find((arg) => arg.startsWith("--min-incident-confidence="));

  return {
    dryRun,
    limit: limitArg ? Number(limitArg.split("=")[1]) : undefined,
    sourceId: sourceArg ? sourceArg.split("=")[1] : undefined,
    minIncidentConfidence: minIncidentConfidenceArg ? Number(minIncidentConfidenceArg.split("=")[1]) : 0.5,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function mapCandidateKind(kind: CandidateEntityKind): "PERSON" | "ORGANIZATION" | "PROJECT" | "UNKNOWN" {
  if (kind === "PERSON" || kind === "ALIAS" || kind === "X_HANDLE") return "PERSON";
  if (kind === "ORGANIZATION") return "ORGANIZATION";
  if (kind === "PROJECT") return "PROJECT";
  return "UNKNOWN";
}

function incidentSummary(threadId: string, entityCount: number, claimCount: number): string {
  const summary = `Candidate materialization for source ${threadId} with ${entityCount} entities and ${claimCount} extracted claims.`;
  return summary.length > 250 ? `${summary.slice(0, 247)}...` : summary;
}

async function queueManualReview(
  tx: Prisma.TransactionClient,
  input: {
    dedupeKey: string;
    queueType: string;
    reason: string;
    threadCandidateId?: string;
    candidateEntityId?: string;
    candidateWalletId?: string;
    payload: Prisma.InputJsonValue;
  },
  dryRun: boolean
): Promise<boolean> {
  const existing = await tx.manualReviewQueue.findUnique({ where: { dedupeKey: input.dedupeKey } });
  if (existing) return false;

  if (!dryRun) {
    await tx.manualReviewQueue.create({
      data: {
        dedupeKey: input.dedupeKey,
        queueType: input.queueType,
        reason: input.reason,
        threadCandidateId: input.threadCandidateId,
        candidateEntityId: input.candidateEntityId,
        candidateWalletId: input.candidateWalletId,
        payload: input.payload,
      },
    });
  }

  return true;
}

async function resolveEntity(
  tx: Prisma.TransactionClient,
  candidate: {
    id: string;
    kind: CandidateEntityKind;
    value: string;
    normalizedValue: string;
    confidence: number;
    evidenceSnippet: string;
    sourceMethod: string;
  },
  threadCandidateId: string,
  dryRun: boolean,
  stats: MaterializeStats
): Promise<string | null> {
  const normalized = normalizeText(candidate.normalizedValue || candidate.value);
  const kind = mapCandidateKind(candidate.kind);

  if (candidate.kind === "X_HANDLE") {
    const alias = await tx.entityAlias.findFirst({ where: { normalizedAlias: normalized } });
    if (alias) {
      stats.mergedEntities++;
      return alias.entityId;
    }
  }

  if (candidate.kind === "WALLET") {
    const wallet = await tx.entityWallet.findUnique({ where: { normalizedAddress: normalized } });
    if (wallet) {
      stats.mergedEntities++;
      return wallet.entityId;
    }
    return null;
  }

  const sameName = await tx.grifterEntity.findMany({ where: { normalizedName: normalized }, take: 2 });
  if (sameName.length > 1) {
    const queued = await queueManualReview(
      tx,
      {
        dedupeKey: `ambiguous:name:${threadCandidateId}:${candidate.id}`,
        queueType: "ENTITY_MATCH",
        reason: "Multiple entities share the same normalized name and no corroborating exact handle or wallet match was found.",
        threadCandidateId,
        candidateEntityId: candidate.id,
        payload: { candidate },
      },
      dryRun
    );
    if (queued) stats.queuedAmbiguous++;
    return null;
  }

  if (sameName.length === 1) {
    const existing = sameName[0];
    const corroboratingHandle = await tx.entityAlias.findFirst({
      where: {
        entityId: existing.id,
        normalizedAlias: normalized,
      },
    });

    if (corroboratingHandle) {
      stats.mergedEntities++;
      return existing.id;
    }

    const queued = await queueManualReview(
      tx,
      {
        dedupeKey: `review:name-only:${threadCandidateId}:${candidate.id}`,
        queueType: "ENTITY_MATCH",
        reason: "Name-only match requires manual review before merge.",
        threadCandidateId,
        candidateEntityId: candidate.id,
        payload: { candidate, matchedEntityId: existing.id },
      },
      dryRun
    );
    if (queued) stats.queuedAmbiguous++;
    return null;
  }

  if (candidate.confidence < 0.6) {
    const queued = await queueManualReview(
      tx,
      {
        dedupeKey: `low-confidence:entity:${threadCandidateId}:${candidate.id}`,
        queueType: "ENTITY_LOW_CONFIDENCE",
        reason: "Entity confidence is below auto-materialization threshold.",
        threadCandidateId,
        candidateEntityId: candidate.id,
        payload: { candidate },
      },
      dryRun
    );
    if (queued) stats.queuedAmbiguous++;
    return null;
  }

  if (!dryRun) {
    const created = await tx.grifterEntity.create({
      data: {
        kind,
        canonicalName: candidate.value,
        normalizedName: normalized,
        confidence: candidate.confidence,
        provenance: {
          source: "normalized_candidate_entities",
          candidateEntityId: candidate.id,
          threadCandidateId,
          sourceMethod: candidate.sourceMethod,
          evidenceSnippet: candidate.evidenceSnippet,
        },
      },
    });

    if (candidate.kind === "X_HANDLE" || candidate.kind === "ALIAS") {
      await tx.entityAlias.upsert({
        where: {
          entityId_normalizedAlias: {
            entityId: created.id,
            normalizedAlias: normalized,
          },
        },
        update: {
          confidence: Math.max(candidate.confidence, 0.7),
        },
        create: {
          entityId: created.id,
          alias: candidate.value,
          normalizedAlias: normalized,
          confidence: candidate.confidence,
          provenance: {
            source: "normalized_candidate_entities",
            candidateEntityId: candidate.id,
            threadCandidateId,
          },
        },
      });
    }

    stats.createdEntities++;
    return created.id;
  }

  stats.createdEntities++;
  return `dry-run-entity-${candidate.id}`;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));

  const where: Prisma.NormalizedThreadCandidateWhereInput = options.sourceId
    ? { id: options.sourceId }
    : {};

  const threadCandidates = await prisma.normalizedThreadCandidate.findMany({
    where,
    include: {
      rawSource: true,
      entities: true,
      claims: true,
      wallets: true,
    },
    take: options.limit,
    orderBy: { createdAt: "asc" },
  });

  console.log(
    `[materialize] Starting materialization for ${threadCandidates.length} normalized thread candidates (dryRun=${options.dryRun}).`
  );

  const stats: MaterializeStats = {
    createdEntities: 0,
    mergedEntities: 0,
    createdIncidents: 0,
    createdClaims: 0,
    createdWalletLinks: 0,
    queuedAmbiguous: 0,
    linkedIncidentEntities: 0,
  };

  for (const threadCandidate of threadCandidates) {
    await prisma.$transaction(async (tx) => {
      const incidentSlug = `normalized-${toSlug(threadCandidate.rawSource.externalId)}`;
      const incidentType = threadCandidate.incidentType ?? IncidentType.OTHER;
      const incidentConfidence = threadCandidate.confidence;

      let incident = await tx.incident.findUnique({ where: { slug: incidentSlug } });
      if (!incident) {
        if (!options.dryRun) {
          incident = await tx.incident.create({
            data: {
              slug: incidentSlug,
              type: incidentType,
              status: IncidentStatus.PENDING,
              date: threadCandidate.createdAt,
              summary: incidentSummary(threadCandidate.rawSource.externalId, threadCandidate.entities.length, threadCandidate.claims.length),
              narrative:
                "Materialized from normalized extraction candidates. This record reflects extracted source claims and requires review before publication.",
            },
          });
        }
        stats.createdIncidents++;
      } else if (!options.dryRun) {
        incident = await tx.incident.update({
          where: { id: incident.id },
          data: {
            type: incidentType,
            status: IncidentStatus.PENDING,
          },
        });
      }

      const incidentId = incident?.id ?? `dry-run-incident-${threadCandidate.id}`;

      const existingSource = await tx.incidentSource.findUnique({
        where: {
          threadCandidateId: threadCandidate.id,
        },
      });

      if (!existingSource && !options.dryRun) {
        await tx.incidentSource.create({
          data: {
            incidentId,
            rawSourceId: threadCandidate.rawSourceId,
            threadCandidateId: threadCandidate.id,
            confidence: incidentConfidence,
          },
        });
      }

      const source =
        existingSource ??
        (options.dryRun
          ? { id: `dry-run-source-${threadCandidate.id}` }
          : await tx.incidentSource.findUniqueOrThrow({ where: { threadCandidateId: threadCandidate.id } }));

      const entityIdsByCandidate = new Map<string, string>();

      for (const candidateEntity of threadCandidate.entities) {
        if (candidateEntity.kind === "WALLET") continue;

        const entityId = await resolveEntity(
          tx,
          {
            id: candidateEntity.id,
            kind: candidateEntity.kind,
            value: candidateEntity.value,
            normalizedValue: candidateEntity.normalizedValue,
            confidence: candidateEntity.confidence,
            evidenceSnippet: candidateEntity.evidenceSnippet,
            sourceMethod: candidateEntity.sourceMethod,
          },
          threadCandidate.id,
          options.dryRun,
          stats
        );

        if (!entityId) continue;
        entityIdsByCandidate.set(candidateEntity.id, entityId);

        const existingLink = await tx.incidentEntity.findFirst({
          where: {
            incidentId,
            entityId,
          },
        });

        if (!existingLink && !options.dryRun) {
          await tx.incidentEntity.create({
            data: {
              incidentId,
              entityId,
              role: candidateEntity.kind,
              confidence: candidateEntity.confidence,
              sourceCandidateEntityId: candidateEntity.id,
              provenance: {
                source: "normalized_candidate_entities",
                threadCandidateId: threadCandidate.id,
                candidateEntityId: candidateEntity.id,
              },
            },
          });
          stats.linkedIncidentEntities++;
        } else if (!existingLink) {
          stats.linkedIncidentEntities++;
        }

        if ((candidateEntity.kind === "X_HANDLE" || candidateEntity.kind === "ALIAS") && !options.dryRun) {
          await tx.entityAlias.upsert({
            where: {
              entityId_normalizedAlias: {
                entityId,
                normalizedAlias: normalizeText(candidateEntity.normalizedValue),
              },
            },
            update: {
              confidence: Math.max(candidateEntity.confidence, 0.7),
            },
            create: {
              entityId,
              alias: candidateEntity.value,
              normalizedAlias: normalizeText(candidateEntity.normalizedValue),
              confidence: candidateEntity.confidence,
              provenance: {
                source: "normalized_candidate_entities",
                candidateEntityId: candidateEntity.id,
                threadCandidateId: threadCandidate.id,
              },
            },
          });
        }
      }

      for (const walletCandidate of threadCandidate.wallets) {
        const normalizedAddress = normalizeText(walletCandidate.address);
        const matchedWallet = await tx.entityWallet.findUnique({ where: { normalizedAddress } });

        if (matchedWallet) {
          stats.mergedEntities++;
          continue;
        }

        if (walletCandidate.confidence < 0.9) {
          const queued = await queueManualReview(
            tx,
            {
              dedupeKey: `wallet-review:${threadCandidate.id}:${walletCandidate.id}`,
              queueType: "WALLET_OWNERSHIP",
              reason: "Wallet ownership confidence below auto-link threshold.",
              threadCandidateId: threadCandidate.id,
              candidateWalletId: walletCandidate.id,
              payload: { walletCandidate },
            },
            options.dryRun
          );
          if (queued) stats.queuedAmbiguous++;
          continue;
        }

        const linkedEntityCandidate = threadCandidate.entities.find(
          (entity) => entity.kind !== "WALLET" && walletCandidate.evidenceSnippet.includes(entity.value)
        );

        if (!linkedEntityCandidate) {
          const queued = await queueManualReview(
            tx,
            {
              dedupeKey: `wallet-unresolved:${threadCandidate.id}:${walletCandidate.id}`,
              queueType: "WALLET_OWNERSHIP",
              reason: "No high-confidence entity ownership mapping found for wallet.",
              threadCandidateId: threadCandidate.id,
              candidateWalletId: walletCandidate.id,
              payload: { walletCandidate },
            },
            options.dryRun
          );
          if (queued) stats.queuedAmbiguous++;
          continue;
        }

        const entityId = entityIdsByCandidate.get(linkedEntityCandidate.id);
        if (!entityId) {
          const queued = await queueManualReview(
            tx,
            {
              dedupeKey: `wallet-entity-missing:${threadCandidate.id}:${walletCandidate.id}`,
              queueType: "WALLET_OWNERSHIP",
              reason: "Wallet candidate references an entity candidate that was not safely materialized.",
              threadCandidateId: threadCandidate.id,
              candidateWalletId: walletCandidate.id,
              candidateEntityId: linkedEntityCandidate.id,
              payload: { walletCandidate, linkedEntityCandidateId: linkedEntityCandidate.id },
            },
            options.dryRun
          );
          if (queued) stats.queuedAmbiguous++;
          continue;
        }

        if (!options.dryRun) {
          await tx.entityWallet.create({
            data: {
              entityId,
              address: walletCandidate.address,
              normalizedAddress,
              chainHint: walletCandidate.chainHint,
              confidence: walletCandidate.confidence,
              provenance: {
                source: "normalized_candidate_wallets",
                walletCandidateId: walletCandidate.id,
                threadCandidateId: threadCandidate.id,
              },
            },
          });
        }
        stats.createdWalletLinks++;
      }

      for (const claimCandidate of threadCandidate.claims) {
        const exists = await tx.claim.findFirst({
          where: {
            incidentId,
            sourceCandidateClaimId: claimCandidate.id,
          },
        });

        if (exists) continue;

        if (claimCandidate.confidence < 0.5) {
          const queued = await queueManualReview(
            tx,
            {
              dedupeKey: `claim-review:${threadCandidate.id}:${claimCandidate.id}`,
              queueType: "CLAIM_CONFIDENCE",
              reason: "Claim confidence below materialization threshold.",
              threadCandidateId: threadCandidate.id,
              payload: { claimCandidate },
            },
            options.dryRun
          );
          if (queued) stats.queuedAmbiguous++;
          continue;
        }

        if (!options.dryRun) {
          await tx.claim.create({
            data: {
              incidentId,
              sourceId: source.id,
              sourceCandidateClaimId: claimCandidate.id,
              claimText: claimCandidate.claimText,
              evidenceSnippet: claimCandidate.evidenceSnippet,
              confidence: claimCandidate.confidence,
              provenance: {
                source: "normalized_candidate_claims",
                candidateClaimId: claimCandidate.id,
                threadCandidateId: threadCandidate.id,
              },
            },
          });
        }
        stats.createdClaims++;
      }

      if (incidentConfidence < options.minIncidentConfidence || threadCandidate.needsReview) {
        const queued = await queueManualReview(
          tx,
          {
            dedupeKey: `incident-review:${threadCandidate.id}`,
            queueType: "INCIDENT_REVIEW",
            reason: "Incident candidate confidence or review flag requires manual review before publication decisions.",
            threadCandidateId: threadCandidate.id,
            payload: {
              incidentId,
              confidence: incidentConfidence,
              needsReview: threadCandidate.needsReview,
            },
          },
          options.dryRun
        );
        if (queued) stats.queuedAmbiguous++;
      }
    });

    console.log(`[materialize] Processed threadCandidate=${threadCandidate.id} rawSource=${threadCandidate.rawSource.externalId}`);
  }

  console.log(
    `[materialize] Completed. createdEntities=${stats.createdEntities}, mergedEntities=${stats.mergedEntities}, createdIncidents=${stats.createdIncidents}, linkedIncidentEntities=${stats.linkedIncidentEntities}, createdClaims=${stats.createdClaims}, createdWalletLinks=${stats.createdWalletLinks}, queuedAmbiguous=${stats.queuedAmbiguous}, dryRun=${options.dryRun}`
  );
}

main()
  .catch((error) => {
    console.error("[materialize] Fatal error", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
