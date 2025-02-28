// src/services/ConsiderationVotingService.ts

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
import { OCVVote } from '@/types'

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

interface ProposalWithVotes {
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
		const currentPhase = this.fundingRoundService.getCurrentPhase(
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
}
