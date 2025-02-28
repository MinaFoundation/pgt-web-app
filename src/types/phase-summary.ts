import { ProposalStatus as BaseProposalStatus } from '@prisma/client'
import { OCVVote } from './consideration'

export type ProposalStatus = BaseProposalStatus | 'NO_VOTES'

export interface PhaseTimeInfo {
	startDate: Date
	endDate: Date
}

export interface CommunityVoteStats {
	positive: number
	positiveStakeWeight: number
	voters: Array<OCVVote>
	isEligible: boolean
}

export interface ProposalVoteBase {
	id: number
	title: string
	proposer: string
	status: ProposalStatus
	totalFundingRequired: number
}

export interface ReviewerVoteStats {
	yesVotes: number
	noVotes: number
	total: number
	requiredReviewerApprovals: number
	reviewerEligible: boolean
}

export interface ConsiderationProposalVote extends ProposalVoteBase {
	reviewerVotes: ReviewerVoteStats
	communityVotes: CommunityVoteStats
}

export interface DeliberationProposalVote extends ProposalVoteBase {
	reviewerVotes: ReviewerVoteStats
}

export interface BudgetBreakdown {
	small: number
	medium: number
	large: number
}

export interface BasePhaseSummary {
	fundingRoundName: string
	phaseTimeInfo: PhaseTimeInfo
	totalProposals: number
	budgetBreakdown: BudgetBreakdown
}

export interface ConsiderationPhaseSummary extends BasePhaseSummary {
	proposalVotes: ConsiderationProposalVote[]
	movedForwardProposals: number
	notMovedForwardProposals: number
}

export interface DeliberationPhaseSummary extends BasePhaseSummary {
	proposalVotes: DeliberationProposalVote[]
	recommendedProposals: number
	notRecommendedProposals: number
}

export interface SubmissionProposalVote extends ProposalVoteBase {
	submissionDate: Date
}

export interface SubmissionPhaseSummary extends BasePhaseSummary {
	proposalVotes: SubmissionProposalVote[]
	submittedProposals: number
	draftProposals: number
}

export interface VotingProposalVote extends ProposalVoteBase {
	isFunded: boolean
	missingAmount?: number
	hasVotes?: boolean
	reviewerVotes?: ReviewerVoteStats
}

export interface VotingPhaseFundsDistributionSummary extends BasePhaseSummary {
	proposalVotes: VotingProposalVote[]
	fundedProposals: number
	notFundedProposals: number
	totalBudget: number
	remainingBudget: number
	votes: Vote[]
}

export type RankedVotingProposalVote = ProposalVoteBase & {
	hasVotes: boolean
}
export type VoteStatus = 'Pending' | 'Canonical' | 'Orphaned'

export interface Vote {
	account: string
	hash: string
	memo: string
	height: number
	status: VoteStatus
	timestamp: number
	nonce: number
}

export interface VotingPhaseRankedSummary {
	fundingRoundName: string
	phaseTimeInfo: PhaseTimeInfo
	totalProposals: number
	totalVotes: number
	budgetBreakdown: {
		small: number
		medium: number
		large: number
	}
	proposalVotes: RankedVotingProposalVote[]
	votes: Vote[]
}

export type PhaseStatus = 'not-started' | 'ongoing' | 'ended'

export interface PhaseStatusInfo {
	status: PhaseStatus
	text: string
	badge: 'default' | 'secondary'
	progressColor: string
}
