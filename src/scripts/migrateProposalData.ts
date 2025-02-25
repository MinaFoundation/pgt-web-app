import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateProposalData() {
	console.log('🔄 Starting proposal data migration...')

	// Get all proposals
	const proposals = await prisma.proposal.findMany()
	console.log(`Found ${proposals.length} proposals to migrate`)

	let successCount = 0
	let errorCount = 0

	// Process each proposal
	for (const proposal of proposals) {
		try {
			// Use raw SQL query to avoid type issues
			await prisma.$executeRaw`
				UPDATE "Proposal"
				SET 
					"title" = ${proposal.proposalName || ''},
					"proposalSummary" = ${proposal.abstract || ''},
					"problemStatement" = ${proposal.motivation || ''},
					"problemImportance" = ${proposal.rationale || ''},
					"proposedSolution" = ${proposal.deliveryRequirements || ''},
					"implementationDetails" = ${proposal.securityAndPerformance || ''},
					"totalFundingRequired" = ${proposal.budgetRequest},
					"keyObjectives" = 'To be updated',
					"communityBenefits" = 'To be updated',
					"keyPerformanceIndicators" = 'To be updated',
					"budgetBreakdown" = 'To be updated',
					"estimatedCompletionDate" = ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)},
					"milestones" = 'To be updated',
					"teamMembers" = 'To be updated',
					"relevantExperience" = 'To be updated',
					"potentialRisks" = 'To be updated',
					"mitigationPlans" = 'To be updated',
					"discordHandle" = 'To be updated',
					"website" = '',
					"githubProfile" = '',
					"otherLinks" = ''
				WHERE "id" = ${proposal.id}
			`

			successCount++
			console.log(`✅ Successfully migrated proposal #${proposal.id}`)
		} catch (error) {
			errorCount++
			console.error(`❌ Error migrating proposal #${proposal.id}:`, error)
		}
	}

	console.log(`
Migration complete!
✅ Successfully migrated: ${successCount}
❌ Failed to migrate: ${errorCount}
  `)
}

// Run the migration
migrateProposalData()
	.catch(e => {
		console.error('Error in migration script:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
