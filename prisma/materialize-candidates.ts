import "dotenv/config";
import {
  CandidateEntityKind,
  FinalEntityKind,
  IncidentStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

type CliOptions = {
  dryRun: boolean;
  limit?: number;
  threadCandidateId?: string;
  minConfidence: number;
};

type SummaryCounts = {
  createdEntities: number;
  mergedEntities: number;
  createdIncidents: number;
  createdClaims: number;
  createdWalletLinks: number;
  queuedForReview: number;
};

const prisma = new PrismaClient();

function parseCliOptions(argv: string[]): CliOptions {
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  const threadCandidateArg = argv.find((a) => a.startsWith("--thread-candidate-id="));
  const minConfidenceArg = argv.find((a) => a.startsWith("--min-confidence="));

  return {
    dryRun: argv.includes("--dry-run"),
    limit: limitArg ? Number(limitArg.split("=")[1]) : undefined,
    threadCandidateId: threadCandidateArg ? threadCandidateArg.split("=")[1] : undefined,
    minConfidence: minConfidenceArg ? Number(minConfidenceArg.split("=")[1]) : 0.75,
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function toEntityKind(kind: CandidateEntityKind): FinalEntityKind {
  if (kind === CandidateEntityKind.PERSON || kind === CandidateEntityKind.ALIAS || kind === CandidateEntityKind.X_HANDLE) {
    return FinalEntityKind.PERSON;
  }

  if (kind === CandidateEntityKind.ORGANIZATION) return FinalEntityKind.ORGANIZATION;
  if (kind === CandidateEntityKind.PROJECT) return FinalEntityKind.PROJECT;

  return FinalEntityKind.UNKNOWN;
}

function safeSlugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function queueManualReview(
  tx: Prisma.TransactionClient,
  counts: SummaryCounts,
  input: {
    queueType: string;
    reason: string;
    dedupeKey: string;
    threadCandidateId?: string;
    candidateEntityId?: string;
    candidateWalletId?: string;
    payload: Prisma.InputJsonValue;
  },
  dryRun: boolean
) {
  counts.queuedForReview += 1;
  console.log(`[materialize] REVIEW ${input.queueType} ${input.reason}`);

  if (dryRun) return;

  await tx.manualReviewQueue.upsert({
    where: { dedupeKey: input.dedupeKey },
    update: {
      reason: input.reason,
      payload: input.payload,
      status: "OPEN",
      threadCandidateId: input.threadCandidateId,
      candidateEntityId: input.candidateEntityId,
      candidateWalletId: input.candidateWalletId,
    },
    create: {
      queueType: input.queueType,
      reason: input.reason,
      dedupeKey: input.dedupeKey,
      threadCandidateId: input.threadCandidateId,
      candidateEntityId: input.candidateEntityId,
      candidateWalletId: input.candidateWalletId,
      payload: input.payload,
    },
  });
}

async function resolveEntity(
  tx: Prisma.TransactionClient,
  candidate: {
    id: string;
    threadCandidateId: string;
    kind: CandidateEntityKind;
    value: string;
    normalizedValue: string;
    evidenceSnippet: string;
    confidence: number;
    metadata: Prisma.JsonValue;
  },
  allEntitiesForThread: Array<{
    id: string;
    kind: CandidateEntityKind;
    normalizedValue: string;
    confidence: number;
    metadata: Prisma.JsonValue;
  }>,
  counts: SummaryCounts,
  dryRun: boolean,
  minConfidence: number
): Promise<string | null> {
  const normalized = normalize(candidate.normalizedValue || candidate.value);

  const linkedHandle =
    typeof candidate.metadata === "object" && candidate.metadata !== null && "linkedHandle" in candidate.metadata
      ? normalize(String((candidate.metadata as Record<string, unknown>).linkedHandle ?? ""))
      : null;

  if (candidate.kind === CandidateEntityKind.X_HANDLE && candidate.confidence >= minConfidence) {
    const existingByAlias = await tx.entityAlias.findFirst({
      where: { normalizedAlias: normalized },
      include: { entity: true },
    });

    if (existingByAlias) {
      counts.mergedEntities += 1;
      if (!dryRun) {
        await tx.entityAlias.upsert({
          where: { entityId_normalizedAlias: { entityId: existingByAlias.entityId, normalizedAlias: normalized } },
          update: { confidence: Math.max(existingByAlias.confidence, candidate.confidence) },
          create: {
            entityId: existingByAlias.entityId,
            alias: candidate.value,
            normalizedAlias: normalized,
            confidence: candidate.confidence,
            provenance: { sourceCandidateEntityId: candidate.id },
          },
        });
      }
      return existingByAlias.entityId;
    }

    counts.createdEntities += 1;
    if (dryRun) return `dryrun:${candidate.id}`;

    const created = await tx.grifterEntity.create({
      data: {
        kind: FinalEntityKind.PERSON,
        canonicalName: candidate.value,
        normalizedName: normalized,
        confidence: candidate.confidence,
        provenance: { sourceCandidateEntityId: candidate.id, resolution: "exact-handle" },
        aliases: {
          create: {
            alias: candidate.value,
            normalizedAlias: normalized,
            confidence: candidate.confidence,
            provenance: { sourceCandidateEntityId: candidate.id },
          },
        },
      },
    });
    return created.id;
  }

  if (candidate.kind === CandidateEntityKind.WALLET && candidate.confidence >= minConfidence) {
    const existingWallet = await tx.entityWallet.findUnique({ where: { normalizedAddress: normalized } });
    if (existingWallet) {
      counts.mergedEntities += 1;
      return existingWallet.entityId;
    }

    await queueManualReview(
      tx,
      counts,
      {
        queueType: "wallet-unresolved-ownership",
        reason: "Wallet candidate has no resolved owner entity in final tables.",
        dedupeKey: `wallet:${candidate.id}`,
        threadCandidateId: candidate.threadCandidateId,
        candidateEntityId: candidate.id,
        payload: {
          candidateValue: candidate.value,
          confidence: candidate.confidence,
          evidenceSnippet: candidate.evidenceSnippet,
        },
      },
      dryRun
    );
    return null;
  }

  const hasCorroboratingHandle = Boolean(
    linkedHandle &&
      allEntitiesForThread.find(
        (entity) =>
          entity.kind === CandidateEntityKind.X_HANDLE &&
          normalize(entity.normalizedValue) === linkedHandle &&
          entity.confidence >= minConfidence
      )
  );

  if ((candidate.kind === CandidateEntityKind.PERSON || candidate.kind === CandidateEntityKind.ALIAS) && hasCorroboratingHandle) {
    const existingByName = await tx.grifterEntity.findFirst({
      where: { normalizedName: normalized },
    });

    if (existingByName) {
      counts.mergedEntities += 1;
      if (!dryRun) {
        await tx.entityAlias.upsert({
          where: { entityId_normalizedAlias: { entityId: existingByName.id, normalizedAlias: normalized } },
          update: { confidence: Math.max(candidate.confidence, 0.8) },
          create: {
            entityId: existingByName.id,
            alias: candidate.value,
            normalizedAlias: normalized,
            confidence: Math.max(candidate.confidence, 0.8),
            provenance: {
              sourceCandidateEntityId: candidate.id,
              corroboratingHandle: linkedHandle,
            },
          },
        });
      }
      return existingByName.id;
    }

    counts.createdEntities += 1;
    if (dryRun) return `dryrun:${candidate.id}`;

    const created = await tx.grifterEntity.create({
      data: {
        kind: FinalEntityKind.PERSON,
        canonicalName: candidate.value,
        normalizedName: normalized,
        confidence: Math.max(candidate.confidence, 0.8),
        provenance: {
          sourceCandidateEntityId: candidate.id,
          resolution: "canonical-name-with-handle",
          corroboratingHandle: linkedHandle,
        },
        aliases: {
          create: {
            alias: candidate.value,
            normalizedAlias: normalized,
            confidence: Math.max(candidate.confidence, 0.8),
            provenance: {
              sourceCandidateEntityId: candidate.id,
              corroboratingHandle: linkedHandle,
            },
          },
        },
      },
    });
    return created.id;
  }

  if (candidate.kind === CandidateEntityKind.ORGANIZATION || candidate.kind === CandidateEntityKind.PROJECT) {
    if (candidate.confidence < minConfidence) {
      await queueManualReview(
        tx,
        counts,
        {
          queueType: "entity-ambiguous",
          reason: "Organization or project candidate confidence is below materialization threshold.",
          dedupeKey: `entity:low:${candidate.id}`,
          threadCandidateId: candidate.threadCandidateId,
          candidateEntityId: candidate.id,
          payload: {
            candidateValue: candidate.value,
            candidateKind: candidate.kind,
            confidence: candidate.confidence,
            evidenceSnippet: candidate.evidenceSnippet,
          },
        },
        dryRun
      );
      return null;
    }

    const existing = await tx.grifterEntity.findFirst({ where: { normalizedName: normalized } });
    if (existing) {
      counts.mergedEntities += 1;
      return existing.id;
    }

    counts.createdEntities += 1;
    if (dryRun) return `dryrun:${candidate.id}`;

    const created = await tx.grifterEntity.create({
      data: {
        kind: toEntityKind(candidate.kind),
        canonicalName: candidate.value,
        normalizedName: normalized,
        confidence: candidate.confidence,
        provenance: { sourceCandidateEntityId: candidate.id, resolution: "exact-name" },
      },
    });
    return created.id;
  }

  await queueManualReview(
    tx,
    counts,
    {
      queueType: "entity-ambiguous",
      reason: "Candidate did not meet conservative merge criteria.",
      dedupeKey: `entity:ambiguous:${candidate.id}`,
      threadCandidateId: candidate.threadCandidateId,
      candidateEntityId: candidate.id,
      payload: {
        candidateValue: candidate.value,
        candidateKind: candidate.kind,
        confidence: candidate.confidence,
        evidenceSnippet: candidate.evidenceSnippet,
      },
    },
    dryRun
  );

  return null;
}

function buildIncidentSummary(threadCandidate: {
  incidentType: string | null;
  confidence: number;
  claims: Array<{ claimText: string }>;
}): { summary: string; narrative: string } {
  const claim = threadCandidate.claims[0]?.claimText ?? "Structured candidate incident record.";
  const summary = claim.length > 247 ? `${claim.slice(0, 247)}...` : claim;
  const narrative = `Materialized from normalized candidate extraction. Type=${threadCandidate.incidentType ?? "OTHER"}, confidence=${threadCandidate.confidence.toFixed(2)}.`;
  return { summary, narrative };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const where: Prisma.NormalizedThreadCandidateWhereInput = options.threadCandidateId
    ? { id: options.threadCandidateId }
    : {};

  const candidates = await prisma.normalizedThreadCandidate.findMany({
    where,
    take: options.limit,
    orderBy: { createdAt: "asc" },
    include: {
      rawSource: true,
      entities: true,
      claims: true,
      wallets: true,
    },
  });

  console.log(
    `[materialize] Starting materialization for ${candidates.length} normalized thread candidates (dryRun=${options.dryRun}, minConfidence=${options.minConfidence}).`
  );

  const counts: SummaryCounts = {
    createdEntities: 0,
    mergedEntities: 0,
    createdIncidents: 0,
    createdClaims: 0,
    createdWalletLinks: 0,
    queuedForReview: 0,
  };

  for (const threadCandidate of candidates) {
    await prisma.$transaction(async (tx) => {
      const externalId = threadCandidate.rawSource.externalId;
      const incidentSlug = `candidate-${safeSlugPart(externalId)}`;
      const { summary, narrative } = buildIncidentSummary({
        incidentType: threadCandidate.incidentType,
        confidence: threadCandidate.confidence,
        claims: threadCandidate.claims,
      });

      const existingIncident = await tx.incident.findUnique({ where: { slug: incidentSlug } });

      let incidentId = existingIncident?.id;
      if (!existingIncident) {
        counts.createdIncidents += 1;
        console.log(`[materialize] CREATE incident slug=${incidentSlug}`);
        if (!options.dryRun) {
          const created = await tx.incident.create({
            data: {
              slug: incidentSlug,
              type: threadCandidate.incidentType ?? "OTHER",
              status: IncidentStatus.PENDING,
              date: threadCandidate.rawSource.importedAt,
              summary,
              narrative,
              submitterEmail: "pipeline:materialize",
              submitterIp: null,
            },
          });
          incidentId = created.id;
        } else {
          incidentId = `dryrun:incident:${threadCandidate.id}`;
        }
      } else {
        if (!options.dryRun) {
          await tx.incident.update({
            where: { id: existingIncident.id },
            data: {
              type: threadCandidate.incidentType ?? "OTHER",
              summary,
              narrative,
            },
          });
        }
      }

      if (!incidentId) return;

      const existingIncidentSource = await tx.incidentSource.findUnique({
        where: { threadCandidateId: threadCandidate.id },
      });

      let incidentSourceId = existingIncidentSource?.id;
      if (!existingIncidentSource) {
        if (!options.dryRun) {
          const createdSource = await tx.incidentSource.create({
            data: {
              incidentId,
              rawSourceId: threadCandidate.rawSourceId,
              threadCandidateId: threadCandidate.id,
              confidence: threadCandidate.confidence,
            },
          });
          incidentSourceId = createdSource.id;
        } else {
          incidentSourceId = `dryrun:source:${threadCandidate.id}`;
        }
      }

      for (const candidateEntity of threadCandidate.entities) {
        const resolvedEntityId = await resolveEntity(
          tx,
          {
            id: candidateEntity.id,
            threadCandidateId: candidateEntity.threadCandidateId,
            kind: candidateEntity.kind,
            value: candidateEntity.value,
            normalizedValue: candidateEntity.normalizedValue,
            evidenceSnippet: candidateEntity.evidenceSnippet,
            confidence: candidateEntity.confidence,
            metadata: candidateEntity.metadata,
          },
          threadCandidate.entities.map((entity) => ({
            id: entity.id,
            kind: entity.kind,
            normalizedValue: entity.normalizedValue,
            confidence: entity.confidence,
            metadata: entity.metadata,
          })),
          counts,
          options.dryRun,
          options.minConfidence
        );

        if (!resolvedEntityId) continue;

        if (!options.dryRun) {
          await tx.incidentEntity.upsert({
            where: {
              sourceCandidateEntityId: candidateEntity.id,
            },
            update: {
              entityId: resolvedEntityId,
              confidence: candidateEntity.confidence,
              role: candidateEntity.kind,
              provenance: {
                sourceCandidateEntityId: candidateEntity.id,
                sourceMethod: candidateEntity.sourceMethod,
              },
            },
            create: {
              incidentId,
              entityId: resolvedEntityId,
              confidence: candidateEntity.confidence,
              role: candidateEntity.kind,
              sourceCandidateEntityId: candidateEntity.id,
              provenance: {
                sourceCandidateEntityId: candidateEntity.id,
                sourceMethod: candidateEntity.sourceMethod,
              },
            },
          });
        }
      }

      for (const candidateWallet of threadCandidate.wallets) {
        const normalizedAddress = normalize(candidateWallet.address);
        const owner = await tx.entityWallet.findUnique({ where: { normalizedAddress } });

        if (!owner) {
          await queueManualReview(
            tx,
            counts,
            {
              queueType: "wallet-unresolved-ownership",
              reason: "Wallet candidate does not map to an existing high-confidence entity wallet.",
              dedupeKey: `wallet:candidate:${candidateWallet.id}`,
              threadCandidateId: threadCandidate.id,
              candidateWalletId: candidateWallet.id,
              payload: {
                address: candidateWallet.address,
                confidence: candidateWallet.confidence,
                evidenceSnippet: candidateWallet.evidenceSnippet,
              },
            },
            options.dryRun
          );
          continue;
        }

        if (candidateWallet.confidence < options.minConfidence) {
          await queueManualReview(
            tx,
            counts,
            {
              queueType: "wallet-low-confidence",
              reason: "Wallet ownership confidence is below materialization threshold.",
              dedupeKey: `wallet:low:${candidateWallet.id}`,
              threadCandidateId: threadCandidate.id,
              candidateWalletId: candidateWallet.id,
              payload: {
                address: candidateWallet.address,
                confidence: candidateWallet.confidence,
                evidenceSnippet: candidateWallet.evidenceSnippet,
              },
            },
            options.dryRun
          );
          continue;
        }

        counts.createdWalletLinks += 1;
      }

      for (const candidateClaim of threadCandidate.claims) {
        if (!incidentSourceId) continue;

        const claimPayload = {
          incidentId,
          sourceId: incidentSourceId,
          sourceCandidateClaimId: candidateClaim.id,
          claimText: candidateClaim.claimText,
          evidenceSnippet: candidateClaim.evidenceSnippet,
          confidence: candidateClaim.confidence,
          provenance: {
            sourceCandidateClaimId: candidateClaim.id,
            sourceMethod: candidateClaim.sourceMethod,
          },
        };

        const existingClaim = await tx.claim.findUnique({
          where: {
            incidentId_sourceCandidateClaimId: {
              incidentId,
              sourceCandidateClaimId: candidateClaim.id,
            },
          },
        });

        if (!existingClaim) {
          counts.createdClaims += 1;
          if (!options.dryRun) {
            await tx.claim.create({ data: claimPayload });
          }
        } else if (!options.dryRun) {
          await tx.claim.update({
            where: { id: existingClaim.id },
            data: claimPayload,
          });
        }
      }
    });
  }

  console.log(
    `[materialize] Completed. created_entities=${counts.createdEntities}, merged_entities=${counts.mergedEntities}, created_incidents=${counts.createdIncidents}, created_claims=${counts.createdClaims}, created_wallet_links=${counts.createdWalletLinks}, queued_for_review=${counts.queuedForReview}, dryRun=${options.dryRun}`
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
