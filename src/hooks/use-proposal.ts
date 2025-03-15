import logger from '@/logging'
import { FullProposal } from '@/types/proposals'
import { UndefinedInitialDataOptions, useQuery } from '@tanstack/react-query'

export function useProposal(
	proposalId: string,
	options: Omit<
		UndefinedInitialDataOptions<FullProposal>,
		'queryKey' | 'queryFn'
	> = {},
) {
	const url = `/api/proposals/${proposalId}`

	return useQuery<FullProposal>({
		...options,
		queryKey: [url, proposalId],
		queryFn: async () => {
			const response = await fetch(url)
			if (!response.ok) {
				logger.error('Failed to fetch proposal', response)
				throw new Error('Failed to fetch proposal')
			}
			const data = await response.json()
			return data
		},
	})
}
