import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import { DeliberationService } from '@/services/DeliberationService'
import { ApiResponse } from '@/lib/api-response'
import prisma from '@/lib/prisma'
import logger from '@/logging'
import type { DeliberationProposal } from '@/types/deliberation'
import { getDeliberationProposalsOptionsSchema } from '@/schemas/deliberation'

const deliberationService = new DeliberationService(prisma)

type ServiceResponse = {
	proposals: Array<DeliberationProposal>
	pendingCount: number
	totalCount: number
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: fundingRoundId } = await params

		const { data: { query, filterBy, sortBy, sortOrder } = {}, error } =
			getDeliberationProposalsOptionsSchema.safeParse({
				filterName: request.nextUrl.searchParams.get('filterName'),
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
		const { proposals } = (await deliberationService.getDeliberationProposals(
			fundingRoundId,
			user.id,
		)) as ServiceResponse

		const pendingCount = proposals.reduce(
			(count: number, p: DeliberationProposal) =>
				!p.userDeliberation ? count + 1 : count,
			0,
		)

		return ApiResponse.success({
			proposals,
			pendingCount,
			totalCount: proposals.length,
		})
	} catch (error) {
		logger.error('Error fetching deliberation proposals:', error)
		return ApiResponse.error(error)
	}
}
