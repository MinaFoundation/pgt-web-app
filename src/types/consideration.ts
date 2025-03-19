import { ConsiderationDecision, ProposalStatus } from '@prisma/client'
import { VoteStatus } from './phase-summary'
import { FullProposal } from './proposals'

export interface ConsiderationUserVote {
	decision: 'APPROVED' | 'REJECTED'
	feedback: string
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

export interface ReviewerVoteStats {
	approved: number
	rejected: number
	total: number
	isEligible: boolean
	requiredReviewerApprovals: number
}

export interface ConsiderationVoteStats {
	communityVote: CommunityVoteStats
	reviewerVote: ReviewerVoteStats
	isEligible: boolean
}

export interface UserVote {
	decision: ConsiderationDecision
	feedback: string
}

export interface ConsiderationProposal
	extends Omit<FullProposal, 'status' | 'fundingRound'> {
	status: 'PENDING' | 'APPROVED' | 'REJECTED'
	userVote: UserVote | null
	voteStats: ConsiderationVoteStats
	currentPhase: ProposalStatus
	isReviewerEligible: boolean
}
