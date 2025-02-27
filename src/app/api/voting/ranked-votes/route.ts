import { NextRequest } from 'next/server'
import { OCVApiService } from '@/services/OCVApiService'
import { ApiResponse } from '@/lib/api-response'
import { AppError } from '@/lib/errors'
import { FundingRoundService } from '@/services'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams
		const roundId = searchParams.get('roundId')

		if (!roundId) {
			throw new AppError('Missing required parameters', 400)
		}

		const fundingRoundService = new FundingRoundService(prisma)

		const fundingRound = await fundingRoundService.getFundingRoundById(roundId)

		if (!fundingRound) {
			throw new AppError('Funding round not found', 404)
		}

		const ocvService = new OCVApiService()
		const voteData = await ocvService.getRankedVotes(
			fundingRound.mefId,
			new Date(fundingRound.phases.voting.startDate).getTime(),
			new Date(fundingRound.phases.voting.endDate).getTime(),
		)

		return ApiResponse.success(voteData)
	} catch (error) {
		if (error instanceof AppError) {
			return ApiResponse.error(error.message)
		}
		return ApiResponse.error('Failed to fetch ranked vote data')
	}
}
