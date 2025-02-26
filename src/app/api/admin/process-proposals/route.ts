import logger from '@/logging'
import { processProposals } from '@/tasks/ocv-vote-counting'
import { ApiResponse } from '@/lib/api-response'

export async function POST() {
	try {
		await processProposals()
	} catch (error) {
		logger.error('Error updating proposal:', error)
		return ApiResponse.error(error)
	}
}
