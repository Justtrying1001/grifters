-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('ALLEGED', 'VERIFIED', 'CONTESTED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('EXTERNAL_REPORT', 'ONCHAIN_ANALYSIS', 'ARCHIVED_SCREENSHOT', 'VICTIM_TESTIMONY');

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "evidenceStatus" "EvidenceStatus" NOT NULL DEFAULT 'ALLEGED';

-- AlterTable
ALTER TABLE "people" ADD COLUMN     "evidenceStatus" "EvidenceStatus" NOT NULL DEFAULT 'ALLEGED';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "evidenceStatus" "EvidenceStatus" NOT NULL DEFAULT 'ALLEGED';

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "sourceType" "SourceType" NOT NULL DEFAULT 'EXTERNAL_REPORT';

-- CreateTable
CREATE TABLE "on_chain_evidence" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "explorerUrl" TEXT NOT NULL,
    "externallyConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "on_chain_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "on_chain_evidence_incidentId_txHash_key" ON "on_chain_evidence"("incidentId", "txHash");

-- AddForeignKey
ALTER TABLE "on_chain_evidence" ADD CONSTRAINT "on_chain_evidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
