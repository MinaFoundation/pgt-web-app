import {
	FundingRound,
	FundingRoundPhase,
	FundingRoundPhases,
	FundingRoundStatus,
	FundingRoundWithPhases,
} from '@/types/funding-round'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'

export const getPublicFundingRoundsOptionsSchema = z.object({
	filterName: z.string().optional().nullable(),
	sortBy: z.enum(['totalBudget', 'startDate', 'status']).optional().nullable(),
	sortOrder: z.enum(['asc', 'desc']).optional().nullable(),
})

export type GetPublicFundingRoundOptions = z.infer<
	typeof getPublicFundingRoundsOptionsSchema
>

const DEFAULT_ORDER_BY: Prisma.FundingRoundOrderByWithRelationInput[] = [
	{ status: 'desc' },
	{ startDate: 'desc' },
	{ totalBudget: 'desc' },
]

export class FundingRoundService {
	private prisma: PrismaClient

	constructor(prisma: PrismaClient) {
		this.prisma = prisma
	}

	async getPublicFundingRounds(
		options: GetPublicFundingRoundOptions,
	): Promise<FundingRoundWithPhases[]> {
		const buildOrderBy = (
			userGetPublicFundingRoundOptions?: GetPublicFundingRoundOptions,
		): Prisma.FundingRoundOrderByWithRelationInput[] => {
			if (!userGetPublicFundingRoundOptions?.sortBy) {
				return DEFAULT_ORDER_BY
			}

			// If there is a user sort, put it first, then follow with the default array.
			const filteredDefault = DEFAULT_ORDER_BY.filter(orderItem => {
				const key = Object.keys(orderItem)[0]
				return key !== userGetPublicFundingRoundOptions.sortBy
			})

			return [
				{
					[userGetPublicFundingRoundOptions.sortBy]:
						userGetPublicFundingRoundOptions.sortOrder,
				},
				...filteredDefault,
			]
		}

		if (options) {
			getPublicFundingRoundsOptionsSchema.parse(options)
		}

		const rounds = await this.prisma.fundingRound.findMany({
			where: {
				status: {
					in: ['ACTIVE', 'COMPLETED'],
				},
				...(options.filterName
					? {
							name: {
								contains: options.filterName,
								mode: 'insensitive',
							},
						}
					: {}),
			},
			include: {
				_count: {
					select: { proposals: true },
				},
				submissionPhase: true,
				considerationPhase: true,
				deliberationPhase: true,
				votingPhase: true,
				topic: true,
			},
			orderBy: buildOrderBy(options.sortBy ? options : undefined),
		})

		return rounds.map(({ _count, ...round }) => {
			const phases = this.buildPhases(round)

			return {
				...round,
				totalBudget: round.totalBudget.toString(),
				proposalsCount: _count.proposals,
				status: FundingRoundService.fixFundingRoundStatus(
					round.status,
					round.startDate,
				),
				startDate: round.startDate.toDateString(),
				endDate: round.endDate.toDateString(),
				phase: FundingRoundService.getCurrentPhase(
					round.endDate.toDateString(),
					phases,
				),
				phases,
			}
		})
	}

	async getActiveFundingRounds() {
		const now = new Date()
		return await this.prisma.fundingRound.findMany({
			where: {
				startDate: { lte: now },
				endDate: { gte: now },
				status: 'ACTIVE',
			},
			include: {
				proposals: true,
				submissionPhase: true,
				considerationPhase: true,
				deliberationPhase: true,
				votingPhase: true,
			},
			orderBy: { startDate: 'asc' },
		})
	}

	async getFundingRoundById(
		id: string,
	): Promise<FundingRoundWithPhases | null> {
		const round = await this.prisma.fundingRound.findUnique({
			where: {
				id,
			},
			include: {
				_count: {
					select: { proposals: true },
				},
				submissionPhase: true,
				considerationPhase: true,
				deliberationPhase: true,
				votingPhase: true,
				topic: true,
			},
		})

		if (!round) {
			return null
		}

		const phases = this.buildPhases(round)

		return {
			...round,
			proposalsCount: round._count.proposals,
			totalBudget: round.totalBudget.toString(),
			status: FundingRoundService.fixFundingRoundStatus(
				round.status,
				round.startDate,
			),
			startDate: round.startDate.toDateString(),
			endDate: round.endDate.toDateString(),
			phase: FundingRoundService.getCurrentPhase(
				round.endDate.toDateString(),
				phases,
			),
			phases,
		}
	}

	async getLastPublicFundingRound(): Promise<FundingRound | null> {
		const now = new Date()
		// 1. Try to find a round that has started but not ended
		let round = await this.prisma.fundingRound.findFirst({
			where: {
				startDate: { lte: now },
				endDate: { gte: now },
				status: {
					in: ['ACTIVE'],
				},
			},
			include: {
				_count: { select: { proposals: true } },
				topic: true,
				submissionPhase: true,
				considerationPhase: true,
				deliberationPhase: true,
				votingPhase: true,
			},
			orderBy: { startDate: 'asc' },
		})

		// 2. If none found, try to find an upcoming round (not yet started)
		if (!round) {
			round = await this.prisma.fundingRound.findFirst({
				where: {
					startDate: { gt: now },
					status: { in: ['ACTIVE'] },
				},
				include: {
					_count: { select: { proposals: true } },
					topic: true,
					submissionPhase: true,
					considerationPhase: true,
					deliberationPhase: true,
					votingPhase: true,
				},
				orderBy: { startDate: 'asc' },
			})
		}

		// 3. If none found, fallback to ended rounds
		if (!round) {
			round = await this.prisma.fundingRound.findFirst({
				where: {
					endDate: { lt: now },
					status: { in: ['ACTIVE', 'COMPLETED'] },
				},
				include: {
					_count: { select: { proposals: true } },
					topic: true,
					submissionPhase: true,
					considerationPhase: true,
					deliberationPhase: true,
					votingPhase: true,
				},
				orderBy: { endDate: 'desc' },
			})
		}

		if (!round) {
			return null
		}

		return {
			id: round.id,
			name: round.name,
			description: round.description,
			status: FundingRoundService.fixFundingRoundStatus(
				round.status,
				round.startDate,
			),
			phase: FundingRoundService.getCurrentPhase(
				round.endDate.toDateString(),
				this.buildPhases(round),
			),
			startDate: round.startDate.toDateString(),
			endDate: round.endDate.toDateString(),
			totalBudget: round.totalBudget.toString(),
			proposalsCount: round._count.proposals,
			mefId: round.mefId,
		}
	}

	static fixFundingRoundStatus(
		status: string,
		startDate: Date | string,
	): FundingRoundStatus {
		if (status === 'ACTIVE') {
			if (new Date(startDate) > new Date()) {
				return 'UPCOMING'
			}
			return 'ACTIVE'
		}
		return status as FundingRoundStatus
	}

	private buildPhases(
		round: Record<
			| 'submissionPhase'
			| 'considerationPhase'
			| 'deliberationPhase'
			| 'votingPhase',
			{
				id: string
				startDate: Date
				endDate: Date
			} | null
		>,
	): FundingRoundPhases {
		if (
			!round.submissionPhase ||
			!round.considerationPhase ||
			!round.deliberationPhase ||
			!round.votingPhase
		) {
			throw new Error('Missing phase data')
		}

		return {
			submission: {
				id: round.submissionPhase.id,
				startDate: round.submissionPhase.startDate.toISOString(),
				endDate: round.submissionPhase.endDate.toISOString(),
			},
			consideration: {
				id: round.considerationPhase.id,
				startDate: round.considerationPhase.startDate.toISOString(),
				endDate: round.considerationPhase.endDate.toISOString(),
			},
			deliberation: {
				id: round.deliberationPhase.id,
				startDate: round.deliberationPhase.startDate.toISOString(),
				endDate: round.deliberationPhase.endDate.toISOString(),
			},
			voting: {
				id: round.votingPhase.id,
				startDate: round.votingPhase.startDate.toISOString(),
				endDate: round.votingPhase.endDate.toISOString(),
			},
		}
	}

	static getCurrentPhase(
		endDate: string,
		phases: FundingRoundPhases,
	): FundingRoundPhase {
		// TODO: Check if we can improve this one by relying on the database directly

		const now = new Date()

		if (now < new Date(phases.submission.startDate)) {
			return 'UPCOMING'
		}

		if (
			now >= new Date(phases.submission.startDate) &&
			now <= new Date(phases.submission.endDate)
		) {
			return 'SUBMISSION'
		}

		if (
			now >= new Date(phases.consideration.startDate) &&
			now <= new Date(phases.consideration.endDate)
		) {
			return 'CONSIDERATION'
		}

		if (
			now >= new Date(phases.deliberation.startDate) &&
			now <= new Date(phases.deliberation.endDate)
		) {
			return 'DELIBERATION'
		}

		if (
			now >= new Date(phases.voting.startDate) &&
			now <= new Date(phases.voting.endDate)
		) {
			return 'VOTING'
		}

		if (now >= new Date(endDate)) {
			return 'COMPLETED'
		}

		return 'BETWEEN_PHASES'
	}

	getTimeRemaining(date: Date): string {
		const now = new Date()
		const diff = date.getTime() - now.getTime()

		// Convert to positive number for calculations
		const absDiff = Math.abs(diff)

		const days = Math.floor(absDiff / (1000 * 60 * 60 * 24))
		const hours = Math.floor(
			(absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
		)
		const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))

		// If more than one day remaining
		if (days > 0) {
			return `${days}d ${hours}h`
		}

		// If less than one day remaining
		if (hours > 0) {
			return `${hours}h ${minutes}m`
		}

		// If less than one hour remaining
		return `${minutes}m`
	}

	getTimeRemainingWithEmoji(date: Date): { text: string; emoji: string } {
		const now = new Date()
		const diff = date.getTime() - now.getTime()

		// For time that has passed
		if (diff < 0) {
			return {
				text: 'Ended',
				emoji: '🏁',
			}
		}

		const days = Math.floor(diff / (1000 * 60 * 60 * 24))
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

		// More than 7 days
		if (days > 7) {
			return {
				text: `${days}d ${hours}h`,
				emoji: '📅',
			}
		}

		// 1-7 days
		if (days > 0) {
			return {
				text: `${days}d ${hours}h`,
				emoji: '⏳',
			}
		}

		// Less than 24 hours
		if (hours > 0) {
			return {
				text: `${hours}h ${minutes}m`,
				emoji: '⌛',
			}
		}

		// Less than 1 hour
		return {
			text: `${minutes}m`,
			emoji: '⚡',
		}
	}
}
