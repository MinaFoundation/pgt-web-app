import { Prisma, PrismaClient, Proposal, ProposalStatus } from '@prisma/client'
import { Decimal } from 'decimal.js'
import { AppError } from '@/lib/errors'
import { ProposalErrors } from '@/constants/errors'
import type { ProposalComment } from '@/types/deliberation'
import { UserMetadata } from './UserService'
import {
	FullProposal,
	ProposalCounts,
	ProposalsWithCounts,
} from '@/types/proposals'
import { FundingRoundService } from './FundingRoundService'
import {
	CreateProposalInput,
	getProposalsOptionsSchema,
	GetProposalsOptionsSchema,
	proposalCreateSchema,
} from '@/schemas/proposals'

interface CategorizedComments {
	reviewerConsideration: ProposalComment[]
	reviewerDeliberation: ProposalComment[]
	communityDeliberation: ProposalComment[]
}

interface UserLinked {
	id: string
	linkId: string
}

export class ProposalsListService {
	private prisma: PrismaClient

	constructor(prisma: PrismaClient) {
		this.prisma = prisma
	}
}

const DEFAULT_ORDER_BY: Prisma.ProposalOrderByWithRelationInput[] = [
	{ status: 'asc' },
	{ createdAt: 'desc' },
	{ totalFundingRequired: 'desc' },
]

export class ProposalService {
	private prisma: PrismaClient

	constructor(prisma: PrismaClient) {
		this.prisma = prisma
	}

	async createDraft(
		userId: string,
		data: CreateProposalInput,
	): Promise<Proposal> {
		try {
			// Validate input
			const validatedData = proposalCreateSchema.parse(data)

			// Create proposal with new field names
			return await this.prisma.proposal.create({
				data: {
					userId,
					status: 'DRAFT',
					title: validatedData.title,
					proposalSummary: validatedData.proposalSummary,
					keyObjectives: validatedData.keyObjectives,
					problemStatement: validatedData.problemStatement,
					problemImportance: validatedData.problemImportance,
					proposedSolution: validatedData.proposedSolution,
					implementationDetails: validatedData.implementationDetails,
					communityBenefits: validatedData.communityBenefits,
					keyPerformanceIndicators: validatedData.keyPerformanceIndicators,
					totalFundingRequired: new Decimal(
						validatedData.totalFundingRequired.toString(),
					),
					budgetBreakdown: validatedData.budgetBreakdown,
					estimatedCompletionDate: validatedData.estimatedCompletionDate,
					milestones: validatedData.milestones,
					teamMembers: validatedData.teamMembers,
					relevantExperience: validatedData.relevantExperience,
					potentialRisks: validatedData.potentialRisks,
					mitigationPlans: validatedData.mitigationPlans,
					discordHandle: validatedData.discordHandle,
					email: validatedData.email,
					website: validatedData.website,
					githubProfile: validatedData.githubProfile,
					otherLinks: validatedData.otherLinks,
				},
			})
		} catch (error) {
			console.error('Error creating proposal:', error)
			throw error // Re-throw to handle in the API route
		}
	}

	async getProposalById(id: number): Promise<FullProposal | null> {
		const proposal = await this.prisma.proposal.findUnique({
			where: { id },
			include: {
				user: this.buildUserInclude(),
				fundingRound: this.buildFundingRoundInclude(),
			},
		})

		if (!proposal) return null

		return {
			id: proposal.id,
			title: proposal.title,
			summary: proposal.proposalSummary,
			status: proposal.status,
			totalFundingRequired: proposal.totalFundingRequired.toNumber(),
			createdAt: proposal.createdAt.toISOString(),
			updatedAt: proposal.updatedAt.toISOString(),

			problemStatement: proposal.problemStatement,
			problemImportance: proposal.problemImportance,
			proposedSolution: proposal.proposedSolution,
			implementationDetails: proposal.implementationDetails,
			keyObjectives: proposal.keyObjectives,
			communityBenefits: proposal.communityBenefits,
			keyPerformanceIndicators: proposal.keyPerformanceIndicators,
			budgetBreakdown: proposal.budgetBreakdown,
			estimatedCompletionDate: proposal.estimatedCompletionDate.toISOString(),
			milestones: proposal.milestones,
			teamMembers: proposal.teamMembers,
			relevantExperience: proposal.relevantExperience,
			potentialRisks: proposal.potentialRisks,
			mitigationPlans: proposal.mitigationPlans,
			discordHandle: proposal.discordHandle,
			email: proposal.email,
			website: proposal.website,
			githubProfile: proposal.githubProfile,
			otherLinks: proposal.otherLinks,

			user: {
				id: proposal.user.id,
				linkId: proposal.user.linkId,
				username: (proposal.user.metadata as UserMetadata).username,
			},
			fundingRound:
				proposal.fundingRound && this.buildFundingRound(proposal.fundingRound),
		}
	}

	async getProposals(
		options: GetProposalsOptionsSchema = {},
		user: UserLinked,
	): Promise<ProposalsWithCounts> {
		getProposalsOptionsSchema.parse(options)

		const [rawProposals, allCount, myCount, othersCount] =
			await this.prisma.$transaction([
				this.prisma.proposal.findMany({
					where: this.buildWhereClause(options, user),
					select: {
						id: true,
						title: true,
						proposalSummary: true,
						status: true,
						totalFundingRequired: true,
						createdAt: true,
						updatedAt: true,
						user: this.buildUserInclude(),
						fundingRound: this.buildFundingRoundInclude(),
					},
					orderBy: this.buildOrderBy(options),
				}),
				this.getAllProposalsCount(),
				this.getMyProposalsCount(user),
				this.getOthersProposalsCount(user),
			])

		const proposals = rawProposals.map(proposal => {
			return {
				id: proposal.id,
				title: proposal.title,
				summary: proposal.proposalSummary,
				status: proposal.status,
				totalFundingRequired: proposal.totalFundingRequired.toNumber(),
				createdAt: proposal.createdAt.toISOString(),
				updatedAt: proposal.updatedAt.toISOString(),
				user: {
					id: proposal.user.id,
					linkId: proposal.user.linkId,
					username: (proposal.user.metadata as UserMetadata).username,
				},
				fundingRound:
					proposal.fundingRound &&
					this.buildFundingRound(proposal.fundingRound),
			}
		})

		const counts: ProposalCounts = {
			all: allCount,
			my: myCount,
			others: othersCount,
		}

		return {
			proposals,
			counts,
		}
	}

	private buildUserFilter(user: UserLinked): Prisma.UserWhereInput {
		return { OR: [{ id: user.id }, { linkId: user.linkId }] }
	}

	private buildWhereClause(
		options: GetProposalsOptionsSchema,
		user: UserLinked,
	): Prisma.ProposalWhereInput {
		const clause: Prisma.ProposalWhereInput = {}

		if (options.filterBy === 'my') {
			clause.user = this.buildUserFilter(user)
		} else if (options.filterBy === 'others') {
			clause.user = { NOT: this.buildUserFilter(user) }
		}

		if (options.query) {
			clause.title = { contains: options.query, mode: 'insensitive' }
		}

		return clause
	}

	private getAllProposalsCount() {
		return this.prisma.proposal.count()
	}

	private getMyProposalsCount(user: UserLinked) {
		return this.prisma.proposal.count({
			where: { user: this.buildUserFilter(user) },
		})
	}

	private getOthersProposalsCount(user: UserLinked) {
		return this.prisma.proposal.count({
			where: { user: { NOT: this.buildUserFilter(user) } },
		})
	}

	private buildOrderBy = (
		options?: GetProposalsOptionsSchema,
	): Prisma.ProposalOrderByWithRelationInput[] => {
		if (!options?.sortBy) {
			return DEFAULT_ORDER_BY
		}

		// If there is a user sort, put it first, then follow with the default array.
		const filteredDefault = DEFAULT_ORDER_BY.filter(orderItem => {
			const key = Object.keys(orderItem)[0]
			return key !== options.sortBy
		})

		return [
			{
				[options.sortBy]: options.sortOrder,
			},
			...filteredDefault,
		]
	}

	private buildUserInclude() {
		return {
			select: {
				id: true,
				metadata: true,
				linkId: true,
			},
		}
	}

	private buildFundingRoundInclude() {
		return {
			select: {
				id: true,
				name: true,
				description: true,
				status: true,
				totalBudget: true,
				mefId: true,
				startDate: true,
				endDate: true,
				_count: {
					select: { proposals: true },
				},
				submissionPhase: {
					select: {
						id: true,
						startDate: true,
						endDate: true,
					},
				},
				considerationPhase: {
					select: {
						id: true,
						startDate: true,
						endDate: true,
					},
				},
				deliberationPhase: {
					select: {
						id: true,
						startDate: true,
						endDate: true,
					},
				},
				votingPhase: {
					select: {
						id: true,
						startDate: true,
						endDate: true,
					},
				},
			},
		}
	}

	private buildFundingRound(
		fundingRound: {
			id: string
			name: string
			description: string
			status: string
			totalBudget: Decimal
			mefId: number
			startDate: Date
			endDate: Date
			_count: {
				proposals: number
			}
		} & Record<
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
	) {
		const phases = FundingRoundService.buildPhases(fundingRound)

		return {
			id: fundingRound.id,
			name: fundingRound.name,
			description: fundingRound.description,
			status: FundingRoundService.fixFundingRoundStatus(
				fundingRound.status,
				fundingRound.startDate,
			),
			phase: FundingRoundService.getCurrentPhase(
				fundingRound.endDate.toISOString(),
				phases,
			),
			mefId: fundingRound.mefId,
			proposalsCount: fundingRound._count.proposals,
			totalBudget: fundingRound.totalBudget.toString(),
			startDate: fundingRound.startDate.toISOString(),
			endDate: fundingRound.endDate.toISOString(),
			phases: phases!,
		}
	}

	static hasEditPermission(
		user: { id: string; linkId: string },
		proposal: { user: { id: string; linkId: string }; status: ProposalStatus },
	) {
		const isOwner =
			proposal.user.id === user.id || proposal.user.linkId === user.linkId
		return isOwner && proposal.status === ProposalStatus.DRAFT
	}

	async checkEditPermission(
		proposalId: number,
		user: { id: string; linkId: string },
	) {
		const proposal = await this.prisma.proposal.findUnique({
			where: { id: proposalId },
			select: { status: true, user: { select: { id: true, linkId: true } } },
		})
		if (!proposal) throw AppError.notFound(ProposalErrors.NOT_FOUND)
		return ProposalService.hasEditPermission(user, proposal)
	}

	async updateProposal(
		id: number,
		data: CreateProposalInput,
	): Promise<Proposal> {
		// Validate input
		const validatedData = proposalCreateSchema.parse(data)

		try {
			return await this.prisma.proposal.update({
				where: { id },
				data: {
					title: validatedData.title,
					proposalSummary: validatedData.proposalSummary,
					keyObjectives: validatedData.keyObjectives,
					problemStatement: validatedData.problemStatement,
					problemImportance: validatedData.problemImportance,
					proposedSolution: validatedData.proposedSolution,
					implementationDetails: validatedData.implementationDetails,
					communityBenefits: validatedData.communityBenefits,
					keyPerformanceIndicators: validatedData.keyPerformanceIndicators,
					totalFundingRequired: new Decimal(
						validatedData.totalFundingRequired.toString(),
					),
					budgetBreakdown: validatedData.budgetBreakdown,
					estimatedCompletionDate: validatedData.estimatedCompletionDate,
					milestones: validatedData.milestones,
					teamMembers: validatedData.teamMembers,
					relevantExperience: validatedData.relevantExperience,
					potentialRisks: validatedData.potentialRisks,
					mitigationPlans: validatedData.mitigationPlans,
					discordHandle: validatedData.discordHandle,
					email: validatedData.email,
					website: validatedData.website,
					githubProfile: validatedData.githubProfile,
					otherLinks: validatedData.otherLinks,
				},
			})
		} catch (error) {
			console.error('Error updating proposal:', error)
			throw error // Re-throw to handle in the API route
		}
	}

	async deleteProposal(
		id: number,
		userId: string,
		userLinkId: string,
	): Promise<void> {
		const proposal = await this.prisma.proposal.findUnique({
			where: { id },
			include: {
				user: true,
			},
		})

		if (!proposal) {
			throw AppError.notFound(ProposalErrors.NOT_FOUND)
		}

		const hasAccess =
			proposal.userId === userId || proposal.user?.linkId === userLinkId

		if (!hasAccess) {
			throw AppError.forbidden(ProposalErrors.UNAUTHORIZED)
		}

		if (proposal.status !== ProposalStatus.DRAFT) {
			throw AppError.badRequest(ProposalErrors.DRAFT_ONLY)
		}

		await this.prisma.proposal.delete({
			where: { id },
		})
	}

	async getProposalComments(proposalId: number): Promise<CategorizedComments> {
		const [
			reviewerDeliberationVotes,
			communityDeliberationVotes,
			considerationVotes,
		] = await Promise.all([
			this.prisma.reviewerDeliberationVote.findMany({
				where: { proposalId },
				include: {
					user: {
						select: {
							metadata: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.communityDeliberationVote.findMany({
				where: { proposalId },
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.considerationVote.findMany({
				where: { proposalId },
				include: {
					voter: {
						select: {
							metadata: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
			}),
		])

		return {
			reviewerDeliberation: reviewerDeliberationVotes.map(vote => ({
				id: vote.id,
				feedback: vote.feedback,
				createdAt: vote.createdAt,
				isReviewerComment: true,
				recommendation: vote.recommendation,
				reviewer: {
					username: (vote.user.metadata as UserMetadata).username,
				},
			})),
			communityDeliberation: communityDeliberationVotes.map(vote => ({
				id: vote.id,
				feedback: vote.feedback,
				createdAt: vote.createdAt,
				isReviewerComment: false,
			})),
			reviewerConsideration: considerationVotes.map(vote => ({
				id: vote.id,
				feedback: vote.feedback,
				createdAt: vote.createdAt,
				isReviewerComment: true,
				recommendation: vote.decision === 'APPROVED',
				reviewer: {
					username: (vote.voter.metadata as UserMetadata).username,
				},
			})),
		}
	}
}
