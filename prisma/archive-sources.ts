import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RATE_LIMIT_MS = 3000; // 1 request per 3 seconds

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAlreadyArchived(url: string): boolean {
  return url.includes("archive.ph") || url.includes("web.archive.org");
}

async function archiveUrl(url: string): Promise<string | null> {
  try {
    const formData = new URLSearchParams({ url });
    const res = await fetch("https://archive.ph/submit/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      redirect: "manual",
    });

    // archive.ph redirects to the archived page on success
    const location = res.headers.get("location");
    if (location && location.includes("archive.ph")) {
      return location;
    }

    // Try reading from response body for alternate patterns
    const text = await res.text();
    const match = text.match(/https:\/\/archive\.ph\/[A-Za-z0-9]+/);
    if (match) return match[0];

    return null;
  } catch {
    return null;
  }
}

async function main() {
  const sources = await prisma.source.findMany({
    where: { archiveUrl: null },
  });

  const toArchive = sources.filter((s) => !isAlreadyArchived(s.url));
  console.log(`Found ${toArchive.length} sources to archive (${sources.length - toArchive.length} already archived or skipped).`);

  let archived = 0;
  let failed = 0;

  for (const source of toArchive) {
    console.log(`Archiving: ${source.url}`);
    const archiveUrlResult = await archiveUrl(source.url);

    if (archiveUrlResult) {
      await prisma.source.update({
        where: { id: source.id },
        data: { archiveUrl: archiveUrlResult },
      });
      archived++;
      console.log(`  → ${archiveUrlResult}`);
    } else {
      failed++;
      console.log(`  → Failed`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\nArchiving complete:`);
  console.log(`  Archived: ${archived}`);
  console.log(`  Failed: ${failed}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
