import logger from '@/logging'
import { CategorizedComments } from '@/types'
import { UndefinedInitialDataOptions, useQuery } from '@tanstack/react-query'

export function useProposalComments(
	proposalId: string,
	options: Omit<
		UndefinedInitialDataOptions<CategorizedComments>,
		'queryKey' | 'queryFn'
	> = {},
) {
	const url = `/api/proposals/${proposalId}/comments`

	return useQuery<CategorizedComments>({
		...options,
		queryKey: [url, proposalId],
		queryFn: async () => {
			const response = await fetch(url)
			if (!response.ok) {
				logger.error('Failed to fetch comments', response)
				throw new Error('Failed to fetch comments')
			}
			return await response.json()
		},
	})
}
