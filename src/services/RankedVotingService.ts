import { PrismaClient, ProposalStatus } from '@prisma/client'
import { UserMetadata } from '@/services/UserService'
import { OCVVoteData, OCVVote } from '@/types/consideration'

export interface RankedProposalAPIResponse {
	id: number
	title: string
	reviewerVoteCount: number
	status: ProposalStatus
	totalFundingRequired: number
	abstract: string
	mefId: number
	author: {
		username: string
		authType: 'discord' | 'wallet'
		id: string
	}
	reviewerVotes: {
		approved: number
		rejected: number
		total: number
	}
	communityVotes: {
		positiveStakeWeight: string
		totalVotes: number
	}
}

export interface GetRankedEligibleProposalsAPIResponse {
	proposals: RankedProposalAPIResponse[]
	fundingRound: {
		id: string
		name: string
		mefId: number
		votingPhase: {
			startDate: Date
			endDate: Date
		} | null
	}
}

export class RankedVotingService {
	constructor(private prisma: PrismaClient) {}

	/**
	 * Manual type-safe parsing of OCVVoteData. There is a way to improve it, but for now
	 * keeping it as it.
	 * DO NOT EXPORT THIS. If needed again, refactor.
	 * @param data data to parse
	 * @returns
	 */
	private isOCVVoteData(data: unknown): data is OCVVoteData {
		if (!data || typeof data !== 'object') return false
		const d = data as Record<string, unknown>
		return (
			typeof d.total_community_votes === 'number' &&
			typeof d.total_positive_community_votes === 'number' &&
			typeof d.positive_stake_weight === 'string' &&
			typeof d.elegible === 'boolean' &&
			Array.isArray(d.votes) &&
			d.votes.every(
				v =>
					typeof v === 'object' &&
					v !== null &&
					typeof (v as OCVVote).account === 'string' &&
					typeof (v as OCVVote).timestamp === 'number' &&
					typeof (v as OCVVote).hash === 'string',
			)
		)
	}

	static Formatter = {
		formatRankedVoteMemoConsideration: (proposalIds: number[]): string => {
			return `YES ${proposalIds.join(' ')}`
		},

		formatRankedVoteMemoVoting: (
			fundingRoundMEFId: number,
			proposalIds: number[],
		): string => {
			// the format is MEF <round number> <project_id1> ... <project_idn>
			return `MEF ${fundingRoundMEFId} ${proposalIds.join(' ')}`
		},
	}

	async getEligibleProposals(
		fundingRoundId: string,
	): Promise<GetRankedEligibleProposalsAPIResponse> {
		const result = await this.prisma.fundingRound.findUnique({
			where: { id: fundingRoundId },
			select: {
				name: true,
				mefId: true,
				votingPhase: {
					select: {
						startDate: true,
						endDate: true,
					},
				},
				proposals: {
					where: { status: 'DELIBERATION' },
					select: {
						id: true,
						title: true,
						status: true,
						proposalSummary: true,
						totalFundingRequired: true,
						user: {
							select: {
								metadata: true,
								linkId: true,
							},
						},
						deliberationReviewerVotes: {
							select: {
								id: true,
								recommendation: true,
							},
						},
						OCVConsiderationVote: {
							select: {
								voteData: true,
							},
						},
					},
					orderBy: {
						deliberationReviewerVotes: {
							_count: 'desc',
						},
					},
				},
			},
		})

		if (!result) {
			throw new Error('Funding round not found')
		}

		const proposals = result.proposals.map((p, index) => {
			const metadata = p.user.metadata as UserMetadata
			const authType = p.user.linkId
				? ('discord' as const)
				: ('wallet' as const)
			const approvedVotes = p.deliberationReviewerVotes.filter(
				v => v.recommendation,
			).length
			const rejectedVotes = p.deliberationReviewerVotes.filter(
				v => !v.recommendation,
			).length
			const ocvData = p.OCVConsiderationVote?.voteData
			const ocvVoteData =
				ocvData && this.isOCVVoteData(ocvData) ? ocvData : null

			const positiveStakeWeight = ocvVoteData?.positive_stake_weight ?? '0'
			const totalVotes = ocvVoteData?.total_community_votes ?? 0

			return {
				id: p.id,
				title: p.title,
				abstract: p.proposalSummary,
				reviewerVoteCount: p.deliberationReviewerVotes.length,
				status: p.status,
				totalFundingRequired: p.totalFundingRequired.toNumber(),
				mefId: result.mefId + index + 1,
				author: {
					username: metadata.username,
					authType,
					id:
						authType === 'wallet'
							? metadata.username
							: metadata.authSource?.id || '',
				},
				reviewerVotes: {
					approved: approvedVotes,
					rejected: rejectedVotes,
					total: approvedVotes + rejectedVotes,
				},
				communityVotes: {
					positiveStakeWeight: positiveStakeWeight,
					totalVotes: totalVotes,
				},
			} satisfies RankedProposalAPIResponse
		})

		return {
			proposals,
			fundingRound: {
				id: fundingRoundId,
				mefId: result.mefId,
				name: result.name,
				votingPhase: result.votingPhase,
			},
		}
	}
}
