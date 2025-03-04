import logger from '@/logging'
import { cleanupStaleJobs, processProposals } from '@/tasks/ocv-vote-counting'
import { ApiResponse } from '@/lib/api-response'

export async function POST() {
	try {
		await cleanupStaleJobs()
		await processProposals()
		return ApiResponse.success({ success: true })
	} catch (error) {
		logger.error('Error updating proposal:', error)
		return ApiResponse.error(error)
	}
}
