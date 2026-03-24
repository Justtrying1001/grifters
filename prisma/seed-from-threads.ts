import * as fs from "fs";
import * as path from "path";
import { PrismaClient, IncidentType, EvidenceStatus } from "@prisma/client";
import { recomputePersonScore, recomputeProjectScore } from "../src/lib/recompute-scores";

const prisma = new PrismaClient();

interface Thread {
  threadId: string;
  sourceUrl: string;
  threadReaderUrl?: string;
  date?: string;
  tweetCount?: number;
  totalTweetsOnPage?: number;
  description?: string;
  fullText: string;
  urls?: string[];
}

function snowflakeToDate(id: string): Date {
  try {
    const timestamp = Number((BigInt(id) >> BigInt(22)) + BigInt(1288834974657));
    return new Date(timestamp);
  } catch {
    return new Date();
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferIncidentType(text: string): IncidentType {
  const lower = text.toLowerCase();
  if (lower.includes("rug pull") || lower.includes("rug-pull")) return "RUG_PULL";
  if (lower.includes("exit scam") || lower.includes("exit-scam")) return "EXIT_SCAM";
  if (lower.includes("pump and dump") || lower.includes("pump & dump") || lower.includes("pump-and-dump")) return "PUMP_AND_DUMP";
  if (lower.includes("insider") || lower.includes("insider dump") || lower.includes("insider trade") || lower.includes("insider trading")) return "INSIDER_DUMP";
  if (lower.includes("scam") || lower.includes("fraud")) return "SCAM";
  return "OTHER";
}

function extractTxHashes(text: string): string[] {
  const regex = /0x[a-fA-F0-9]{64}/g;
  const matches = text.match(regex) ?? [];
  return [...new Set(matches)];
}

function extractWalletAddresses(text: string): string[] {
  const regex = /0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/g;
  const matches = text.match(regex) ?? [];
  return [...new Set(matches)];
}

function extractMentions(text: string): string[] {
  const regex = /@([A-Za-z0-9_]+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const handle = match[1];
    // Skip known non-person handles
    if (handle.toLowerCase() !== "zachxbt") {
      mentions.push(handle);
    }
  }
  return [...new Set(mentions)];
}

async function main() {
  const threadsPath = path.join(__dirname, "../threads_raw.json");
  const threads: Thread[] = JSON.parse(fs.readFileSync(threadsPath, "utf-8"));

  let incidentsCreated = 0;
  let peopleCreated = 0;
  let onChainCreated = 0;

  for (const thread of threads) {
    const { threadId, sourceUrl, fullText } = thread;

    if (!fullText || fullText.trim().length < 20) continue;

    // Determine date
    let incidentDate: Date;
    if (thread.date && thread.date.trim()) {
      const parsed = new Date(thread.date);
      incidentDate = isNaN(parsed.getTime()) ? snowflakeToDate(threadId) : parsed;
    } else {
      incidentDate = snowflakeToDate(threadId);
    }

    // Infer incident type
    const incidentType = inferIncidentType(fullText);

    // Extract on-chain data
    const txHashes = extractTxHashes(fullText);
    const walletAddresses = extractWalletAddresses(fullText);

    // Determine evidence status
    const evidenceStatus: EvidenceStatus = txHashes.length > 0 ? "VERIFIED" : "ALLEGED";

    // Build summary from description or first 240 chars of fullText
    const rawSummary = thread.description
      ? thread.description.replace(/^@zachxbt:\s*/i, "").replace(/\.\.\.…$/, "")
      : fullText.slice(0, 240);
    const summary = rawSummary.slice(0, 250);

    // Build narrative – append wallet addresses if found
    let narrative = fullText.slice(0, 10000);
    if (walletAddresses.length > 0) {
      narrative += `\n\n**Wallet addresses mentioned:** ${walletAddresses.join(", ")}`;
    }

    // Generate unique slug
    const dateStr = incidentDate.toISOString().slice(0, 7);
    const baseSlug = `${slugify(summary.slice(0, 40))}-${dateStr}`;

    // Upsert incident
    let incident = await prisma.incident.findFirst({
      where: {
        OR: [
          { slug: baseSlug },
          { sources: { some: { url: sourceUrl } } },
        ],
      },
    });

    const narrativeWithWallets = narrative;

    if (!incident) {
      // Find a unique slug
      let slug = baseSlug;
      let attempt = 0;
      while (await prisma.incident.findUnique({ where: { slug } })) {
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      incident = await prisma.incident.create({
        data: {
          slug,
          type: incidentType,
          date: incidentDate,
          summary,
          narrative: narrativeWithWallets,
          status: "APPROVED",
          evidenceStatus,
          sources: {
            create: [
              {
                url: sourceUrl,
                title: "ZachXBT investigation",
                sourceType: "EXTERNAL_REPORT",
              },
            ],
          },
        },
      });
      incidentsCreated++;
    } else {
      // Update evidence status if it changed
      await prisma.incident.update({
        where: { id: incident.id },
        data: { evidenceStatus, status: "APPROVED" },
      });
    }

    // Upsert on-chain evidence (tx hashes)
    const now = new Date();
    for (const txHash of txHashes) {
      const existing = await prisma.onChainEvidence.findUnique({
        where: { incidentId_txHash: { incidentId: incident.id, txHash } },
      });
      if (!existing) {
        await prisma.onChainEvidence.create({
          data: {
            incidentId: incident.id,
            txHash,
            chain: "ethereum",
            verifiedAt: now,
            explorerUrl: `https://etherscan.io/tx/${txHash}`,
          },
        });
        onChainCreated++;
      }
    }

    // Extract @mentions and upsert as Person records
    const mentions = extractMentions(fullText);
    const personIds: string[] = [];

    for (const handle of mentions) {
      const personSlug = slugify(handle);
      if (!personSlug) continue;

      const person = await prisma.person.upsert({
        where: { slug: personSlug },
        update: {},
        create: {
          slug: personSlug,
          name: handle,
          aliases: [handle],
          roles: [],
          socials: { twitter: `https://x.com/${handle}` },
        },
      });

      personIds.push(person.id);
    }

    // Count newly created people (rough: check if they were just created)
    // We'll track by counting unique slugs across the batch
    for (const personId of personIds) {
      await prisma.incidentPerson.upsert({
        where: { incidentId_personId: { incidentId: incident.id, personId } },
        update: {},
        create: { incidentId: incident.id, personId },
      });
    }

    // Recompute scores for all linked people
    for (const personId of personIds) {
      await recomputePersonScore(personId);
    }
  }

  // Count people created (approximate – count all people in DB after seeding)
  peopleCreated = await prisma.person.count();

  console.log(`\nSeed complete:`);
  console.log(`  Incidents created:       ${incidentsCreated}`);
  console.log(`  People in DB:            ${peopleCreated}`);
  console.log(`  On-chain evidence added: ${onChainCreated}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
