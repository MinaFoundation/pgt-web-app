import { NextResponse } from 'next/server'
import { AdminService } from '@/services/AdminService'
import prisma from '@/lib/prisma'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import { validatePhaseDates } from '@/lib/validation'
import logger from '@/logging'
import {
	FundingRoundCreate,
	fundingRoundCreateSchema,
} from '@/schemas/funding-rounds'
import { ApiResponse } from '@/lib/api-response'

const adminService = new AdminService(prisma)

export async function GET(req: Request) {
	try {
		const user = await getOrCreateUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const isAdmin = await adminService.checkAdminStatus(user.id, user.linkId)
		if (!isAdmin) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}

		const rounds = await adminService.getFundingRounds()
		return NextResponse.json(rounds)
	} catch (error) {
		logger.error('Failed to fetch funding rounds:', error)
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
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const isAdmin = await adminService.checkAdminStatus(user.id, user.linkId)
		if (!isAdmin) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}

		const data: Omit<FundingRoundCreate, 'createdById'> = await req.json()

		// Convert string dates to Date objects for validation
		const fundingRoundDates = {
			from: new Date(data.fundingRoundDates.from),
			to: new Date(data.fundingRoundDates.to),
		}
		const submissionDates = {
			from: new Date(data.submissionDates.from),
			to: new Date(data.submissionDates.to),
		}
		const considerationDates = {
			from: new Date(data.considerationDates.from),
			to: new Date(data.considerationDates.to),
		}
		const deliberationDates = {
			from: new Date(data.deliberationDates.from),
			to: new Date(data.deliberationDates.to),
		}
		const votingDates = {
			from: new Date(data.votingDates.from),
			to: new Date(data.votingDates.to),
		}

		// Validate phase dates
		const datesValid = validatePhaseDates({
			fundingRound: fundingRoundDates,
			submission: submissionDates,
			consideration: considerationDates,
			deliberation: deliberationDates,
			voting: votingDates,
		})

		if (!datesValid.valid) {
			return NextResponse.json({ error: datesValid.error }, { status: 400 })
		}

		const input = {
			name: data.name,
			description: data.description,
			topicId: data.topicId,
			totalBudget: data.totalBudget,
			createdById: user.id,
			fundingRoundDates,
			submissionDates,
			considerationDates,
			deliberationDates,
			votingDates,
		}

		fundingRoundCreateSchema.parse(input)

		const round = await adminService.createFundingRound(input)
		return NextResponse.json(round)
	} catch (error) {
		logger.error('Failed to create funding round:', error)
		return ApiResponse.error(error)
	}
}
