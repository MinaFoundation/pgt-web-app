'use client'

import { UndefinedInitialDataOptions, useQuery } from '@tanstack/react-query'
import logger from '@/logging'
import { GetConsiderationProposalsOptions } from '@/schemas'
import {
	ConsiderationProposalsApiResponse,
	ConsiderationProposalsCounts,
} from '@/types'
import { useEffect, useState } from 'react'

export function useConsiderationPhase(
	fundingRoundId: string,
	{ query, filterBy, sortBy, sortOrder }: GetConsiderationProposalsOptions = {},
	options: Omit<
		UndefinedInitialDataOptions<ConsiderationProposalsApiResponse>,
		'queryKey' | 'queryFn'
	> = {},
) {
	const searchParams = new URLSearchParams()

	if (query) searchParams.set('query', query)
	if (filterBy) searchParams.set('filterBy', filterBy)
	if (sortBy) searchParams.set('sortBy', sortBy)
	if (sortOrder) searchParams.set('sortOrder', sortOrder)

	const url = `/api/funding-rounds/${fundingRoundId}/consideration-proposals${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`

	const { data, ...result } = useQuery<ConsiderationProposalsApiResponse>({
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

	// Cache the counts to prevent flickering when refetching
	const [cachedCounts, setCachedCounts] =
		useState<ConsiderationProposalsCounts | null>(null)
	useEffect(() => {
		if (data) {
			setCachedCounts(data.counts)
		}
	}, [data])

	return {
		...result,
		data: {
			proposals: data?.proposals,
			counts: cachedCounts ?? data?.counts,
		},
	}
}
