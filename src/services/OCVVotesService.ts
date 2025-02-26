import { PrismaClient, Prisma } from '@prisma/client'
import { OCVVoteResponse } from './OCVApiService'
import { ProposalStatusMoveService } from './ProposalStatusMoveService'

interface OCVVoteWithDetails {
	id: number
	proposalId: number
	voteData: OCVVoteResponse
	createdAt: Date
	updatedAt: Date
	proposal: {
		title: string
		reviewerCount: number
		fundingRoundName: string
		status: string
	}
}

interface PaginatedOCVVotes {
	data: OCVVoteWithDetails[]
	pagination: {
		currentPage: number
		totalPages: number
		pageSize: number
		totalCount: number
	}
	sort: {
		field: string
		order: 'asc' | 'desc'
	}
}

export class OCVVotesService {
	private statusMoveService: ProposalStatusMoveService

	constructor(private prisma: PrismaClient) {
		this.statusMoveService = new ProposalStatusMoveService(prisma)
	}

	async getOCVVotes(
		page: number = 1,
		pageSize: number = 25,
		sortField: string = 'updatedAt',
		sortOrder: 'asc' | 'desc' = 'desc',
	): Promise<PaginatedOCVVotes> {
		const skip = (page - 1) * pageSize

		const [totalCount, votes] = await Promise.all([
			this.prisma.oCVConsiderationVote.count(),
			this.prisma.oCVConsiderationVote.findMany({
				skip,
				take: pageSize,
				orderBy: {
					[sortField]: sortOrder,
				},
				include: {
					proposal: {
						select: {
							title: true,
							fundingRound: {
								select: {
									name: true,
								},
							},
							status: true,
						},
					},
				},
			}),
		])

		const totalPages = Math.ceil(totalCount / pageSize)

		// Transform the data to include reviewer count
		const transformedVotes = votes.map(vote => ({
			...vote,
			voteData: vote.voteData as unknown as OCVVoteResponse,
			proposal: {
				title: vote.proposal.title,
				reviewerCount: this.statusMoveService.minReviewerApprovals,
				fundingRoundName: vote.proposal.fundingRound?.name ?? 'N/A',
				status: vote.proposal.status,
			},
		}))

		return {
			data: transformedVotes,
			pagination: {
				currentPage: page,
				totalPages,
				pageSize,
				totalCount,
			},
			sort: {
				field: sortField,
				order: sortOrder,
			},
		}
	}
}
