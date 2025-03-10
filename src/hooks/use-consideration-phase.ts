'use client'

import { UndefinedInitialDataOptions, useQuery } from '@tanstack/react-query'
import logger from '@/logging'
import { ConsiderationProposalResponseJson } from '@/app/api/funding-rounds/[id]/consideration-proposals/route'

export function useConsiderationPhase(
	fundingRoundId: string,
	options: Omit<
		UndefinedInitialDataOptions<ConsiderationProposalResponseJson[]>,
		'queryKey' | 'queryFn'
	> = {},
) {
	const url = `/api/funding-rounds/${fundingRoundId}/consideration-proposals`

	return useQuery<ConsiderationProposalResponseJson[]>({
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
