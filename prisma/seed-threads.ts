import "dotenv/config";
import { IncidentType, PrismaClient } from "@prisma/client";
import threadsRaw from "../threads_raw.json";

type RawThread = {
  threadId: string;
  sourceUrl?: string;
  threadReaderUrl?: string;
  date?: string;
  description?: string;
  fullText?: string;
  urls?: string[];
};

const prisma = new PrismaClient();

// X/Twitter snowflake epoch (same numeric epoch as Discord, but this is Twitter data).
const TWITTER_EPOCH_MS = BigInt("1288834974657");
const SNOWFLAKE_SHIFT_BITS = BigInt(22);

function timestampFromSnowflake(id: string): Date | null {
  if (!/^\d+$/.test(id)) return null;

  const snowflake = BigInt(id);
  const timestampMs = Number((snowflake >> SNOWFLAKE_SHIFT_BITS) + TWITTER_EPOCH_MS);
  const date = new Date(timestampMs);

  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeSummary(thread: RawThread): string {
  const raw = (thread.description || thread.fullText || "Untitled incident thread")
    .replace(/\s+/g, " ")
    .trim();

  if (raw.length <= 250) return raw;
  return `${raw.slice(0, 247)}...`;
}

function getNarrative(thread: RawThread, fallbackSummary: string): string {
  return (thread.fullText || thread.description || "").trim() || fallbackSummary;
}

function inferIncidentType(thread: RawThread): IncidentType {
  const text = `${thread.description || ""}\n${thread.fullText || ""}`.toLowerCase();

  if (/rug pull|liquidity.*drain|deployer.*drain/.test(text)) return IncidentType.RUG_PULL;
  if (/insider|internal tools|abusing.*access|privileged/.test(text)) return IncidentType.INSIDER_DUMP;
  if (/pump and dump|pump\s*&\s*dump|coordinated purchases/.test(text)) return IncidentType.PUMP_AND_DUMP;
  if (/exit scam/.test(text)) return IncidentType.EXIT_SCAM;
  if (/scam|stolen funds|hacked|exploit|laundered/.test(text)) return IncidentType.SCAM;

  return IncidentType.OTHER;
}

function getSourceUrls(thread: RawThread): string[] {
  const urls = [thread.sourceUrl, thread.threadReaderUrl, ...(thread.urls ?? [])].filter(
    (v): v is string => Boolean(v && v.trim())
  );

  return [...new Set(urls.map((u) => u.trim()))];
}

function getDate(thread: RawThread): Date {
  if (thread.date) {
    const parsed = new Date(thread.date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const fromSnowflake = timestampFromSnowflake(thread.threadId);
  if (fromSnowflake) return fromSnowflake;

  return new Date();
}

async function main() {
  const records = threadsRaw as RawThread[];
  console.log(`Seeding ${records.length} threads from threads_raw.json...`);

  let seeded = 0;
  let skipped = 0;

  for (const thread of records) {
    if (!thread.threadId) {
      skipped++;
      continue;
    }

    const sourceUrls = getSourceUrls(thread);
    if (sourceUrls.length === 0) {
      console.warn(`Skipping thread ${thread.threadId}: no usable source URL`);
      skipped++;
      continue;
    }

    const slug = `thread-${thread.threadId}`;
    const summary = normalizeSummary(thread);
    const narrative = getNarrative(thread, summary);
    const date = getDate(thread);
    const type = inferIncidentType(thread);

    const incident = await prisma.incident.upsert({
      where: { slug },
      update: {
        type,
        status: "APPROVED",
        date,
        summary,
        narrative,
      },
      create: {
        slug,
        type,
        status: "APPROVED",
        date,
        summary,
        narrative,
      },
    });

    for (const url of sourceUrls) {
      const existing = await prisma.source.findFirst({
        where: { incidentId: incident.id, url },
      });

      if (!existing) {
        await prisma.source.create({
          data: {
            incidentId: incident.id,
            url,
            title: url,
            archiveUrl:
              thread.threadReaderUrl && thread.threadReaderUrl !== url
                ? thread.threadReaderUrl
                : null,
            addedBy: "seed:threads",
          },
        });
      }
    }

    seeded++;
  }

  console.log(`Thread seed complete. Seeded: ${seeded}, skipped: ${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
