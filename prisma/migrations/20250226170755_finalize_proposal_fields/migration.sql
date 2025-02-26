/*
  Warnings:

  - You are about to drop the column `abstract` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `budgetRequest` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryRequirements` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `motivation` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `proposalName` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `rationale` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `securityAndPerformance` on the `Proposal` table. All the data in the column will be lost.
  - Made the column `budgetBreakdown` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `communityBenefits` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discordHandle` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `estimatedCompletionDate` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `implementationDetails` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `keyObjectives` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `keyPerformanceIndicators` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `milestones` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mitigationPlans` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `potentialRisks` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `problemImportance` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `problemStatement` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `proposalSummary` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `proposedSolution` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `relevantExperience` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `teamMembers` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalFundingRequired` on table `Proposal` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Proposal_proposalName_idx";

-- AlterTable
ALTER TABLE "Proposal" DROP COLUMN "abstract",
DROP COLUMN "budgetRequest",
DROP COLUMN "deliveryRequirements",
DROP COLUMN "motivation",
DROP COLUMN "proposalName",
DROP COLUMN "rationale",
DROP COLUMN "securityAndPerformance",
ALTER COLUMN "budgetBreakdown" SET NOT NULL,
ALTER COLUMN "communityBenefits" SET NOT NULL,
ALTER COLUMN "discordHandle" SET NOT NULL,
ALTER COLUMN "estimatedCompletionDate" SET NOT NULL,
ALTER COLUMN "implementationDetails" SET NOT NULL,
ALTER COLUMN "keyObjectives" SET NOT NULL,
ALTER COLUMN "keyPerformanceIndicators" SET NOT NULL,
ALTER COLUMN "milestones" SET NOT NULL,
ALTER COLUMN "mitigationPlans" SET NOT NULL,
ALTER COLUMN "potentialRisks" SET NOT NULL,
ALTER COLUMN "problemImportance" SET NOT NULL,
ALTER COLUMN "problemStatement" SET NOT NULL,
ALTER COLUMN "proposalSummary" SET NOT NULL,
ALTER COLUMN "proposedSolution" SET NOT NULL,
ALTER COLUMN "relevantExperience" SET NOT NULL,
ALTER COLUMN "teamMembers" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "totalFundingRequired" SET NOT NULL,
ALTER COLUMN "website" SET DATA TYPE VARCHAR(2048);
