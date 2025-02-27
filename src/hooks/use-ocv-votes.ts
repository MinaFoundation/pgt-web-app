import logger from '@/logging'
import { useQuery } from '@tanstack/react-query'
import type { OCVRankedVoteResponse } from '@/services'

export function useOCVVotes(fundingRoundId: string) {
	const url = `/api/voting/ocv-votes?roundId=${fundingRoundId}`

	return useQuery<OCVRankedVoteResponse>({
		queryKey: [url],
		queryFn: async () => {
			const response = await fetch(url)
			if (!response.ok) {
				logger.error('Failed to fetch OCV votes', response)
				throw new Error('Failed to fetch OCV votes')
			}
			return response.json()
		},
	})
}
