'use client'

import { useQuery } from '@tanstack/react-query'
import logger from '@/logging'
import { GetDeliberationProposalsOptions } from '@/schemas/deliberation'
import { DeliberationPhaseProposalsResponse } from '@/services'

export function useDeliberationPhase(
	fundingRoundId: string,
	options: GetDeliberationProposalsOptions = {},
) {
	let url = `/api/funding-rounds/${fundingRoundId}/deliberation-proposals`
	if (options) {
		const searchParams = new URLSearchParams()
		if (options.query) searchParams.set('query', options.query)
		if (options.filterBy) searchParams.set('filterBy', options.filterBy)
		if (options.sortBy) searchParams.set('sortBy', options.sortBy)
		if (options.sortOrder) searchParams.set('sortOrder', options.sortOrder)
		url += `?${searchParams.toString()}`
	}

	return useQuery<DeliberationPhaseProposalsResponse>({
		queryKey: [url],
		queryFn: async () => {
			const response = await fetch(url)
			if (!response.ok) {
				logger.error('Failed to fetch deliberation proposals', response)
				const errorMessage = 'Failed to fetch proposals'
				throw new Error(errorMessage)
			}
			return response.json()
		},
	})
}
