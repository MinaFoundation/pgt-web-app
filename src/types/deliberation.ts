import type { ConsiderationProposal } from './consideration'
import { FullProposal } from './proposals'

export interface DeliberationComment {
	id: string
	feedback: string
	recommendation?: boolean
	createdAt: Date
	reviewer?: {
		username: string
	}
	isReviewerComment: boolean
}

export interface DeliberationVote {
	feedback: string
	recommendation?: boolean
	createdAt: Date
	isReviewerVote: boolean
}

export interface GptSurveySummary {
	summary: string
	summaryUpdatedAt: Date
}

export interface DeliberationProposal
	extends Omit<FullProposal, 'status' | 'fundingRound'> {
	reviewerComments: DeliberationComment[]
	userDeliberation?: DeliberationVote
	hasVoted: boolean
	gptSurveySummary: GptSurveySummary | null
	isRecommended: boolean
	isNotRecommended: boolean
	isPendingRecommendation: boolean
	isReviewerEligible: boolean
}

export interface ProposalComment {
	id: string
	feedback: string
	createdAt: Date
	isReviewerComment: boolean
	recommendation?: boolean
	reviewer?: {
		username: string
	}
}

export interface CategorizedComments {
	reviewerConsideration: ProposalComment[]
	reviewerDeliberation: ProposalComment[]
	communityDeliberation: ProposalComment[]
	gptSurveySummary?: {
		summary: string
		summaryUpdatedAt: Date
	}
}
