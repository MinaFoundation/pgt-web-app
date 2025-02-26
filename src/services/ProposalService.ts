import { PrismaClient, Proposal, ProposalStatus } from '@prisma/client'
import { z } from 'zod'
import { ProposalValidation as PV } from '@/constants/validation'
import { Decimal } from 'decimal.js'
import { AppError } from '@/lib/errors'
import { ProposalErrors } from '@/constants/errors'
import type { ProposalComment } from '@/types/deliberation'
import { UserMetadata } from './UserService'

// Validation schema (reuse from CreateProposal component)
export const proposalSchema = z.object({
	title: z.string().min(PV.TITLE.min).max(PV.TITLE.max),
	proposalSummary: z
		.string()
		.min(PV.PROPOSAL_SUMMARY.min)
		.max(PV.PROPOSAL_SUMMARY.max),
	keyObjectives: z
		.string()
		.min(PV.KEY_OBJECTIVES.min)
		.max(PV.KEY_OBJECTIVES.max),
	problemStatement: z
		.string()
		.min(PV.PROBLEM_STATEMENT.min)
		.max(PV.PROBLEM_STATEMENT.max),
	problemImportance: z
		.string()
		.min(PV.PROBLEM_IMPORTANCE.min)
		.max(PV.PROBLEM_IMPORTANCE.max),
	proposedSolution: z
		.string()
		.min(PV.PROPOSED_SOLUTION.min)
		.max(PV.PROPOSED_SOLUTION.max),
	implementationDetails: z
		.string()
		.min(PV.IMPLEMENTATION_DETAILS.min)
		.max(PV.IMPLEMENTATION_DETAILS.max),
	communityBenefits: z
		.string()
		.min(PV.COMMUNITY_BENEFITS.min)
		.max(PV.COMMUNITY_BENEFITS.max),
	keyPerformanceIndicators: z.string().min(PV.KPI.min).max(PV.KPI.max),
	totalFundingRequired: z.string().transform(val => parseFloat(val)),
	budgetBreakdown: z
		.string()
		.min(PV.BUDGET_BREAKDOWN.min)
		.max(PV.BUDGET_BREAKDOWN.max),
	estimatedCompletionDate: z.date(),
	milestones: z.string().min(PV.MILESTONES.min).max(PV.MILESTONES.max),
	teamMembers: z.string().min(PV.TEAM_MEMBERS.min).max(PV.TEAM_MEMBERS.max),
	relevantExperience: z
		.string()
		.min(PV.RELEVANT_EXPERIENCE.min)
		.max(PV.RELEVANT_EXPERIENCE.max),
	potentialRisks: z
		.string()
		.min(PV.POTENTIAL_RISKS.min)
		.max(PV.POTENTIAL_RISKS.max),
	mitigationPlans: z
		.string()
		.min(PV.MITIGATION_PLANS.min)
		.max(PV.MITIGATION_PLANS.max),
	discordHandle: z.string().min(PV.DISCORD.min).max(PV.DISCORD.max),
	email: z.string().email().max(PV.EMAIL.max),
	website: z.string().url().max(PV.WEBSITE.max).optional(),
	githubProfile: z.string().url().max(PV.GITHUB_PROFILE.max).optional(),
	otherLinks: z.string().max(PV.OTHER_LINKS.max).optional(),
})

export type CreateProposalInput = z.infer<typeof proposalSchema>

interface CategorizedComments {
	reviewerConsideration: ProposalComment[]
	reviewerDeliberation: ProposalComment[]
	communityDeliberation: ProposalComment[]
}

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
			const validatedData = proposalSchema.parse(data)

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

	async getUserProposals(userId: string): Promise<Proposal[]> {
		return await this.prisma.proposal.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
		})
	}

	async getProposalsByStatus(status: ProposalStatus): Promise<Proposal[]> {
		return await this.prisma.proposal.findMany({
			where: { status },
			orderBy: { createdAt: 'desc' },
		})
	}

	async searchProposals(searchTerm: string): Promise<Proposal[]> {
		return await this.prisma.proposal.findMany({
			where: {
				title: {
					contains: searchTerm,
					mode: 'insensitive',
				},
			},
			orderBy: { createdAt: 'desc' },
		})
	}

	async getProposalById(
		id: number,
		userId: string,
		userLinkId: string,
	): Promise<(Proposal & { canEdit: boolean; canDelete: boolean }) | null> {
		const proposal = await this.prisma.proposal.findUnique({
			where: { id },
			include: {
				user: true,
			},
		})

		if (!proposal) return null

		// Check if user has access (is creator or has same linkId)
		const isOnwer =
			proposal.userId === userId || proposal.user?.linkId === userLinkId

		if (!isOnwer) return null

		// Only creator can edit/delete, and only if status is DRAFT
		const canEdit = isOnwer && proposal.status === ProposalStatus.DRAFT
		const canDelete = canEdit

		return {
			...proposal,
			canEdit,
			canDelete,
		}
	}

	async getUserProposalsWithLinked(
		userId: string,
		userLinkId: string,
	): Promise<Proposal[]> {
		return await this.prisma.proposal.findMany({
			where: {
				user: {
					OR: [{ id: userId }, { linkId: userLinkId }],
				},
			},
			include: {
				user: {
					select: {
						id: true,
						metadata: true,
						linkId: true,
					},
				},
				fundingRound: {
					select: {
						id: true,
						name: true,
						description: true,
						status: true,
						startDate: true,
						endDate: true,
						considerationPhase: {
							select: {
								startDate: true,
								endDate: true,
							},
						},
						deliberationPhase: {
							select: {
								startDate: true,
								endDate: true,
							},
						},
						votingPhase: {
							select: {
								startDate: true,
								endDate: true,
							},
						},
					},
				},
			},
			orderBy: [
				{ status: 'asc' }, // Show drafts first
				{ createdAt: 'desc' }, // Then by creation date
			],
		})
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

	async updateProposal(
		id: number,
		data: CreateProposalInput,
	): Promise<Proposal> {
		// Validate input
		const validatedData = proposalSchema.parse(data)

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

	async getFundingRoundId(proposalId: number): Promise<number> {
		const proposal = await this.prisma.proposal.findUnique({
			where: { id: proposalId },
			select: { fundingRoundId: true },
		})

		if (!proposal) {
			throw AppError.notFound(`Proposal with ID ${proposalId} not found`)
		}

		if (!proposal.fundingRoundId) {
			throw AppError.notFound(
				`Funding round ID not found for proposal ${proposalId}`,
			)
		}

		return parseInt(proposal.fundingRoundId)
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
