import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import { DeliberationService } from '@/services/DeliberationService'
import { ApiResponse } from '@/lib/api-response'
import prisma from '@/lib/prisma'
import logger from '@/logging'
import type { DeliberationProposal } from '@/types/deliberation'
import { getDeliberationProposalsOptionsSchema } from '@/schemas/deliberation'

const deliberationService = new DeliberationService(prisma)

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: fundingRoundId } = await params

		const { data: queryOptions = {}, error } =
			getDeliberationProposalsOptionsSchema.safeParse({
				query: request.nextUrl.searchParams.get('query'),
				filterBy: request.nextUrl.searchParams.get('filterBy'),
				sortBy: request.nextUrl.searchParams.get('sortBy'),
				sortOrder: request.nextUrl.searchParams.get('sortOrder'),
			})

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}

		const user = await getOrCreateUserFromRequest(request)
		if (!user) {
			return ApiResponse.unauthorized('Please log in to view proposals')
		}

		// Get proposals first
		const data = await deliberationService.getDeliberationProposals(
			fundingRoundId,
			user.id,
			queryOptions,
		)

		return ApiResponse.success(data)
	} catch (error) {
		logger.error('Error fetching deliberation proposals:', error)
		return ApiResponse.error(error)
	}
}
