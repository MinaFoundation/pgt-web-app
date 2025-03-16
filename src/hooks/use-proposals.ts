'use client'

import logger from '@/logging'
import { GetProposalsOptionsSchema } from '@/schemas/proposals'
import { ProposalsWithCounts } from '@/types/proposals'
import { UndefinedInitialDataOptions, useQuery } from '@tanstack/react-query'

export function useProposals(
	{ query, filterBy, sortBy, sortOrder }: GetProposalsOptionsSchema = {},
	options: Omit<
		UndefinedInitialDataOptions<ProposalsWithCounts>,
		'queryKey' | 'queryFn'
	> = {},
) {
	const searchParams = new URLSearchParams()

	if (query) searchParams.set('query', query)
	if (filterBy) searchParams.set('filterBy', filterBy)
	if (sortBy) searchParams.set('sortBy', sortBy)
	if (sortOrder) searchParams.set('sortOrder', sortOrder)

	const url = `/api/proposals${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`

	return useQuery<ProposalsWithCounts>({
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
