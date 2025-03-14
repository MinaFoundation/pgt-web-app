'use client'

import logger from '@/logging'
import { ProposalWithUserAndFundingRound } from '@/types/proposals'
import { UndefinedInitialDataOptions, useQuery } from '@tanstack/react-query'

export function useProposals(
	options: Omit<
		UndefinedInitialDataOptions<ProposalWithUserAndFundingRound[]>,
		'queryKey' | 'queryFn'
	> = {},
) {
	const url = '/api/proposals'

	return useQuery<ProposalWithUserAndFundingRound[]>({
		...options,
		queryKey: [url],
		queryFn: async () => {
			const response = await fetch(url)
			if (!response.ok) {
				logger.error('Failed to fetch consideration proposals', response)
				throw new Error('Failed to fetch proposals')
			}
			return response.json()
		},
	})
}
