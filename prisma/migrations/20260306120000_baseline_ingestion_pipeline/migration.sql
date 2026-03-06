-- CreateEnum
CREATE TYPE "RiskLabel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('SCAM', 'RUG_PULL', 'PUMP_AND_DUMP', 'MISLEADING_PROMOTION', 'INSIDER_DUMP', 'EXIT_SCAM', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PERSON', 'PROJECT', 'INCIDENT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "CandidateEntityKind" AS ENUM ('PERSON', 'ALIAS', 'X_HANDLE', 'WALLET', 'ORGANIZATION', 'PROJECT');

-- CreateEnum
CREATE TYPE "ExtractionRunType" AS ENUM ('DETERMINISTIC', 'LLM_ENRICHED');

-- CreateEnum
CREATE TYPE "FinalEntityKind" AS ENUM ('PERSON', 'ORGANIZATION', 'PROJECT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ManualReviewStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "roles" TEXT[],
    "socials" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLabel" "RiskLabel" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chain" TEXT,
    "category" TEXT,
    "links" JSONB NOT NULL DEFAULT '{}',
    "contractAddresses" TEXT[],
    "description" TEXT,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLabel" "RiskLabel" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_projects" (
    "personId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "person_projects_pkey" PRIMARY KEY ("personId","projectId")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "summary" VARCHAR(250) NOT NULL,
    "narrative" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "submitterEmail" TEXT,
    "submitterIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_people" (
    "incidentId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "incident_people_pkey" PRIMARY KEY ("incidentId","personId")
);

-- CreateTable
CREATE TABLE "incident_projects" (
    "incidentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "incident_projects_pkey" PRIMARY KEY ("incidentId","projectId")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "archiveUrl" TEXT,
    "addedBy" TEXT,
    "incidentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ResponseStatus" NOT NULL DEFAULT 'PENDING',
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "submitterEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "incidentId" TEXT,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "submitterEmail" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_sources" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'X_THREAD',
    "sourceUrl" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalized_thread_candidates" (
    "id" TEXT NOT NULL,
    "rawSourceId" TEXT NOT NULL,
    "runType" "ExtractionRunType" NOT NULL DEFAULT 'DETERMINISTIC',
    "extractorVersion" TEXT NOT NULL,
    "deterministicResult" JSONB NOT NULL,
    "llmResult" JSONB,
    "mergedResult" JSONB NOT NULL,
    "incidentType" "IncidentType",
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "normalized_thread_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalized_candidate_entities" (
    "id" TEXT NOT NULL,
    "threadCandidateId" TEXT NOT NULL,
    "kind" "CandidateEntityKind" NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "evidenceSnippet" TEXT NOT NULL,
    "sourceMethod" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "normalized_candidate_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalized_candidate_wallets" (
    "id" TEXT NOT NULL,
    "threadCandidateId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chainHint" TEXT,
    "evidenceSnippet" TEXT NOT NULL,
    "sourceMethod" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "normalized_candidate_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalized_candidate_claims" (
    "id" TEXT NOT NULL,
    "threadCandidateId" TEXT NOT NULL,
    "claimText" TEXT NOT NULL,
    "evidenceSnippet" TEXT NOT NULL,
    "sourceMethod" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "normalized_candidate_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "kind" "FinalEntityKind" NOT NULL DEFAULT 'UNKNOWN',
    "canonicalName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "provenance" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_aliases" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "provenance" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_wallets" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "normalizedAddress" TEXT NOT NULL,
    "chainHint" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "provenance" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_entities" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "role" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceCandidateEntityId" TEXT NOT NULL,
    "provenance" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_sources" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "rawSourceId" TEXT NOT NULL,
    "threadCandidateId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceCandidateClaimId" TEXT NOT NULL,
    "claimText" TEXT NOT NULL,
    "evidenceSnippet" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "provenance" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_review_queue" (
    "id" TEXT NOT NULL,
    "status" "ManualReviewStatus" NOT NULL DEFAULT 'OPEN',
    "queueType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "threadCandidateId" TEXT,
    "candidateEntityId" TEXT,
    "candidateWalletId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_review_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "people_slug_key" ON "people"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_slug_key" ON "incidents"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_ip_action_windowEnd_key" ON "rate_limits"("ip", "action", "windowEnd");

-- CreateIndex
CREATE INDEX "raw_sources_sourceUrl_idx" ON "raw_sources"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "raw_sources_sourceType_externalId_key" ON "raw_sources"("sourceType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "normalized_thread_candidates_rawSourceId_key" ON "normalized_thread_candidates"("rawSourceId");

-- CreateIndex
CREATE INDEX "normalized_thread_candidates_incidentType_idx" ON "normalized_thread_candidates"("incidentType");

-- CreateIndex
CREATE INDEX "normalized_thread_candidates_needsReview_idx" ON "normalized_thread_candidates"("needsReview");

-- CreateIndex
CREATE INDEX "normalized_candidate_entities_threadCandidateId_kind_idx" ON "normalized_candidate_entities"("threadCandidateId", "kind");

-- CreateIndex
CREATE INDEX "normalized_candidate_entities_normalizedValue_idx" ON "normalized_candidate_entities"("normalizedValue");

-- CreateIndex
CREATE UNIQUE INDEX "normalized_candidate_entities_threadCandidateId_kind_normal_key" ON "normalized_candidate_entities"("threadCandidateId", "kind", "normalizedValue");

-- CreateIndex
CREATE INDEX "normalized_candidate_wallets_threadCandidateId_idx" ON "normalized_candidate_wallets"("threadCandidateId");

-- CreateIndex
CREATE INDEX "normalized_candidate_wallets_address_idx" ON "normalized_candidate_wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "normalized_candidate_wallets_threadCandidateId_address_key" ON "normalized_candidate_wallets"("threadCandidateId", "address");

-- CreateIndex
CREATE INDEX "normalized_candidate_claims_threadCandidateId_idx" ON "normalized_candidate_claims"("threadCandidateId");

-- CreateIndex
CREATE INDEX "entities_normalizedName_idx" ON "entities"("normalizedName");

-- CreateIndex
CREATE INDEX "entity_aliases_normalizedAlias_idx" ON "entity_aliases"("normalizedAlias");

-- CreateIndex
CREATE UNIQUE INDEX "entity_aliases_entityId_normalizedAlias_key" ON "entity_aliases"("entityId", "normalizedAlias");

-- CreateIndex
CREATE INDEX "entity_wallets_entityId_idx" ON "entity_wallets"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "entity_wallets_normalizedAddress_key" ON "entity_wallets"("normalizedAddress");

-- CreateIndex
CREATE INDEX "incident_entities_entityId_idx" ON "incident_entities"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_entities_incidentId_entityId_key" ON "incident_entities"("incidentId", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_entities_sourceCandidateEntityId_key" ON "incident_entities"("sourceCandidateEntityId");

-- CreateIndex
CREATE INDEX "incident_sources_rawSourceId_idx" ON "incident_sources"("rawSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_sources_incidentId_rawSourceId_key" ON "incident_sources"("incidentId", "rawSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_sources_threadCandidateId_key" ON "incident_sources"("threadCandidateId");

-- CreateIndex
CREATE INDEX "claims_sourceId_idx" ON "claims"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "claims_incidentId_sourceCandidateClaimId_key" ON "claims"("incidentId", "sourceCandidateClaimId");

-- CreateIndex
CREATE UNIQUE INDEX "manual_review_queue_dedupeKey_key" ON "manual_review_queue"("dedupeKey");

-- CreateIndex
CREATE INDEX "manual_review_queue_status_idx" ON "manual_review_queue"("status");

-- CreateIndex
CREATE INDEX "manual_review_queue_threadCandidateId_idx" ON "manual_review_queue"("threadCandidateId");

-- AddForeignKey
ALTER TABLE "person_projects" ADD CONSTRAINT "person_projects_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_projects" ADD CONSTRAINT "person_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_people" ADD CONSTRAINT "incident_people_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_people" ADD CONSTRAINT "incident_people_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_projects" ADD CONSTRAINT "incident_projects_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_projects" ADD CONSTRAINT "incident_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_thread_candidates" ADD CONSTRAINT "normalized_thread_candidates_rawSourceId_fkey" FOREIGN KEY ("rawSourceId") REFERENCES "raw_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_candidate_entities" ADD CONSTRAINT "normalized_candidate_entities_threadCandidateId_fkey" FOREIGN KEY ("threadCandidateId") REFERENCES "normalized_thread_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_candidate_wallets" ADD CONSTRAINT "normalized_candidate_wallets_threadCandidateId_fkey" FOREIGN KEY ("threadCandidateId") REFERENCES "normalized_thread_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_candidate_claims" ADD CONSTRAINT "normalized_candidate_claims_threadCandidateId_fkey" FOREIGN KEY ("threadCandidateId") REFERENCES "normalized_thread_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_aliases" ADD CONSTRAINT "entity_aliases_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_wallets" ADD CONSTRAINT "entity_wallets_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_entities" ADD CONSTRAINT "incident_entities_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_entities" ADD CONSTRAINT "incident_entities_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_sources" ADD CONSTRAINT "incident_sources_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_sources" ADD CONSTRAINT "incident_sources_rawSourceId_fkey" FOREIGN KEY ("rawSourceId") REFERENCES "raw_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_sources" ADD CONSTRAINT "incident_sources_threadCandidateId_fkey" FOREIGN KEY ("threadCandidateId") REFERENCES "normalized_thread_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "incident_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

