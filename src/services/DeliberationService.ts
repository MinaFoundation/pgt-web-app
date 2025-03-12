import { PrismaClient, Prisma, ProposalStatus } from '@prisma/client'
import { AppError } from '@/lib/errors'
import { UserMetadata } from './UserService'
import { Decimal } from '@prisma/client/runtime/library'
import { UserService } from '@/services'
import { CoreProposalData } from '@/types/proposals'
import {
	ReviewerDeliberationVote,
	CommunityDeliberationVote,
} from '@prisma/client'
import { DeliberationProposal, GptSurveySummary } from '@/types'
import {
	GetDeliberationProposalsOptions,
	getDeliberationProposalsOptionsSchema,
} from '@/schemas/deliberation'

type ReviewerDeliberationVoteWithUser = ReviewerDeliberationVote & {
	user: {
		metadata: UserMetadata
	}
}

type CommunityDeliberationVoteWithUser = CommunityDeliberationVote & {
	user: {
		metadata: UserMetadata
	}
}

interface ProposalWithVotes extends CoreProposalData {
	deliberationReviewerVotes: ReviewerDeliberationVoteWithUser[]
	deliberationCommunityVotes: CommunityDeliberationVoteWithUser[]
	GptSurveySummarizerProposal: GptSurveySummary | null
	// Add funding round relation with nested topic and reviewer groups
	fundingRound: {
		topic: {
			reviewerGroups: {
				reviewerGroup: {
					members: Array<{ userId: string }>
				}
			}[]
		}
	}
}

export interface DeliberationPhaseSummary {
	fundingRoundName: string
	startDate: Date
	endDate: Date
	totalProposals: number
	recommendedProposals: number
	notRecommendedProposals: number
	budgetBreakdown: {
		small: number // 100-500 MINA
		medium: number // 500-1000 MINA
		large: number // 1000+ MINA
	}
	proposalVotes: Array<{
		id: number
		title: string
		proposer: string
		yesVotes: number
		noVotes: number
		status: ProposalStatus
		isRecommended: boolean
		totalFundingRequired: Decimal
	}>
}

export interface DeliberationPhaseProposalsResponse {
	proposals: DeliberationProposal[]
	pendingRecommendationCount: number
	recommendedCount: number
	notRecommendedCount: number
	totalCount: number
}

const DEFAULT_ORDER_BY: Prisma.ProposalOrderByWithRelationInput[] = [
	{ createdAt: 'desc' },
	{ status: 'asc' },
]

export class DeliberationService {
	private userService: UserService

	constructor(private prisma: PrismaClient) {
		this.userService = new UserService(prisma)
	}

	async getDeliberationProposals(
		fundingRoundId: string,
		userId: string,
		options: GetDeliberationProposalsOptions = {},
	): Promise<DeliberationPhaseProposalsResponse> {
		if (options) {
			getDeliberationProposalsOptionsSchema.parse(options)
		}

		const buildOrderBy = (
			userGetPublicFundingRoundOptions?: GetDeliberationProposalsOptions,
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

		const fundingRound = await this.prisma.fundingRound.findUnique({
			where: {
				id: fundingRoundId,
			},
			include: {
				deliberationPhase: true,
				topic: {
					include: {
						reviewerGroups: {
							include: {
								reviewerGroup: {
									include: {
										members: {
											where: { userId },
										},
									},
								},
							},
						},
					},
				},
			},
		})

		if (!fundingRound) {
			throw new AppError('Funding round not found', 404)
		}

		// Get all proposals in deliberation phase for this funding round
		const proposals = (await this.prisma.proposal.findMany({
			where: {
				fundingRoundId,
				status: 'DELIBERATION' as ProposalStatus,
				...(options.query
					? {
							name: {
								contains: options.query,
								mode: 'insensitive',
							},
						}
					: {}),
			},
			include: {
				deliberationReviewerVotes: {
					include: {
						user: {
							select: {
								metadata: true,
							},
						},
					},
				},
				deliberationCommunityVotes: {
					include: {
						user: {
							select: {
								metadata: true,
							},
						},
					},
				},
				user: {
					select: {
						id: true,
						metadata: true,
					},
				},
				fundingRound: {
					include: {
						topic: {
							include: {
								reviewerGroups: {
									include: {
										reviewerGroup: {
											include: {
												members: true,
											},
										},
									},
								},
							},
						},
					},
				},
				GptSurveySummarizerProposal: {
					select: {
						summary: true,
						summary_updated_at: true,
					},
				},
			},
			orderBy: buildOrderBy(options.sortBy ? options : undefined),
		})) as unknown as ProposalWithVotes[]

		// Transform the proposals
		const transformedProposals = await Promise.all(
			proposals.map(async proposal => {
				// Get reviewer comments
				const reviewerComments = proposal.deliberationReviewerVotes.map(
					vote => ({
						id: vote.id,
						feedback: vote.feedback,
						recommendation: vote.recommendation,
						createdAt: vote.createdAt,
						reviewer: {
							username:
								(vote.user?.metadata as UserMetadata)?.username || 'Unknown',
						},
						isReviewerComment: true,
					}),
				)

				// Get community comments
				const communityComments = proposal.deliberationCommunityVotes.map(
					vote => ({
						id: vote.id,
						feedback: vote.feedback,
						createdAt: vote.createdAt,
						isReviewerComment: false,
					}),
				)

				// Combine and sort all comments
				const allComments = [...reviewerComments, ...communityComments].sort(
					(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
				)

				// Find user's own deliberation
				const userReviewerVote = proposal.deliberationReviewerVotes.find(
					vote => vote.userId === userId,
				)
				const userCommunityVote = proposal.deliberationCommunityVotes.find(
					vote => vote.userId === userId,
				)
				const userDeliberation = userReviewerVote || userCommunityVote

				const linkedAccounts = await this.userService.getLinkedAccounts(
					proposal.user.id,
				)
				const linkedAccountsMetadata = linkedAccounts.map(account => ({
					id: account.id,
					authSource: (account.metadata as UserMetadata)?.authSource || {
						type: '',
						id: '',
						username: '',
					},
				}))

				const votes = proposal.deliberationReviewerVotes
				const yesVotes = votes.filter(v => v.recommendation).length
				const noVotes = votes.filter(v => !v.recommendation).length
				const isRecommended = yesVotes > noVotes
				const isNotRecommended = noVotes > yesVotes
				const isPendingRecommendation = yesVotes == 0 && noVotes == 0

				return {
					id: proposal.id,
					title: proposal.title,
					proposalSummary: proposal.proposalSummary,
					keyObjectives: proposal.keyObjectives,
					problemStatement: proposal.problemStatement,
					problemImportance: proposal.problemImportance,
					proposedSolution: proposal.proposedSolution,
					implementationDetails: proposal.implementationDetails,
					totalFundingRequired: proposal.totalFundingRequired,
					communityBenefits: proposal.communityBenefits,
					keyPerformanceIndicators: proposal.keyPerformanceIndicators,
					budgetBreakdown: proposal.budgetBreakdown,
					milestones: proposal.milestones,
					estimatedCompletionDate: proposal.estimatedCompletionDate,
					teamMembers: proposal.teamMembers,
					relevantExperience: proposal.relevantExperience,
					potentialRisks: proposal.potentialRisks,
					mitigationPlans: proposal.mitigationPlans,
					discordHandle: proposal.discordHandle,
					email: proposal.email,
					website: proposal.website,
					githubProfile: proposal.githubProfile,
					createdAt: proposal.createdAt,
					submitter:
						(proposal.user?.metadata as UserMetadata)?.username || 'Unknown',
					isReviewerEligible: fundingRound.topic.reviewerGroups.some(
						group => group.reviewerGroup.members.length > 0,
					),
					reviewerComments: allComments,
					userDeliberation: userDeliberation
						? {
								feedback: userDeliberation.feedback,
								recommendation:
									'recommendation' in userDeliberation
										? (userDeliberation.recommendation as boolean)
										: undefined,
								createdAt: userDeliberation.createdAt,
								isReviewerVote: 'recommendation' in userDeliberation,
							}
						: undefined,
					hasVoted: Boolean(userDeliberation),
					submitterMetadata: {
						authSource: {
							type:
								(proposal.user?.metadata as UserMetadata)?.authSource?.type ||
								'',
							id:
								(proposal.user?.metadata as UserMetadata)?.authSource?.id || '',
							username:
								(proposal.user?.metadata as UserMetadata)?.authSource
									?.username || '',
						},
						linkedAccounts: linkedAccountsMetadata,
					},
					isPendingRecommendation,
					isRecommended,
					isNotRecommended,
					gptSurveySummary: proposal.GptSurveySummarizerProposal,
				}
			}),
		)

		// TODO: remember to move filters to the database query when pagination is implemented
		const filteredProposals = transformedProposals.filter(proposal => {
			switch (options.filterBy) {
				case 'pending':
					return proposal.isPendingRecommendation
				case 'recommended':
					return proposal.isRecommended
				case 'not-recommended':
					return !proposal.isPendingRecommendation && !proposal.isRecommended
				case 'all':
				default:
					return true
			}
		})

		return {
			proposals: filteredProposals,
			pendingRecommendationCount: transformedProposals.filter(
				p => p.isPendingRecommendation,
			).length,
			recommendedCount: transformedProposals.filter(p => p.isRecommended)
				.length,
			notRecommendedCount: transformedProposals.filter(p => p.isNotRecommended)
				.length,
			totalCount: transformedProposals.length,
		}
	}

	async submitDeliberation(
		proposalId: number,
		userId: string,
		feedback: string,
		recommendation?: boolean,
	) {
		const proposal = await this.prisma.proposal.findUnique({
			where: { id: proposalId },
			include: {
				fundingRound: {
					include: {
						topic: {
							include: {
								reviewerGroups: {
									include: {
										reviewerGroup: {
											include: {
												members: {
													where: { userId },
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		})

		if (!proposal) {
			throw new AppError('Proposal not found', 404)
		}

		if (proposal.status !== 'DELIBERATION') {
			throw new AppError('Proposal is not in deliberation phase', 400)
		}

		// Check if user is a reviewer
		const isReviewer =
			proposal.fundingRound?.topic.reviewerGroups.some(
				group => group.reviewerGroup.members.length > 0,
			) ?? false

		if (recommendation !== undefined && !isReviewer) {
			throw new AppError('Only reviewers can submit recommendations', 403)
		}

		// Create or update the appropriate vote type
		if (isReviewer) {
			if (recommendation === undefined) {
				throw new AppError('Reviewers must provide a recommendation', 400)
			}

			return await this.prisma.reviewerDeliberationVote.upsert({
				where: {
					proposalId_userId: {
						proposalId,
						userId,
					},
				},
				create: {
					proposalId,
					userId,
					feedback,
					recommendation,
				},
				update: {
					feedback,
					recommendation,
				},
			})
		} else {
			return await this.prisma.communityDeliberationVote.upsert({
				where: {
					proposalId_userId: {
						proposalId,
						userId,
					},
				},
				create: {
					proposalId,
					userId,
					feedback,
				},
				update: {
					feedback,
				},
			})
		}
	}

	async getDeliberationPhaseSummary(
		fundingRoundId: string,
	): Promise<DeliberationPhaseSummary> {
		const fundingRound = await this.prisma.fundingRound.findUnique({
			where: { id: fundingRoundId },
			include: {
				deliberationPhase: true,
				proposals: {
					where: {
						status: {
							in: ['DELIBERATION', 'VOTING', 'APPROVED', 'REJECTED'],
						},
					},
					include: {
						user: {
							select: {
								metadata: true,
							},
						},
						deliberationReviewerVotes: true,
					},
				},
			},
		})

		if (!fundingRound || !fundingRound.deliberationPhase) {
			throw new AppError('Funding round or deliberation phase not found', 404)
		}

		const { proposals, deliberationPhase } = fundingRound

		// Calculate budget breakdowns
		const budgetBreakdown = {
			small: 0,
			medium: 0,
			large: 0,
		}

		proposals.forEach(proposal => {
			const budget = proposal.totalFundingRequired
			const budgetNumber = budget.toNumber()

			if (budgetNumber <= 500) {
				budgetBreakdown.small++
			} else if (budgetNumber <= 1000) {
				budgetBreakdown.medium++
			} else {
				budgetBreakdown.large++
			}
		})

		// Calculate votes for each proposal
		const proposalVotes = proposals.map(proposal => {
			const votes = proposal.deliberationReviewerVotes
			const yesVotes = votes.filter(v => v.recommendation).length
			const noVotes = votes.filter(v => !v.recommendation).length

			return {
				id: proposal.id,
				title: proposal.title,
				proposer:
					(proposal.user.metadata as UserMetadata).username || 'Unknown',
				yesVotes,
				noVotes,
				status: proposal.status,
				isRecommended: yesVotes > noVotes,
				totalFundingRequired: proposal.totalFundingRequired,
			}
		})

		// Count recommended and not recommended proposals based on reviewer votes
		const recommendedProposals = proposalVotes.filter(
			p => p.isRecommended,
		).length
		const notRecommendedProposals = proposalVotes.filter(
			p => !p.isRecommended,
		).length

		// Sort proposals by yes votes in descending order
		proposalVotes.sort((a, b) => b.yesVotes - a.yesVotes)

		return {
			fundingRoundName: fundingRound.name,
			startDate: deliberationPhase.startDate,
			endDate: deliberationPhase.endDate,
			totalProposals: proposals.length,
			recommendedProposals,
			notRecommendedProposals,
			budgetBreakdown,
			proposalVotes,
		}
	}
}
