import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import threadsRaw from "../threads_raw.json";

type RawThread = {
  threadId?: string;
  sourceUrl?: string;
  threadReaderUrl?: string;
  date?: string;
  description?: string;
  fullText?: string;
  urls?: string[];
  [key: string]: unknown;
};

type CliOptions = {
  dryRun: boolean;
};

const prisma = new PrismaClient();

function parseCliOptions(argv: string[]): CliOptions {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

function pickSourceUrl(thread: RawThread): string | null {
  const candidates = [thread.sourceUrl, thread.threadReaderUrl]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim());

  return candidates.length > 0 ? candidates[0] : null;
}

function buildRawText(thread: RawThread): string {
  const text = [thread.description, thread.fullText]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join("\n\n")
    .trim();

  return text.length > 0 ? text : "(empty thread text)";
}

function buildMetadata(thread: RawThread): Prisma.InputJsonObject {
  const urls = Array.isArray(thread.urls)
    ? [...new Set(thread.urls.filter((value): value is string => typeof value === "string" && value.trim().length > 0))]
    : [];

  return {
    date: typeof thread.date === "string" ? thread.date : null,
    threadReaderUrl: typeof thread.threadReaderUrl === "string" ? thread.threadReaderUrl : null,
    urlCount: urls.length,
    urls,
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const records = threadsRaw as RawThread[];

  console.log(
    `[raw-import] Starting import for ${records.length} records from threads_raw.json (dryRun=${options.dryRun}).`
  );

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const [index, thread] of records.entries()) {
    const externalId = typeof thread.threadId === "string" ? thread.threadId.trim() : "";

    if (!externalId) {
      skipped++;
      console.warn(`[raw-import] Skipping record #${index + 1}: missing threadId.`);
      continue;
    }

    const sourceUrl = pickSourceUrl(thread);
    if (!sourceUrl) {
      skipped++;
      console.warn(`[raw-import] Skipping thread ${externalId}: missing sourceUrl and threadReaderUrl.`);
      continue;
    }

    const rawText = buildRawText(thread);
    const metadata = buildMetadata(thread);

    const key = {
      sourceType_externalId: {
        sourceType: "X_THREAD",
        externalId,
      },
    };

    const existing = await prisma.rawSource.findUnique({ where: key });

    const payload = {
      sourceType: "X_THREAD",
      sourceUrl,
      externalId,
      rawText,
      rawJson: thread as Prisma.InputJsonValue,
      metadata,
    };

    if (!existing) {
      created++;
      console.log(`[raw-import] CREATE thread ${externalId} (${sourceUrl})`);
      if (!options.dryRun) {
        await prisma.rawSource.create({ data: payload });
      }
      continue;
    }

    const isUnchanged =
      existing.sourceUrl === payload.sourceUrl &&
      existing.rawText === payload.rawText &&
      JSON.stringify(existing.rawJson) === JSON.stringify(payload.rawJson) &&
      JSON.stringify(existing.metadata) === JSON.stringify(payload.metadata);

    if (isUnchanged) {
      unchanged++;
      continue;
    }

    updated++;
    console.log(`[raw-import] UPDATE thread ${externalId} (${sourceUrl})`);
    if (!options.dryRun) {
      await prisma.rawSource.update({ where: key, data: payload });
    }
  }

  console.log(
    `[raw-import] Completed. created=${created}, updated=${updated}, unchanged=${unchanged}, skipped=${skipped}, dryRun=${options.dryRun}`
  );
}

main()
  .catch((error) => {
    console.error("[raw-import] Fatal error", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
