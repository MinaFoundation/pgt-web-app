import { PrismaClient, Proposal, ProposalStatus } from '@prisma/client'
import { z } from 'zod'
import { ProposalValidation as PV } from '@/constants/validation'
import { Decimal } from 'decimal.js'
import { AppError } from '@/lib/errors'
import { ProposalErrors } from '@/constants/errors'
import type { ProposalComment } from '@/types/deliberation'
import { UserMetadata } from './UserService'
import { ProposalSummaryWithUserAndFundingRound } from '@/types/proposals'
import { FundingRoundService } from './FundingRoundService'
import { FundingRoundPhases } from '@/types/funding-round'

// Validation schema (reuse from CreateProposal component)
export const proposalCreateSchema = z.object({
	title: z
		.string()
		.min(PV.TITLE.min, PV.TITLE.messages.min)
		.max(PV.TITLE.max, PV.TITLE.messages.max),

	proposalSummary: z
		.string()
		.min(PV.PROPOSAL_SUMMARY.min, PV.PROPOSAL_SUMMARY.messages.min)
		.max(PV.PROPOSAL_SUMMARY.max, PV.PROPOSAL_SUMMARY.messages.max),

	keyObjectives: z
		.string()
		.min(PV.KEY_OBJECTIVES.min, PV.KEY_OBJECTIVES.messages.min)
		.max(PV.KEY_OBJECTIVES.max, PV.KEY_OBJECTIVES.messages.max),

	problemStatement: z
		.string()
		.min(PV.PROBLEM_STATEMENT.min, PV.PROBLEM_STATEMENT.messages.min)
		.max(PV.PROBLEM_STATEMENT.max, PV.PROBLEM_STATEMENT.messages.max),

	problemImportance: z
		.string()
		.min(PV.PROBLEM_IMPORTANCE.min, PV.PROBLEM_IMPORTANCE.messages.min)
		.max(PV.PROBLEM_IMPORTANCE.max, PV.PROBLEM_IMPORTANCE.messages.max),

	proposedSolution: z
		.string()
		.min(PV.PROPOSED_SOLUTION.min, PV.PROPOSED_SOLUTION.messages.min)
		.max(PV.PROPOSED_SOLUTION.max, PV.PROPOSED_SOLUTION.messages.max),

	implementationDetails: z
		.string()
		.min(PV.IMPLEMENTATION_DETAILS.min, PV.IMPLEMENTATION_DETAILS.messages.min)
		.max(PV.IMPLEMENTATION_DETAILS.max, PV.IMPLEMENTATION_DETAILS.messages.max),

	communityBenefits: z
		.string()
		.min(PV.COMMUNITY_BENEFITS.min, PV.COMMUNITY_BENEFITS.messages.min)
		.max(PV.COMMUNITY_BENEFITS.max, PV.COMMUNITY_BENEFITS.messages.max),

	keyPerformanceIndicators: z
		.string()
		.min(PV.KPI.min, PV.KPI.messages.min)
		.max(PV.KPI.max, PV.KPI.messages.max),

	totalFundingRequired: z
		.string()
		.regex(/^\d+(\.\d{1,2})?$/, PV.TOTAL_FUNDING_REQUIRED.messages.type)
		.refine(
			(val: string) => parseFloat(val) <= PV.TOTAL_FUNDING_REQUIRED.max,
			PV.TOTAL_FUNDING_REQUIRED.messages.max,
		),

	budgetBreakdown: z
		.string()
		.min(PV.BUDGET_BREAKDOWN.min, PV.BUDGET_BREAKDOWN.messages.min)
		.max(PV.BUDGET_BREAKDOWN.max, PV.BUDGET_BREAKDOWN.messages.max),

	estimatedCompletionDate: z.string().datetime(),

	milestones: z
		.string()
		.min(PV.MILESTONES.min, PV.MILESTONES.messages.min)
		.max(PV.MILESTONES.max, PV.MILESTONES.messages.max),

	teamMembers: z
		.string()
		.min(PV.TEAM_MEMBERS.min, PV.TEAM_MEMBERS.messages.min)
		.max(PV.TEAM_MEMBERS.max, PV.TEAM_MEMBERS.messages.max),

	relevantExperience: z
		.string()
		.min(PV.RELEVANT_EXPERIENCE.min, PV.RELEVANT_EXPERIENCE.messages.min)
		.max(PV.RELEVANT_EXPERIENCE.max, PV.RELEVANT_EXPERIENCE.messages.max),

	potentialRisks: z
		.string()
		.min(PV.POTENTIAL_RISKS.min, PV.POTENTIAL_RISKS.messages.min)
		.max(PV.POTENTIAL_RISKS.max, PV.POTENTIAL_RISKS.messages.max),

	mitigationPlans: z
		.string()
		.min(PV.MITIGATION_PLANS.min, PV.MITIGATION_PLANS.messages.min)
		.max(PV.MITIGATION_PLANS.max, PV.MITIGATION_PLANS.messages.max),

	email: z
		.string()
		.email(PV.EMAIL.messages.email)
		.max(PV.EMAIL.max, PV.EMAIL.messages.max),

	discordHandle: z
		.string()
		.min(PV.DISCORD.min)
		.max(PV.DISCORD.max, PV.DISCORD.messages.max),

	website: z
		.string()
		.url()
		.max(PV.WEBSITE.max, PV.WEBSITE.messages.max)
		.optional()
		.or(z.literal('')),

	githubProfile: z
		.string()
		.url()
		.max(PV.GITHUB_PROFILE.max, PV.GITHUB_PROFILE.messages.max)
		.optional()
		.or(z.literal('')),

	otherLinks: z.string().max(PV.OTHER_LINKS.max, PV.OTHER_LINKS.messages.max),
})

export type CreateProposalInput = z.infer<typeof proposalCreateSchema>

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
	): Promise<ProposalSummaryWithUserAndFundingRound[]> {
		const proposals = await this.prisma.proposal.findMany({
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
				},
			},
			orderBy: [
				{ status: 'asc' }, // Show drafts first
				{ createdAt: 'desc' }, // Then by creation date
			],
		})

		return proposals.map(proposal => {
			const phases: FundingRoundPhases | null = proposal.fundingRound
				? {
						submission: {
							id: proposal.fundingRound.submissionPhase!.id,
							startDate:
								proposal.fundingRound.submissionPhase!.startDate.toISOString(),
							endDate:
								proposal.fundingRound.submissionPhase!.endDate.toISOString(),
						},
						consideration: {
							id: proposal.fundingRound.considerationPhase!.id,
							startDate:
								proposal.fundingRound.considerationPhase!.startDate.toISOString(),
							endDate:
								proposal.fundingRound.considerationPhase!.endDate.toISOString(),
						},
						deliberation: {
							id: proposal.fundingRound.deliberationPhase!.id,
							startDate:
								proposal.fundingRound.deliberationPhase!.startDate.toISOString(),
							endDate:
								proposal.fundingRound.deliberationPhase!.endDate.toISOString(),
						},
						voting: {
							id: proposal.fundingRound.votingPhase!.id,
							startDate:
								proposal.fundingRound.votingPhase!.startDate.toISOString(),
							endDate: proposal.fundingRound.votingPhase!.endDate.toISOString(),
						},
					}
				: null

			const fundingRound = proposal.fundingRound
				? {
						id: proposal.fundingRound.id,
						name: proposal.fundingRound.name,
						description: proposal.fundingRound.description,
						status: FundingRoundService.fixFundingRoundStatus(
							proposal.fundingRound.status,
							proposal.fundingRound.startDate,
						),
						phase: FundingRoundService.getCurrentPhase(
							proposal.fundingRound.endDate.toISOString(),
							phases!,
						),
						mefId: proposal.fundingRound.mefId,
						proposalsCount: proposal.fundingRound._count.proposals,
						totalBudget: proposal.fundingRound.totalBudget.toString(),
						startDate: proposal.fundingRound.startDate.toISOString(),
						endDate: proposal.fundingRound.endDate.toISOString(),
						phases: phases!,
					}
				: null

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
				fundingRound,
			}
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
