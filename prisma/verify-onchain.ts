import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const RATE_LIMIT_MS = 200; // 5 requests/second

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyTxHash(txHash: string): Promise<boolean> {
  const url = `https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as { status: string; result?: { status: string } };
    return data.result?.status === "1";
  } catch {
    return false;
  }
}

async function main() {
  if (!ETHERSCAN_API_KEY) {
    console.warn("ETHERSCAN_API_KEY not set in environment — skipping on-chain verification.");
    await prisma.$disconnect();
    return;
  }

  const records = await prisma.onChainEvidence.findMany({
    where: { externallyConfirmed: false },
  });

  console.log(`Found ${records.length} unconfirmed on-chain evidence records.`);

  let confirmed = 0;
  let failed = 0;

  for (const record of records) {
    const success = await verifyTxHash(record.txHash);

    if (success) {
      await prisma.onChainEvidence.update({
        where: { id: record.id },
        data: { externallyConfirmed: true },
      });

      // Update parent incident evidenceStatus to VERIFIED
      await prisma.incident.update({
        where: { id: record.incidentId },
        data: { evidenceStatus: "VERIFIED" },
      });

      confirmed++;
    } else {
      failed++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\nVerification complete:`);
  console.log(`  Confirmed: ${confirmed}`);
  console.log(`  Not found / failed: ${failed}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
