-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "budgetBreakdown" TEXT,
ADD COLUMN     "communityBenefits" TEXT,
ADD COLUMN     "discordHandle" VARCHAR(100),
ADD COLUMN     "estimatedCompletionDate" TIMESTAMPTZ(6),
ADD COLUMN     "githubProfile" VARCHAR(255),
ADD COLUMN     "implementationDetails" TEXT,
ADD COLUMN     "keyObjectives" TEXT,
ADD COLUMN     "keyPerformanceIndicators" TEXT,
ADD COLUMN     "milestones" TEXT,
ADD COLUMN     "mitigationPlans" TEXT,
ADD COLUMN     "otherLinks" VARCHAR(1000),
ADD COLUMN     "potentialRisks" TEXT,
ADD COLUMN     "problemImportance" TEXT,
ADD COLUMN     "problemStatement" TEXT,
ADD COLUMN     "proposalSummary" TEXT,
ADD COLUMN     "proposedSolution" TEXT,
ADD COLUMN     "relevantExperience" TEXT,
ADD COLUMN     "teamMembers" TEXT,
ADD COLUMN     "title" VARCHAR(100),
ADD COLUMN     "totalFundingRequired" DECIMAL(16,2),
ADD COLUMN     "website" VARCHAR(255),
ALTER COLUMN "proposalName" DROP NOT NULL,
ALTER COLUMN "abstract" DROP NOT NULL,
ALTER COLUMN "motivation" DROP NOT NULL,
ALTER COLUMN "rationale" DROP NOT NULL,
ALTER COLUMN "deliveryRequirements" DROP NOT NULL,
ALTER COLUMN "securityAndPerformance" DROP NOT NULL,
ALTER COLUMN "budgetRequest" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Proposal_title_idx" ON "Proposal"("title");
