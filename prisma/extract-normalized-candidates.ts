import "dotenv/config";
import { IncidentType, Prisma, PrismaClient } from "@prisma/client";

type CliOptions = {
  dryRun: boolean;
  limit?: number;
  sourceId?: string;
  enableLlm: boolean;
};

type ExtractedEntity = {
  kind: "PERSON" | "ALIAS" | "X_HANDLE" | "WALLET" | "ORGANIZATION" | "PROJECT";
  value: string;
  normalizedValue: string;
  evidenceSnippet: string;
  sourceMethod: "regex" | "heuristic" | "llm";
  confidence: number;
  metadata?: Record<string, unknown>;
};

type ExtractedWallet = {
  address: string;
  chainHint?: string;
  evidenceSnippet: string;
  sourceMethod: "regex" | "llm";
  confidence: number;
};

type ExtractedClaim = {
  claimText: string;
  evidenceSnippet: string;
  sourceMethod: "heuristic" | "llm";
  confidence: number;
  metadata?: Record<string, unknown>;
};

type ExtractionBundle = {
  incidentType: IncidentType;
  entities: ExtractedEntity[];
  wallets: ExtractedWallet[];
  claims: ExtractedClaim[];
  confidence: number;
  needsReview: boolean;
};

type LlmExtractionResult = {
  incidentType?: IncidentType;
  entities?: Array<{
    kind?: ExtractedEntity["kind"];
    value?: string;
    evidenceSnippet?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }>;
  wallets?: Array<{
    address?: string;
    chainHint?: string;
    evidenceSnippet?: string;
    confidence?: number;
  }>;
  claims?: Array<{
    claimText?: string;
    evidenceSnippet?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }>;
};

const prisma = new PrismaClient();

function parseCliOptions(argv: string[]): CliOptions {
  const dryRun = argv.includes("--dry-run");
  const enableLlm = argv.includes("--llm");

  const limitArg = argv.find((a) => a.startsWith("--limit="));
  const sourceArg = argv.find((a) => a.startsWith("--source-id="));

  return {
    dryRun,
    enableLlm,
    limit: limitArg ? Number(limitArg.split("=")[1]) : undefined,
    sourceId: sourceArg ? sourceArg.split("=")[1] : undefined,
  };
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function snippetAround(text: string, term: string, radius = 120): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx < 0) return normalizeSpaces(text.slice(0, Math.min(text.length, radius * 2)));

  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + term.length + radius);
  return normalizeSpaces(text.slice(start, end));
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

function inferIncidentType(text: string): IncidentType {
  const lower = text.toLowerCase();

  if (/rug pull|liquidity.*drain|deployer.*drain/.test(lower)) return IncidentType.RUG_PULL;
  if (/insider|privileged|internal dashboard|abusing.*access/.test(lower)) return IncidentType.INSIDER_DUMP;
  if (/pump and dump|pump\s*&\s*dump|coordinated purchases/.test(lower)) return IncidentType.PUMP_AND_DUMP;
  if (/exit scam/.test(lower)) return IncidentType.EXIT_SCAM;
  if (/scam|stolen funds|hacked|exploit|laundered/.test(lower)) return IncidentType.SCAM;

  return IncidentType.OTHER;
}

function deterministicExtract(rawText: string): ExtractionBundle {
  const entities: ExtractedEntity[] = [];
  const wallets: ExtractedWallet[] = [];
  const claims: ExtractedClaim[] = [];

  const handleRegex = /(^|[^\w])@([A-Za-z0-9_]{1,15})\b/g;
  const walletRegexEvm = /\b0x[a-fA-F0-9]{40}\b/g;
  const walletRegexSol = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
  const handleNameRegex = /@([A-Za-z0-9_]{1,15})\s*\(([^\n\)]+)\)/g;
  const orgRegex = /\b(?:at|from|for)\s+([A-Z][A-Za-z0-9&\-.]{1,40}(?:\s+[A-Z][A-Za-z0-9&\-.]{1,40}){0,3})/g;

  for (const match of rawText.matchAll(handleRegex)) {
    const handle = `@${match[2]}`;
    entities.push({
      kind: "X_HANDLE",
      value: handle,
      normalizedValue: handle.toLowerCase(),
      evidenceSnippet: snippetAround(rawText, handle),
      sourceMethod: "regex",
      confidence: 0.92,
    });
  }

  for (const match of rawText.matchAll(walletRegexEvm)) {
    const address = match[0];
    wallets.push({
      address,
      chainHint: "EVM",
      evidenceSnippet: snippetAround(rawText, address),
      sourceMethod: "regex",
      confidence: 0.95,
    });
    entities.push({
      kind: "WALLET",
      value: address,
      normalizedValue: address.toLowerCase(),
      evidenceSnippet: snippetAround(rawText, address),
      sourceMethod: "regex",
      confidence: 0.95,
      metadata: { chainHint: "EVM" },
    });
  }

  for (const match of rawText.matchAll(walletRegexSol)) {
    const address = match[0];
    if (address.startsWith("http") || address.includes("/")) continue;

    wallets.push({
      address,
      chainHint: "SOLANA_LIKE",
      evidenceSnippet: snippetAround(rawText, address),
      sourceMethod: "regex",
      confidence: 0.85,
    });
    entities.push({
      kind: "WALLET",
      value: address,
      normalizedValue: address,
      evidenceSnippet: snippetAround(rawText, address),
      sourceMethod: "regex",
      confidence: 0.85,
      metadata: { chainHint: "SOLANA_LIKE" },
    });
  }

  for (const match of rawText.matchAll(handleNameRegex)) {
    const handle = `@${match[1]}`;
    const name = normalizeSpaces(match[2]);
    entities.push({
      kind: "PERSON",
      value: name,
      normalizedValue: name.toLowerCase(),
      evidenceSnippet: snippetAround(rawText, `${handle} (${name})`),
      sourceMethod: "heuristic",
      confidence: 0.8,
      metadata: { linkedHandle: handle.toLowerCase() },
    });
    entities.push({
      kind: "ALIAS",
      value: name,
      normalizedValue: name.toLowerCase(),
      evidenceSnippet: snippetAround(rawText, `${handle} (${name})`),
      sourceMethod: "heuristic",
      confidence: 0.72,
      metadata: { linkedHandle: handle.toLowerCase() },
    });
  }

  for (const match of rawText.matchAll(orgRegex)) {
    const org = normalizeSpaces(match[1]);
    if (org.length < 3) continue;
    entities.push({
      kind: "ORGANIZATION",
      value: org,
      normalizedValue: org.toLowerCase(),
      evidenceSnippet: snippetAround(rawText, org),
      sourceMethod: "heuristic",
      confidence: 0.55,
    });
  }

  const lines = rawText
    .split(/\n+/)
    .map((line) => normalizeSpaces(line))
    .filter(Boolean);

  for (const line of lines) {
    if (/(alleges|allegedly|reported|claims?|states?|discusses?|investigate|investigation|retained|reached out)/i.test(line)) {
      claims.push({
        claimText: line,
        evidenceSnippet: line,
        sourceMethod: "heuristic",
        confidence: 0.65,
      });
    }
  }

  const dedupEntities = uniqueBy(entities, (e) => `${e.kind}:${e.normalizedValue}`);
  const dedupWallets = uniqueBy(wallets, (w) => w.address.toLowerCase());
  const dedupClaims = uniqueBy(claims, (c) => c.claimText.toLowerCase());

  const avgConfidence =
    [...dedupEntities.map((e) => e.confidence), ...dedupClaims.map((c) => c.confidence), ...dedupWallets.map((w) => w.confidence)]
      .reduce((acc, v, _, arr) => acc + v / (arr.length || 1), 0);

  return {
    incidentType: inferIncidentType(rawText),
    entities: dedupEntities,
    wallets: dedupWallets,
    claims: dedupClaims,
    confidence: Number(avgConfidence.toFixed(4)),
    needsReview: dedupEntities.some((e) => e.kind === "PERSON" && e.confidence < 0.85),
  };
}

function isValidLlmResult(value: unknown): value is LlmExtractionResult {
  return typeof value === "object" && value !== null;
}

async function runLlmExtraction(rawText: string): Promise<LlmExtractionResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.LLM_MODEL ?? "gpt-4.1-mini";
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      incidentType: { type: "string", enum: ["SCAM", "RUG_PULL", "PUMP_AND_DUMP", "MISLEADING_PROMOTION", "INSIDER_DUMP", "EXIT_SCAM", "OTHER"] },
      entities: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: { type: "string", enum: ["PERSON", "ALIAS", "X_HANDLE", "WALLET", "ORGANIZATION", "PROJECT"] },
            value: { type: "string" },
            evidenceSnippet: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            metadata: { type: "object", additionalProperties: true },
          },
          required: ["kind", "value", "evidenceSnippet", "confidence"],
        },
      },
      wallets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            address: { type: "string" },
            chainHint: { type: "string" },
            evidenceSnippet: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["address", "evidenceSnippet", "confidence"],
        },
      },
      claims: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            claimText: { type: "string" },
            evidenceSnippet: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            metadata: { type: "object", additionalProperties: true },
          },
          required: ["claimText", "evidenceSnippet", "confidence"],
        },
      },
    },
    required: ["incidentType", "entities", "wallets", "claims"],
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "grifter_candidate_extraction",
          strict: true,
          schema,
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Extract only facts explicitly present in the input. Never infer unstated identities, intent, or legal conclusions. Keep ambiguous identities unresolved.",
        },
        {
          role: "user",
          content: `Extract entities and claims from this source text:\n\n${rawText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM extraction failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  return isValidLlmResult(parsed) ? parsed : null;
}

function mergeExtraction(deterministic: ExtractionBundle, llm: LlmExtractionResult | null): ExtractionBundle {
  if (!llm) return deterministic;

  const llmEntities: ExtractedEntity[] = (llm.entities ?? [])
    .filter((e) => e.kind && e.value && e.evidenceSnippet)
    .map((e) => ({
      kind: e.kind as ExtractedEntity["kind"],
      value: normalizeSpaces(String(e.value)),
      normalizedValue: normalizeSpaces(String(e.value)).toLowerCase(),
      evidenceSnippet: normalizeSpaces(String(e.evidenceSnippet)),
      sourceMethod: "llm",
      confidence: typeof e.confidence === "number" ? e.confidence : 0.5,
      metadata: e.metadata,
    }));

  const llmWallets: ExtractedWallet[] = (llm.wallets ?? [])
    .filter((w) => w.address && w.evidenceSnippet)
    .map((w) => ({
      address: String(w.address),
      chainHint: w.chainHint ? String(w.chainHint) : undefined,
      evidenceSnippet: normalizeSpaces(String(w.evidenceSnippet)),
      sourceMethod: "llm",
      confidence: typeof w.confidence === "number" ? w.confidence : 0.5,
    }));

  const llmClaims: ExtractedClaim[] = (llm.claims ?? [])
    .filter((c) => c.claimText && c.evidenceSnippet)
    .map((c) => ({
      claimText: normalizeSpaces(String(c.claimText)),
      evidenceSnippet: normalizeSpaces(String(c.evidenceSnippet)),
      sourceMethod: "llm",
      confidence: typeof c.confidence === "number" ? c.confidence : 0.5,
      metadata: c.metadata,
    }));

  const mergedEntities = uniqueBy([...deterministic.entities, ...llmEntities], (e) => `${e.kind}:${e.normalizedValue}`);
  const mergedWallets = uniqueBy([...deterministic.wallets, ...llmWallets], (w) => w.address.toLowerCase());
  const mergedClaims = uniqueBy([...deterministic.claims, ...llmClaims], (c) => c.claimText.toLowerCase());

  const confidenceValues = [...mergedEntities.map((e) => e.confidence), ...mergedClaims.map((c) => c.confidence), ...mergedWallets.map((w) => w.confidence)];
  const mergedConfidence = confidenceValues.length > 0 ? confidenceValues.reduce((acc, v) => acc + v, 0) / confidenceValues.length : deterministic.confidence;

  return {
    incidentType: llm.incidentType ?? deterministic.incidentType,
    entities: mergedEntities,
    wallets: mergedWallets,
    claims: mergedClaims,
    confidence: Number(mergedConfidence.toFixed(4)),
    needsReview:
      deterministic.needsReview ||
      mergedEntities.some((e) => (e.kind === "PERSON" || e.kind === "ALIAS") && e.confidence < 0.85),
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  const where: Prisma.RawSourceWhereInput = options.sourceId ? { id: options.sourceId } : {};
  const rawSources = await prisma.rawSource.findMany({
    where,
    take: options.limit,
    orderBy: { importedAt: "asc" },
  });

  console.log(
    `[extract] Starting candidate extraction for ${rawSources.length} raw source records (dryRun=${options.dryRun}, llm=${options.enableLlm}).`
  );

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const rawSource of rawSources) {
    try {
      const deterministic = deterministicExtract(rawSource.rawText);
      const llm = options.enableLlm ? await runLlmExtraction(rawSource.rawText) : null;
      const merged = mergeExtraction(deterministic, llm);
      const runType = llm ? "LLM_ENRICHED" : "DETERMINISTIC";

      const existing = await prisma.normalizedThreadCandidate.findUnique({
        where: { rawSourceId: rawSource.id },
        include: { entities: true, claims: true, wallets: true },
      });

      const deterministicResult = deterministic as unknown as Prisma.InputJsonValue;
      const llmResult = llm ? (llm as Prisma.InputJsonValue) : Prisma.JsonNull;
      const mergedResult = merged as unknown as Prisma.InputJsonValue;

      if (!existing) {
        created++;
        console.log(`[extract] CREATE rawSource=${rawSource.externalId} entities=${merged.entities.length} claims=${merged.claims.length} wallets=${merged.wallets.length}`);

        if (!options.dryRun) {
          await prisma.normalizedThreadCandidate.create({
            data: {
              rawSourceId: rawSource.id,
              runType,
              extractorVersion: "step2-v1",
              deterministicResult,
              llmResult,
              mergedResult,
              incidentType: merged.incidentType,
              confidence: merged.confidence,
              needsReview: merged.needsReview,
              entities: {
                create: merged.entities.map((entity) => ({
                  kind: entity.kind,
                  value: entity.value,
                  normalizedValue: entity.normalizedValue,
                  evidenceSnippet: entity.evidenceSnippet,
                  sourceMethod: entity.sourceMethod,
                  confidence: entity.confidence,
                  metadata: (entity.metadata ?? {}) as Prisma.InputJsonValue,
                })),
              },
              claims: {
                create: merged.claims.map((claim) => ({
                  claimText: claim.claimText,
                  evidenceSnippet: claim.evidenceSnippet,
                  sourceMethod: claim.sourceMethod,
                  confidence: claim.confidence,
                  metadata: (claim.metadata ?? {}) as Prisma.InputJsonValue,
                })),
              },
              wallets: {
                create: merged.wallets.map((wallet) => ({
                  address: wallet.address,
                  chainHint: wallet.chainHint,
                  evidenceSnippet: wallet.evidenceSnippet,
                  sourceMethod: wallet.sourceMethod,
                  confidence: wallet.confidence,
                })),
              },
            },
          });
        }
      } else {
        const isUnchanged =
          JSON.stringify(existing.deterministicResult) === JSON.stringify(deterministicResult) &&
          JSON.stringify(existing.llmResult) === JSON.stringify(llmResult) &&
          JSON.stringify(existing.mergedResult) === JSON.stringify(mergedResult) &&
          existing.incidentType === merged.incidentType &&
          existing.confidence === merged.confidence &&
          existing.needsReview === merged.needsReview;

        if (isUnchanged) {
          unchanged++;
          continue;
        }

        updated++;
        console.log(`[extract] UPDATE rawSource=${rawSource.externalId} entities=${merged.entities.length} claims=${merged.claims.length} wallets=${merged.wallets.length}`);

        if (!options.dryRun) {
          await prisma.$transaction(async (tx) => {
            await tx.normalizedCandidateEntity.deleteMany({ where: { threadCandidateId: existing.id } });
            await tx.normalizedCandidateClaim.deleteMany({ where: { threadCandidateId: existing.id } });
            await tx.normalizedCandidateWallet.deleteMany({ where: { threadCandidateId: existing.id } });

            await tx.normalizedThreadCandidate.update({
              where: { id: existing.id },
              data: {
                runType,
                extractorVersion: "step2-v1",
                deterministicResult,
                llmResult,
                mergedResult,
                incidentType: merged.incidentType,
                confidence: merged.confidence,
                needsReview: merged.needsReview,
                entities: {
                  create: merged.entities.map((entity) => ({
                    kind: entity.kind,
                    value: entity.value,
                    normalizedValue: entity.normalizedValue,
                    evidenceSnippet: entity.evidenceSnippet,
                    sourceMethod: entity.sourceMethod,
                    confidence: entity.confidence,
                    metadata: (entity.metadata ?? {}) as Prisma.InputJsonValue,
                  })),
                },
                claims: {
                  create: merged.claims.map((claim) => ({
                    claimText: claim.claimText,
                    evidenceSnippet: claim.evidenceSnippet,
                    sourceMethod: claim.sourceMethod,
                    confidence: claim.confidence,
                    metadata: (claim.metadata ?? {}) as Prisma.InputJsonValue,
                  })),
                },
                wallets: {
                  create: merged.wallets.map((wallet) => ({
                    address: wallet.address,
                    chainHint: wallet.chainHint,
                    evidenceSnippet: wallet.evidenceSnippet,
                    sourceMethod: wallet.sourceMethod,
                    confidence: wallet.confidence,
                  })),
                },
              },
            });
          });
        }
      }
    } catch (error) {
      failed++;
      console.error(`[extract] FAIL rawSource=${rawSource.externalId}`, error);
    }
  }

  console.log(
    `[extract] Completed. created=${created}, updated=${updated}, unchanged=${unchanged}, failed=${failed}, dryRun=${options.dryRun}, llm=${options.enableLlm}`
  );
}

main()
  .catch((error) => {
    console.error("[extract] Fatal error", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
