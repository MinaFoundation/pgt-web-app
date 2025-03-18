import type { Proposal as PrismaProposal, ProposalStatus } from '@prisma/client'
import { FundingRoundWithPhases } from './funding-round'

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

export interface ProposalSummary {
	id: number
	title: string
	summary: string
	status: keyof typeof ProposalStatus
	totalFundingRequired: number
	createdAt: string
	updatedAt: string
}

export interface ProposalSummaryWithUserAndFundingRound
	extends ProposalSummary {
	user: {
		id: string
		linkId: string
		username: string
	}
	fundingRound: FundingRoundWithPhases | null
}

export interface FullProposal extends ProposalSummaryWithUserAndFundingRound {
	problemStatement: string
	problemImportance: string
	proposedSolution: string
	implementationDetails: string
	keyObjectives: string
	communityBenefits: string
	keyPerformanceIndicators: string
	budgetBreakdown: string
	estimatedCompletionDate: string
	milestones: string
	teamMembers: string
	relevantExperience: string
	potentialRisks: string
	mitigationPlans: string
	discordHandle: string
	email: string
	website: string | null
	githubProfile: string | null
	otherLinks: string | null
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

export interface ProposalCounts {
	all: number
	my: number
	others: number
}

export interface ProposalsWithCounts {
	proposals: ProposalSummaryWithUserAndFundingRound[]
	counts: ProposalCounts
}
