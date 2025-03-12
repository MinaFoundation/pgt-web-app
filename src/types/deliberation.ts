import type { ConsiderationProposal } from './consideration'

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
	extends Omit<ConsiderationProposal, 'status' | 'currentPhase' | 'voteStats'> {
	reviewerComments: DeliberationComment[]
	userDeliberation?: DeliberationVote
	hasVoted: boolean
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
	gptSurveySummary: GptSurveySummary | null
	isRecommended: boolean
	isNotRecommended: boolean
	isPendingRecommendation: boolean
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
