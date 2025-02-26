export interface Proposal {
	id: number
	title: string
	reviewerVoteCount: number
	status: string
	totalFundingRequired: number
	abstract: string
	author: {
		username: string
		authType: 'discord' | 'wallet'
		id: string
	}
	reviewerVotes: {
		approved: number
		rejected: number
		total: number
	}
	communityVotes: {
		positiveStakeWeight: string
		totalVotes: number
	}
}

export interface ProposalWithUniqueId extends Proposal {
	uniqueId: string
}
