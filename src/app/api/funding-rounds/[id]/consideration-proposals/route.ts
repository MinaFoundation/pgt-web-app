import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import logger from '@/logging'
import { ConsiderationVotingService } from '@/services'
import { getConsiderationProposalsOptionsSchema } from '@/schemas/consideration'
import { ApiResponse } from '@/lib/api-response'
import { ConsiderationProposalsApiResponse } from '@/types'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const fundingRoundId = (await params).id

		// TODO: implement filters and sorting
		const { data: options, error } =
			getConsiderationProposalsOptionsSchema.safeParse({
				query: request.nextUrl.searchParams.get('query'),
				filterBy: request.nextUrl.searchParams.get('filterBy'),
				sortBy: request.nextUrl.searchParams.get('sortBy'),
				sortOrder: request.nextUrl.searchParams.get('sortOrder'),
			})

		if (error) {
			return ApiResponse.badRequest(error.message)
		}

		const user = await getOrCreateUserFromRequest(request)
		if (!user) {
			return ApiResponse.unauthorized('Unauthorized')
		}

		const considerationVotingService = new ConsiderationVotingService(prisma)

		const [prosalsCounts, proposalsWithVotes] = await Promise.all([
			considerationVotingService.getProposalsStatusCounts(fundingRoundId),
			considerationVotingService.getProposalsWithVotes(
				fundingRoundId,
				user,
				options,
			),
		])

		const response: ConsiderationProposalsApiResponse = {
			counts: prosalsCounts,
			proposals: proposalsWithVotes,
		}

		return ApiResponse.success(response)
	} catch (error) {
		logger.error('Failed to fetch consideration proposals:', error)
		return ApiResponse.error(error)
	}
}
