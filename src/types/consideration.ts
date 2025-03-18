import { ProposalStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { VoteStatus } from './phase-summary'

export interface ConsiderationVoteStats {
	approved: number
	rejected: number
	total: number
	communityVotes: {
		total: number
		positive: number
		positiveStakeWeight: string
		isEligible: boolean
		voters: Array<{
			address: string
			timestamp: number
			hash: string
		}>
	}
	reviewerEligible: boolean
	requiredReviewerApprovals: number
}

export interface ConsiderationUserVote {
	decision: 'APPROVED' | 'REJECTED'
	feedback: string
}

export interface ConsiderationProposal {
	// Core Proposal Fields
	id: number
	title: string
	proposalSummary: string
	keyObjectives: string
	problemStatement: string
	problemImportance: string
	proposedSolution: string
	implementationDetails: string
	totalFundingRequired: Decimal
	communityBenefits: string
	keyPerformanceIndicators: string
	budgetBreakdown: string
	milestones: string
	estimatedCompletionDate: Date
	teamMembers: string
	relevantExperience: string
	potentialRisks: string
	mitigationPlans: string
	discordHandle: string
	email: string
	website?: string | null
	githubProfile?: string | null
	otherLinks?: string | null
	createdAt: Date

	submitter: string

	status: 'pending' | 'approved' | 'rejected'
	userVote?: ConsiderationUserVote
	isReviewerEligible?: boolean
	voteStats: ConsiderationVoteStats
	currentPhase: ProposalStatus
	submitterMetadata: {
		authSource: {
			type: string
			id: string
			username: string
		}
		linkedAccounts?: Array<{
			id: string
			authSource: {
				type: string
				id: string
				username: string
			}
		}>
	}
}

export interface OCVVote {
	account: string
	timestamp: number
	hash: string
	height: number
	status: VoteStatus
}

export interface OCVVoteData {
	total_community_votes: number
	total_positive_community_votes: number
	positive_stake_weight: string
	elegible: boolean
	votes: OCVVote[]
}

export interface CommunityVoteStats {
	total: number
	positive: number
	positiveStakeWeight: string
	isEligible: boolean
	voters: Array<{
		address: string
		timestamp: number
		hash: string
	}>
}

export interface VoteStats {
	approved: number
	rejected: number
	total: number
	communityVotes: CommunityVoteStats
	reviewerEligible: boolean
	requiredReviewerApprovals: number
}
