import { NextRequest, NextResponse } from 'next/server'
import { ProposalService } from '@/services/ProposalService'
import prisma from '@/lib/prisma'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import { ZodError } from 'zod'
import logger from '@/logging'
import { getProposalsOptionsSchema } from '@/schemas/proposals'

const proposalService = new ProposalService(prisma)

export async function GET(req: NextRequest) {
	try {
		const { data: options = {}, error } = getProposalsOptionsSchema.safeParse({
			query: req.nextUrl.searchParams.get('query'),
			filterBy: req.nextUrl.searchParams.get('filterBy'),
			sortBy: req.nextUrl.searchParams.get('sortBy'),
			sortOrder: req.nextUrl.searchParams.get('sortOrder'),
		})
		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}

		const user = await getOrCreateUserFromRequest(req)

		if (!user) {
			return NextResponse.json(
				{ error: 'Please log in to view proposals' },
				{ status: 401 },
			)
		}

		const proposals = await proposalService.getProposals(options, user)

		return NextResponse.json(proposals)
	} catch (error) {
		logger.error('Failed to fetch proposals:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		)
	}
}

export async function POST(req: Request) {
	try {
		const user = await getOrCreateUserFromRequest(req)
		if (!user) {
			return NextResponse.json(
				{ error: 'Please log in to create proposals' },
				{ status: 401 },
			)
		}

		const data = await req.json()
		const proposal = await proposalService.createDraft(user.id, data)

		return NextResponse.json(proposal)
	} catch (error) {
		logger.error('Failed to create proposal:', error)

		if (error instanceof ZodError) {
			return NextResponse.json(
				{
					error: 'Validation failed',
					details: error.errors,
				},
				{ status: 400 },
			)
		}

		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		)
	}
}
