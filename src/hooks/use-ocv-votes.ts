import { useQuery } from '@tanstack/react-query'
import { ProposalStatus } from '@prisma/client'

export type OCVVote = {
	id: number
	proposalId: number
	voteData: {
		votes: Array<{
			hash: string
			memo: string
			nonce: number
			height: number
			status: string
			account: string
			timestamp: number
		}>
		elegible: boolean
		proposal_id: number
		vote_status: string
		total_stake_weight: string
		negative_stake_weight: string
		positive_stake_weight: string
		total_community_votes: number
		total_negative_community_votes: number
		total_positive_community_votes: number
	}
	createdAt: string
	updatedAt: string
	proposal: {
		title: string
		reviewerCount: number
		fundingRoundName: string
		status: ProposalStatus
	}
}

export type PaginatedOCVVotesResponse = {
	data: OCVVote[]
	pagination: {
		currentPage: number
		totalPages: number
		pageSize: number
		totalCount: number
	}
	sort: {
		field: string
		order: 'asc' | 'desc'
	}
}

export function useOCVVotes(currentPage: number) {
	const url = `/api/admin/ocv-votes?page=${currentPage}`

	return useQuery({
		queryKey: ['votes', currentPage],
		queryFn: async () => {
			const response = await fetch(url)
			if (!response.ok) {
				throw new Error('Failed to fetch votes')
			}
			return response.json()
		},
		select: (data: PaginatedOCVVotesResponse) => ({
			votes: data.data,
			totalPages: data.pagination.totalPages,
		}),
	})
}
