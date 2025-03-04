import logger from '@/logging'
import { useQuery } from '@tanstack/react-query'
import { GetRankedEligibleProposalsAPIResponse } from '@/services/RankedVotingService'

export function useEligibleProposals(fundingRoundId: string) {
	const url = `/api/voting/eligible-proposals?fundingRoundId=${fundingRoundId}`

	return useQuery<GetRankedEligibleProposalsAPIResponse>({
		queryKey: [url],
		queryFn: async () => {
			const response = await fetch(url)
			if (!response.ok) {
				logger.error('Failed to fetch eligible proposals', response)
				throw new Error('Failed to fetch eligible proposals')
			}
			return response.json()
		},
	})
}
