import logger from '@/logging'
import { GetPublicFundingRoundOptions } from '@/services'
import { FundingRoundWithPhases } from '@/types/funding-round'
import { useQuery } from '@tanstack/react-query'

export function useFundingRounds({
	filterName,
	sortBy,
	sortOrder,
}: GetPublicFundingRoundOptions) {
	const searchParams = new URLSearchParams()

	if (filterName) searchParams.set('filterName', filterName)
	if (sortBy) searchParams.set('sortBy', sortBy)
	if (sortOrder) searchParams.set('sortOrder', sortOrder)

	const url = `/api/funding-rounds?${searchParams.toString()}`

	return useQuery<FundingRoundWithPhases[]>({
		queryKey: [url],
		queryFn: async () => {
			const response = await fetch(url)
			if (!response.ok) {
				logger.error('Failed to fetch funding rounds', response)
				throw new Error('Failed to fetch funding rounds')
			}
			return response.json()
		},
	})
}
