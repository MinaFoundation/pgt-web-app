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
	abstract: string
	motivation: string
	rationale: string
	deliveryRequirements: string
	securityAndPerformance: string
	totalFundingRequired: Decimal
	createdAt: Date

	submitter: string

	status: 'pending' | 'approved' | 'rejected'
	userVote?: ConsiderationUserVote
	isReviewerEligible?: boolean
	voteStats: ConsiderationVoteStats
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
