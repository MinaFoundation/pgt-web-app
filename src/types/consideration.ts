import { ProposalStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

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
	id: number
	proposalName: string
	submitter: string
	abstract: string
	motivation: string
	rationale: string
	deliveryRequirements: string
	securityAndPerformance: string
	budgetRequest: Decimal
	status: 'pending' | 'approved' | 'rejected'
	userVote?: ConsiderationUserVote
	isReviewerEligible?: boolean
	voteStats: ConsiderationVoteStats
	createdAt: Date
	currentPhase: ProposalStatus
	email: string
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
}

export interface OCVVoteData {
	total_community_votes: number
	total_positive_community_votes: number
	positive_stake_weight: string
	elegible: boolean
	votes: OCVVote[]
}
