import { PrismaClient } from '@prisma/client'
import { OCVApiService } from './OCVApiService'
import {
	RankedVotingProposalVote,
	VoteStatus,
	VotingProposalVote,
	type VotingPhaseFundsDistributionSummary,
	type VotingPhaseRankedSummary,
} from '@/types/phase-summary'
import { UserMetadata } from '.'
import logger from '@/logging'

export class VotingService {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly ocvService: OCVApiService = new OCVApiService(),
	) {}

	async getVotingPhaseFundsDistributionSummary(
		fundingRoundId: string,
	): Promise<VotingPhaseFundsDistributionSummary> {
		const fundingRound = await this.prisma.fundingRound.findUnique({
			where: { id: fundingRoundId },
			include: {
				votingPhase: true,
				proposals: {
					include: {
						user: {
							select: {
								metadata: true,
							},
						},
					},
					where: {
						status: {
							in: ['DELIBERATION', 'VOTING', 'APPROVED', 'REJECTED'],
						},
					},
				},
			},
		})

		if (!fundingRound || !fundingRound.votingPhase) {
			throw new Error('Funding round or voting phase not found')
		}

		// Get ranked votes from OCV API
		const voteData = await this.ocvService.getRankedVotes(fundingRound.mefId)

		// Calculate funding distribution
		const totalBudget = fundingRound.totalBudget.toNumber()
		let remainingBudget = totalBudget
		const proposalVotes: VotingProposalVote[] = []
		let fundedProposals = 0
		let notFundedProposals = 0

		// Use a set to track processed proposals to avoid duplicates
		const processedProposals = new Set<string>()
		// Process proposals from OCV in the order provided, ensuring each proposal is processed once
		for (const winnerId of voteData.winners) {
			const idStr = String(winnerId)
			if (processedProposals.has(idStr)) continue
			const proposal = fundingRound.proposals.find(p => String(p.id) === idStr)
			if (!proposal) {
				logger.warn(`[VotingService] Proposal with id ${idStr} not found`)
				continue
			}
			processedProposals.add(idStr)

			const budgetRequest = proposal.totalFundingRequired.toNumber()
			const isFunded = budgetRequest <= remainingBudget

			if (isFunded) {
				remainingBudget -= budgetRequest
				fundedProposals++
			} else {
				notFundedProposals++
			}

			proposalVotes.push({
				id: proposal.id,
				title: proposal.title,
				proposer: this.getUserDisplayName(
					proposal.user.metadata as UserMetadata,
				),
				status: proposal.status,
				totalFundingRequired: proposal.totalFundingRequired.toNumber(),
				isFunded,
				missingAmount: isFunded ? undefined : budgetRequest - remainingBudget,
			})
		}

		// Process remaining proposals not referenced by OCV
		for (const proposal of fundingRound.proposals) {
			const idStr = String(proposal.id)
			if (!processedProposals.has(idStr)) {
				processedProposals.add(idStr)
				notFundedProposals++
				proposalVotes.push({
					id: proposal.id,
					title: proposal.title,
					proposer: this.getUserDisplayName(
						proposal.user.metadata as UserMetadata,
					),
					status: proposal.status,
					totalFundingRequired: proposal.totalFundingRequired.toNumber(),
					isFunded: false,
					missingAmount: proposal.totalFundingRequired.toNumber(),
				})
			}
		}

		// Calculate budget breakdown
		const budgetBreakdown = fundingRound.proposals.reduce(
			(acc, proposal) => {
				const budget = proposal.totalFundingRequired.toNumber()
				if (budget <= 500) acc.small++
				else if (budget <= 1000) acc.medium++
				else acc.large++
				return acc
			},
			{ small: 0, medium: 0, large: 0 },
		)

		return {
			fundingRoundName: fundingRound.name,
			phaseTimeInfo: {
				startDate: fundingRound.votingPhase.endDate,
				endDate: new Date('9999-12-31T23:59:59.999Z'), // for now, avaialbe forever - to be adjusted later
			},
			totalProposals: fundingRound.proposals.length,
			fundedProposals,
			notFundedProposals,
			totalBudget,
			remainingBudget,
			budgetBreakdown,
			proposalVotes,
			votes: voteData.votes.map(ocvVote => ({
				account: ocvVote.account,
				hash: ocvVote.hash,
				memo: ocvVote.memo,
				height: ocvVote.height,
				status: ocvVote.status as VoteStatus, // if necessary, cast status to VoteStatus type
				timestamp: ocvVote.timestamp,
				nonce: ocvVote.nonce,
			})),
		}
	}

	async getVotingPhaseRankedSummary(
		fundingRoundId: string,
	): Promise<VotingPhaseRankedSummary> {
		const fundingRound = await this.prisma.fundingRound.findUnique({
			where: { id: fundingRoundId },
			include: {
				votingPhase: true,
				proposals: {
					include: {
						user: {
							select: {
								metadata: true,
							},
						},
					},
					where: {
						status: {
							in: ['DELIBERATION', 'VOTING', 'APPROVED', 'REJECTED'],
						},
					},
				},
			},
		})

		if (!fundingRound || !fundingRound.votingPhase) {
			throw new Error('Funding round or voting phase not found')
		}

		// Get ranked votes from OCV API
		const voteData = await this.ocvService.getRankedVotes(fundingRound.mefId)
		console.log('votes', voteData.votes, fundingRound.mefId)

		// Calculate budget breakdown
		const budgetBreakdown = fundingRound.proposals.reduce(
			(acc, proposal) => {
				const budget = proposal.totalFundingRequired.toNumber()
				if (budget <= 500) acc.small++
				else if (budget <= 1000) acc.medium++
				else acc.large++
				return acc
			},
			{ small: 0, medium: 0, large: 0 },
		)

		// Process proposals with votes first
		const processedProposals = new Set<string>()
		const proposalVotes: RankedVotingProposalVote[] = []

		// Process proposals from OCV in the order provided (these are already ranked)
		for (const winnerId of voteData.winners) {
			const idStr = String(winnerId)
			if (processedProposals.has(idStr)) continue
			const proposal = fundingRound.proposals.find(p => String(p.id) === idStr)
			if (!proposal) {
				logger.warn(`[VotingService] Proposal with id ${idStr} not found`)
				continue
			}
			processedProposals.add(idStr)

			proposalVotes.push({
				id: proposal.id,
				title: proposal.title,
				proposer: this.getUserDisplayName(
					proposal.user.metadata as UserMetadata,
				),
				status: 'VOTING' as const,
				totalFundingRequired: proposal.totalFundingRequired.toNumber(),
				hasVotes: true,
			})
		}

		// Process remaining proposals not referenced by OCV (add them at the end)
		for (const proposal of fundingRound.proposals) {
			const idStr = String(proposal.id)
			if (!processedProposals.has(idStr)) {
				processedProposals.add(idStr)
				proposalVotes.push({
					id: proposal.id,
					title: proposal.title,
					proposer: this.getUserDisplayName(
						proposal.user.metadata as UserMetadata,
					),
					status: 'NO_VOTES' as const,
					totalFundingRequired: proposal.totalFundingRequired.toNumber(),
					hasVotes: false,
				})
			}
		}

		return {
			fundingRoundName: fundingRound.name,
			phaseTimeInfo: {
				startDate: fundingRound.votingPhase.startDate,
				endDate: fundingRound.votingPhase.endDate,
			},
			totalProposals: fundingRound.proposals.length,
			totalVotes: voteData.total_votes,
			budgetBreakdown,
			proposalVotes,
			votes: voteData.votes.map(ocvVote => ({
				account: ocvVote.account,
				hash: ocvVote.hash,
				memo: ocvVote.memo,
				height: ocvVote.height,
				status: ocvVote.status as VoteStatus,
				timestamp: ocvVote.timestamp,
				nonce: ocvVote.nonce,
			})),
		}
	}

	private getUserDisplayName(metadata: UserMetadata): string {
		try {
			if (typeof metadata === 'string') {
				const parsed = JSON.parse(metadata)
				return parsed.username || 'Anonymous'
			}
			if (metadata && typeof metadata === 'object') {
				return metadata.username || 'Anonymous'
			}
			return 'Anonymous'
		} catch (e) {
			return 'Anonymous'
		}
	}
}
