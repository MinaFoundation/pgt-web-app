import type {
	FundingRoundStatus,
	Proposal as PrismaProposal,
	ProposalStatus,
} from '@prisma/client'

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

export interface ProposalWithUserAndFundingRound {
	id: number
	title: string
	summary: string
	status: keyof typeof ProposalStatus
	totalFundingRequired: number
	createdAt: string
	updatedAt: string
	user: {
		id: string
		linkId: string
		username: string
	}
	fundingRound: {
		name: string
		id: string
		status: keyof typeof FundingRoundStatus
		description: string
		startDate: Date
		endDate: Date
	} | null
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
