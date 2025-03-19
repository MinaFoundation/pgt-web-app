import {
	PrismaClient,
	ConsiderationDecision,
	ProposalStatus,
	ConsiderationVote,
	Prisma,
} from '@prisma/client'
import { ProposalStatusMoveService } from './ProposalStatusMoveService'
import { FundingRoundService } from './FundingRoundService'
import logger from '@/logging'
import { UserMetadata } from '@/services'
import {
	CommunityVoteStats,
	ConsiderationProposal,
	OCVVote,
	OCVVoteData,
	ReviewerVoteStats,
	ConsiderationVoteStats,
	ConsiderationProposalsCounts,
} from '@/types'
import type { JsonValue } from '@prisma/client/runtime/library'
import {
	GetConsiderationProposalsOptions,
	getConsiderationProposalsOptionsSchema,
} from '@/schemas'

interface VoteInput {
	proposalId: number
	voterId: string
	decision: ConsiderationDecision
	feedback: string
}

interface VoteEligibility {
	eligible: boolean
	message?: string
}

interface VoteQueryResult {
	proposal: {
		id: number
		status: ProposalStatus
		title: string
		proposalSummary: string
		createdAt: Date
		user: {
			metadata: UserMetadata
		}
		considerationVotes: ConsiderationVote[]
	}
	voter: {
		metadata: UserMetadata
	}
}

interface ConsiderationPhaseSummaryResult {
	fundingRoundName: string
	phaseTimeInfo: {
		startDate: Date
		endDate: Date
	}
	totalProposals: number
	budgetBreakdown: {
		small: number
		medium: number
		large: number
	}
	movedForwardProposals: number
	notMovedForwardProposals: number
	proposalVotes: Array<{
		id: number
		title: string
		proposer: string
		totalFundingRequired: number
		status: ProposalStatus
		reviewerVotes: {
			yesVotes: number
			noVotes: number
			total: number
			requiredReviewerApprovals: number
			reviewerEligible: boolean
		}
		communityVotes: {
			positive: number
			positiveStakeWeight: number
			voters: Array<OCVVote>
			isEligible: boolean
		}
	}>
}

const voteIncludeQuery = {
	proposal: {
		select: {
			id: true,
			status: true,
			title: true,
			proposalSummary: true,
			createdAt: true,
			user: {
				select: {
					metadata: true,
				},
			},
			considerationVotes: true,
		},
	},
	voter: {
		select: {
			metadata: true,
		},
	},
} satisfies Prisma.ConsiderationVoteInclude

export class ConsiderationVotingService {
	private statusMoveService: ProposalStatusMoveService
	private fundingRoundService: FundingRoundService

	constructor(private prisma: PrismaClient) {
		this.statusMoveService = new ProposalStatusMoveService(prisma)
		this.fundingRoundService = new FundingRoundService(prisma)
	}

	async submitVote(input: VoteInput): Promise<VoteQueryResult> {
		const existingVote = await this.getVoteWithDetails(
			input.proposalId,
			input.voterId,
		)

		// Create or update vote
		const vote = await this.createOrUpdateVote(input, existingVote)

		// Check if status should change and refresh data
		await this.statusMoveService.checkAndMoveProposal(input.proposalId)

		// Get fresh data after potential status change
		return this.refreshVoteData(input.proposalId, input.voterId)
	}

	async checkVotingEligibility(
		proposalId: number,
		fundingRoundId: string,
	): Promise<VoteEligibility> {
		const fundingRound =
			await this.fundingRoundService.getFundingRoundById(fundingRoundId)

		if (!fundingRound) {
			return { eligible: false, message: 'Funding round not found' }
		}

		// Ensure all required phases exist and have proper dates
		if (
			!fundingRound.phases.submission?.startDate ||
			!fundingRound.phases.submission?.endDate ||
			!fundingRound.phases.consideration?.startDate ||
			!fundingRound.phases.consideration?.endDate ||
			!fundingRound.phases.deliberation?.startDate ||
			!fundingRound.phases.deliberation?.endDate ||
			!fundingRound.phases.voting?.startDate ||
			!fundingRound.phases.voting?.endDate
		) {
			return {
				eligible: false,
				message: 'Funding round is not properly configured',
			}
		}

		// Now we can safely pass the funding round with its phases
		const currentPhase = FundingRoundService.getCurrentPhase(
			fundingRound.endDate,
			fundingRound.phases,
		)

		// Check current phase
		if (currentPhase.toUpperCase() !== ProposalStatus.CONSIDERATION) {
			return {
				eligible: false,
				message: 'Voting is only allowed during the consideration phase',
			}
		}

		// Get proposal status
		const proposal = await this.prisma.proposal.findUnique({
			where: { id: proposalId },
		})

		if (!proposal) {
			return { eligible: false, message: 'Proposal not found' }
		}

		// Allow voting if proposal is in CONSIDERATION or DELIBERATION status
		if (
			proposal.status.toUpperCase() !== ProposalStatus.CONSIDERATION &&
			proposal.status.toUpperCase() !== ProposalStatus.DELIBERATION
		) {
			return {
				eligible: false,
				message: 'Proposal is not eligible for consideration votes',
			}
		}

		return { eligible: true }
	}

	async checkReviewerEligibility(
		userId: string,
		proposalId: number,
	): Promise<boolean> {
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
												members: true,
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

		if (!proposal?.fundingRound?.topic?.reviewerGroups) {
			return false
		}

		return proposal.fundingRound.topic.reviewerGroups.some(trg =>
			trg.reviewerGroup.members.some(member => member.userId === userId),
		)
	}

	private async getVoteWithDetails(
		proposalId: number,
		voterId: string,
	): Promise<VoteQueryResult | null> {
		const vote = await this.prisma.considerationVote.findUnique({
			where: {
				proposalId_voterId: { proposalId, voterId },
			},
			include: voteIncludeQuery,
		})

		if (!vote) return null

		return {
			...vote,
			proposal: {
				...vote.proposal,
				user: {
					metadata: vote.proposal.user
						.metadata as Prisma.JsonValue as UserMetadata,
				},
			},
			voter: {
				metadata: vote.voter.metadata as Prisma.JsonValue as UserMetadata,
			},
		}
	}

	private async createOrUpdateVote(
		input: VoteInput,
		existingVote: VoteQueryResult | null,
	): Promise<VoteQueryResult> {
		let returnValue

		if (existingVote) {
			returnValue = await this.prisma.considerationVote.update({
				where: {
					proposalId_voterId: {
						proposalId: input.proposalId,
						voterId: input.voterId,
					},
				},
				data: {
					decision: input.decision,
					feedback: input.feedback,
				},
				include: voteIncludeQuery,
			})
		} else {
			returnValue = await this.prisma.considerationVote.create({
				data: {
					proposalId: input.proposalId,
					voterId: input.voterId,
					decision: input.decision,
					feedback: input.feedback,
				},
				include: voteIncludeQuery,
			})
		}

		return {
			...returnValue,
			proposal: {
				...returnValue.proposal,
				user: {
					metadata: returnValue.proposal.user
						.metadata as Prisma.JsonValue as UserMetadata,
				},
			},
			voter: {
				metadata: returnValue.voter
					.metadata as Prisma.JsonValue as UserMetadata,
			},
		}
	}

	private async refreshVoteData(
		proposalId: number,
		voterId: string,
	): Promise<VoteQueryResult> {
		const vote = await this.prisma.considerationVote.findUniqueOrThrow({
			where: {
				proposalId_voterId: { proposalId, voterId },
			},
			include: voteIncludeQuery,
		})

		logger.info(
			`Vote refreshed for proposal ${proposalId}. Current status: ${vote.proposal.status}`,
		)

		return {
			...vote,
			proposal: {
				...vote.proposal,
				user: {
					metadata: vote.proposal.user.metadata as UserMetadata,
				},
			},
			voter: {
				metadata: vote.voter.metadata as UserMetadata,
			},
		}
	}

	async getConsiderationPhaseSummary(
		fundingRoundId: string,
	): Promise<ConsiderationPhaseSummaryResult | null> {
		const fundingRound = await this.prisma.fundingRound.findUnique({
			where: { id: fundingRoundId },
			include: {
				considerationPhase: true,
				proposals: {
					select: {
						id: true,
						title: true,
						status: true,
						totalFundingRequired: true,
						user: {
							select: {
								metadata: true,
							},
						},
						considerationVotes: {
							select: {
								decision: true,
							},
						},
						OCVConsiderationVote: {
							select: {
								voteData: true,
							},
						},
					},
				},
			},
		})

		if (!fundingRound || !fundingRound.considerationPhase) {
			return null
		}

		const movedForwardStatuses = [
			ProposalStatus.DELIBERATION,
			ProposalStatus.VOTING,
			ProposalStatus.APPROVED,
			ProposalStatus.REJECTED,
		] as const

		const proposals = (
			fundingRound.proposals as unknown as Array<{
				id: number
				title: string
				status: ProposalStatus
				totalFundingRequired: Prisma.Decimal
				user: {
					metadata: UserMetadata
				}
				considerationVotes: Array<{
					decision: ConsiderationDecision
				}>
				OCVConsiderationVote: Array<{
					voteData: {
						total_community_votes: number
						total_positive_community_votes: number
						total_negative_community_votes: number
						elegible: boolean
					}
				}>
			}>
		).map(proposal => {
			const proposer =
				(proposal.user.metadata as UserMetadata)?.username || 'Anonymous'
			const yesVotes = proposal.considerationVotes.filter(
				vote => vote.decision === ConsiderationDecision.APPROVED,
			).length
			const noVotes = proposal.considerationVotes.filter(
				vote => vote.decision === ConsiderationDecision.REJECTED,
			).length
			const communityVotes = proposal.OCVConsiderationVote?.[0]?.voteData || {
				total_community_votes: 0,
				total_positive_community_votes: 0,
				total_negative_community_votes: 0,
				elegible: false,
				voters: [],
			}

			return {
				id: proposal.id,
				title: proposal.title,
				proposer,
				totalFundingRequired: proposal.totalFundingRequired.toNumber(),
				status: proposal.status,
				reviewerVotes: {
					yesVotes,
					noVotes,
					total: yesVotes + noVotes,
					requiredReviewerApprovals: 3,
					reviewerEligible: yesVotes >= 3,
				},
				communityVotes: {
					positive: communityVotes.total_positive_community_votes,
					positiveStakeWeight: 0,
					voters: [],
					isEligible: communityVotes.elegible,
				},
			}
		})

		const movedForwardCount = proposals.filter(p =>
			movedForwardStatuses.includes(
				p.status as (typeof movedForwardStatuses)[number],
			),
		).length
		const notMovedForwardCount = proposals.length - movedForwardCount

		const budgetBreakdown = proposals.reduce(
			(acc: { small: number; medium: number; large: number }, proposal) => {
				const budgetAmount = proposal.totalFundingRequired
				if (budgetAmount <= 500) {
					acc.small++
				} else if (budgetAmount <= 1000) {
					acc.medium++
				} else {
					acc.large++
				}
				return acc
			},
			{ small: 0, medium: 0, large: 0 },
		)

		return {
			fundingRoundName: fundingRound.name,
			phaseTimeInfo: {
				startDate: fundingRound.considerationPhase.startDate,
				endDate: fundingRound.considerationPhase.endDate,
			},
			totalProposals: proposals.length,
			budgetBreakdown,
			movedForwardProposals: movedForwardCount,
			notMovedForwardProposals: notMovedForwardCount,
			proposalVotes: proposals,
		}
	}

	async getProposalsStatusCounts(
		fundingRoundId: string,
	): Promise<ConsiderationProposalsCounts> {
		const proposals = await this.prisma.proposal.findMany({
			where: {
				fundingRoundId,
				status: { in: ['CONSIDERATION', 'DELIBERATION'] },
			},
			include: {
				considerationVotes: {
					select: {
						voter: {
							select: {
								id: true,
								linkId: true,
							},
						},
						decision: true,
						feedback: true,
					},
				},
				OCVConsiderationVote: {
					select: {
						voteData: true,
					},
				},
			},
		})

		const statusMoveService = new ProposalStatusMoveService(this.prisma)
		const minReviewerApprovals = statusMoveService.minReviewerApprovals

		const proposalVoteCounts = proposals.reduce(
			(acc, proposal) => {
				const allVotes = proposal.considerationVotes
				const approved = allVotes.filter(v => v.decision === 'APPROVED').length
				const rejected = allVotes.filter(v => v.decision === 'REJECTED').length
				const ocvVotes = this.parseOCVVoteData(
					proposal.OCVConsiderationVote?.voteData,
				)

				// TODO: ensure this logic is right to our business rules

				const communityVoteEligible = ocvVotes.elegible
				const reviewerVoteEligible = approved >= minReviewerApprovals
				const isEligible = communityVoteEligible || reviewerVoteEligible
				const isRejected = rejected >= minReviewerApprovals

				if (isEligible) {
					acc.approved++
				} else if (isRejected) {
					acc.rejected++
				} else {
					acc.pending++
				}

				acc.total++

				return acc
			},
			{ total: 0, approved: 0, rejected: 0, pending: 0 },
		)

		return proposalVoteCounts
	}

	async getProposalsWithVotes(
		fundingRoundId: string,
		user: { id: string; linkId: string },
		options?: GetConsiderationProposalsOptions,
	): Promise<ConsiderationProposal[]> {
		try {
			// Validate options if provided
			const parsedOptions = options
				? getConsiderationProposalsOptionsSchema.parse(options)
				: { query: null, filterBy: null, sortBy: 'status', sortOrder: 'asc' }

			const fundingRoundService = new FundingRoundService(this.prisma)

			const isReviewerEligible = await fundingRoundService.isReviewer(
				{
					id: user.id,
					linkId: user.linkId,
				},
				fundingRoundId,
			)

			const proposals = await this.prisma.proposal.findMany({
				where: {
					fundingRoundId,
					status: { in: ['CONSIDERATION', 'DELIBERATION'] },
					...(options?.query
						? { title: { contains: options.query, mode: 'insensitive' } }
						: {}),
				},
				include: {
					user: {
						select: {
							id: true,
							linkId: true,
							metadata: true,
						},
					},
					considerationVotes: {
						select: {
							voter: {
								select: {
									id: true,
									linkId: true,
								},
							},
							decision: true,
							feedback: true,
						},
					},
					OCVConsiderationVote: {
						select: {
							voteData: true,
						},
					},
				},
			})

			const statusMoveService = new ProposalStatusMoveService(this.prisma)
			const minReviewerApprovals = statusMoveService.minReviewerApprovals

			let proposalVoteCounts: ConsiderationProposal[] = proposals.map(
				proposal => {
					const allVotes = proposal.considerationVotes
					const userVotes = allVotes.filter(
						v => v.voter.id === user.id || v.voter.linkId === user.linkId,
					)

					const approved = allVotes.filter(
						v => v.decision === 'APPROVED',
					).length
					const rejected = allVotes.filter(
						v => v.decision === 'REJECTED',
					).length
					const ocvVotes = this.parseOCVVoteData(
						proposal.OCVConsiderationVote?.voteData,
					)

					const communityVote: CommunityVoteStats = {
						total: ocvVotes.total_community_votes,
						positive: ocvVotes.total_positive_community_votes,
						positiveStakeWeight: ocvVotes.positive_stake_weight ?? '0',
						isEligible: ocvVotes.elegible,
						voters: (ocvVotes.votes ?? []).map((vote: OCVVote) => ({
							address: vote.account,
							timestamp: vote.timestamp,
							hash: vote.hash,
							height: vote.height,
							status: vote.status,
						})),
					}

					const reviewerVote: ReviewerVoteStats = {
						approved,
						rejected,
						total: approved + rejected,
						requiredReviewerApprovals: minReviewerApprovals,
						isEligible: approved >= minReviewerApprovals,
					}

					const voteStats: ConsiderationVoteStats = {
						communityVote,
						reviewerVote,
						isEligible: communityVote.isEligible || reviewerVote.isEligible,
					}

					return {
						id: proposal.id,
						title: proposal.title,
						summary: proposal.proposalSummary,
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
						estimatedCompletionDate:
							proposal.estimatedCompletionDate.toISOString(),
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

						userVote: userVotes[0]
							? {
									decision: userVotes[0].decision,
									feedback: userVotes[0].feedback,
								}
							: null,

						status: userVotes[0]?.decision || 'PENDING',
						currentPhase: proposal.status,

						voteStats,

						isReviewerEligible,
					}
				},
			)

			// Apply filtering based on filterBy
			if (parsedOptions.filterBy && parsedOptions.filterBy !== 'all') {
				proposalVoteCounts = proposalVoteCounts.filter(proposal => {
					console.log(proposal.status)
					switch (parsedOptions.filterBy) {
						case 'approved':
							return proposal.status === 'APPROVED'
						case 'rejected':
							return proposal.status === 'REJECTED'
						case 'pending':
							return proposal.status === 'PENDING'
						default:
							return true
					}
				})
			}

			// Apply sorting based on sortBy and sortOrder
			if (parsedOptions.sortBy) {
				proposalVoteCounts.sort((a, b) => {
					const order = parsedOptions.sortOrder === 'desc' ? -1 : 1

					if (parsedOptions.sortBy === 'createdAt') {
						return (
							order *
							(new Date(a.createdAt).getTime() -
								new Date(b.createdAt).getTime())
						)
					}

					if (parsedOptions.sortBy === 'status') {
						// Custom status sorting: CONSIDERATION (PENDING first), then DELIBERATION
						if (
							a.currentPhase === 'CONSIDERATION' &&
							b.currentPhase === 'DELIBERATION'
						)
							return -order
						if (
							a.currentPhase === 'DELIBERATION' &&
							b.currentPhase === 'CONSIDERATION'
						)
							return order
						if (a.currentPhase === b.currentPhase) {
							if (a.status === 'PENDING' && b.status !== 'PENDING')
								return -order
							if (a.status !== 'PENDING' && b.status === 'PENDING') return order
							// If both are voted or both are PENDING, maintain original order or sort alphabetically
							return a.status.localeCompare(b.status) * order
						}
						return 0
					}

					return 0
				})
			}

			return proposalVoteCounts
		} catch (error) {
			console.error('Error fetching proposals with votes:', error)
			throw new Error('Failed to retrieve proposal vote data')
		}
	}

	private parseOCVVoteData(data: JsonValue | null | undefined): OCVVoteData {
		const defaultData: OCVVoteData = {
			total_community_votes: 0,
			total_positive_community_votes: 0,
			positive_stake_weight: '0',
			elegible: false,
			votes: [],
		}

		if (!data || typeof data !== 'object') {
			return defaultData
		}

		const voteData = data as Record<string, unknown>

		return {
			total_community_votes:
				typeof voteData.total_community_votes === 'number'
					? voteData.total_community_votes
					: 0,
			total_positive_community_votes:
				typeof voteData.total_positive_community_votes === 'number'
					? voteData.total_positive_community_votes
					: 0,
			positive_stake_weight:
				typeof voteData.positive_stake_weight === 'string'
					? voteData.positive_stake_weight
					: '0',
			elegible: Boolean(voteData.elegible),
			votes: Array.isArray(voteData.votes) ? voteData.votes : [],
		}
	}
}
