import type { Proposal as PrismaProposal } from '@prisma/client'

export type ProposalField =
	| 'title'
	| 'proposalSummary'
	| 'keyObjectives'
	| 'problemStatement'
	| 'problemImportance'
	| 'proposedSolution'
	| 'implementationDetails'
	| 'communityBenefits'
	| 'keyPerformanceIndicators'
	| 'totalFundingRequired'
	| 'budgetBreakdown'
	| 'estimatedCompletionDate'
	| 'milestones'
	| 'teamMembers'
	| 'relevantExperience'
	| 'potentialRisks'
	| 'mitigationPlans'
	| 'discordHandle'
	| 'email'
	| 'website'
	| 'githubProfile'
	| 'otherLinks'

export interface ProposalWithUser extends PrismaProposal {
	user: {
		id: string
		linkId: string
		metadata: {
			username: string
			authSource: {
				type: string
				id: string
				username: string
			}
		}
	}
}

export interface ProposalWithAccess extends ProposalWithUser {
	canEdit: boolean
	canDelete: boolean
}

export interface CoreProposalData
	extends Pick<
		PrismaProposal,
		| 'id'
		| 'userId'
		| 'fundingRoundId'
		| 'status'
		| 'title'
		| 'proposalSummary'
		| 'problemStatement'
		| 'problemImportance'
		| 'proposedSolution'
		| 'implementationDetails'
		| 'totalFundingRequired'
		| 'keyObjectives'
		| 'communityBenefits'
		| 'keyPerformanceIndicators'
		| 'budgetBreakdown'
		| 'estimatedCompletionDate'
		| 'milestones'
		| 'teamMembers'
		| 'relevantExperience'
		| 'potentialRisks'
		| 'mitigationPlans'
		| 'discordHandle'
		| 'email'
		| 'website'
		| 'githubProfile'
		| 'otherLinks'
		| 'createdAt'
		| 'updatedAt'
	> {
	user: {
		id: string
		linkId: string
		metadata: {
			username: string
			authSource: {
				type: string
				id: string
				username: string
			}
		}
	}
}
