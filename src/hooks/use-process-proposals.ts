import logger from '@/logging'
import { useMutation, UseMutationOptions } from '@tanstack/react-query'

// Allows admin to manually process proposals
export function useProcessProposals(
	options: Omit<UseMutationOptions<void>, 'mutationFn'>,
) {
	const url = `/api/admin/process-proposals`

	return useMutation({
		...options,
		mutationFn: async () => {
			const response = await fetch(url, {
				method: 'POST',
			})
			if (!response.ok) {
				logger.error('Failed to process proposals', response)
				throw new Error('Failed to process proposals')
			}
			return response.json()
		},
	})
}
