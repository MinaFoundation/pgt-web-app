import logger from '@/logging'
import { useMutation } from '@tanstack/react-query'

// Allows admin to manually process proposals
export function useProcessProposals() {
	const url = `/api/admin/process-proposals`

	return useMutation({
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
