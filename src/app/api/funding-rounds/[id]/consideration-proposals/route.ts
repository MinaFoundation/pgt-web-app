import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import logger from '@/logging'
import { ConsiderationVotingService } from '@/services'
import { getConsiderationProposalsOptionsSchema } from '@/schemas/consideration'
import { ApiResponse } from '@/lib/api-response'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const fundingRoundId = (await params).id

		// TODO: implement filters and sorting
		const { data: { query, filterBy, sortBy, sortOrder } = {}, error } =
			getConsiderationProposalsOptionsSchema.safeParse({
				query: request.nextUrl.searchParams.get('query'),
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

		const proposalsWithVotes =
			await considerationVotingService.getProposalsWithVotes(
				fundingRoundId,
				user,
			)

		// Sort proposals:
		// 1. Consideration phase pending first
		// 2. Consideration phase voted
		// 3. Deliberation phase
		const sortedProposals = proposalsWithVotes.sort((a, b) => {
			if (
				a.currentPhase === 'CONSIDERATION' &&
				b.currentPhase === 'DELIBERATION'
			)
				return -1
			if (
				a.currentPhase === 'DELIBERATION' &&
				b.currentPhase === 'CONSIDERATION'
			)
				return 1
			if (a.currentPhase === b.currentPhase) {
				if (a.status === 'PENDING' && b.status !== 'PENDING') return -1
				if (a.status !== 'PENDING' && b.status === 'PENDING') return 1
			}
			return 0
		})

		return ApiResponse.success(sortedProposals)
	} catch (error) {
		logger.error('Failed to fetch consideration proposals:', error)
		return ApiResponse.error(error)
	}
}
