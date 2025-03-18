import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import logger from '@/logging'
import { ProposalStatusMoveService } from '@/services/ProposalStatusMoveService'
import type { ConsiderationProposal, VoteStats } from '@/types/consideration'
import { ConsiderationVotingService, FundingRoundService } from '@/services'
import { considerationOptionsSchema } from '@/schemas/consideration'

class VoteStatsEmpty {
	/**
	 * Returns default vote statistics when actual data is not available
	 * @param minReviewerApprovals The minimum required reviewer approvals
	 * @param actualStats The actual vote statistics if available
	 * @param proposalId Optional ID for logging purposes
	 * @returns VoteStats object with default or actual values
	 */
	static getVoteStats(
		minReviewerApprovals: number,
		actualStats?: VoteStats,
		proposalId?: number,
	): VoteStats {
		if (actualStats) {
			return actualStats
		}

		logger.debug(
			proposalId
				? `Using default vote stats for proposal #${proposalId}`
				: 'Using default vote stats for a proposal',
		)

		return {
			approved: 0,
			rejected: 0,
			total: 0,
			communityVotes: {
				total: 0,
				positive: 0,
				positiveStakeWeight: '0',
				isEligible: false,
				voters: [],
			},
			reviewerEligible: false,
			requiredReviewerApprovals: minReviewerApprovals,
		}
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const fundingRoundId = (await params).id

		// TODO: implement filters and sorting
		const { data: { query, filterBy, sortBy, sortOrder } = {}, error } =
			considerationOptionsSchema.safeParse({
				query: request.nextUrl.searchParams.get('query'),
				sortBy: request.nextUrl.searchParams.get('sortBy'),
				sortOrder: request.nextUrl.searchParams.get('sortOrder'),
			})

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}

		const user = await getOrCreateUserFromRequest(request)
		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const fundingRoundService = new FundingRoundService(prisma)

		const isReviewer = await fundingRoundService.isReviewer(
			{
				id: user.id,
				linkId: user.linkId,
			},
			fundingRoundId,
		)

		const statusMoveService = new ProposalStatusMoveService(prisma)
		const minReviewerApprovals = statusMoveService.minReviewerApprovals

		const considerationVotingService = new ConsiderationVotingService(prisma)

		const proposalsWithVotes =
			await considerationVotingService.getProposalsWithVotes(
				fundingRoundId,
				user.id,
			)

		const formattedProposals: ConsiderationProposal[] = proposalsWithVotes.map(
			p => ({
				id: p.id,
				title: p.title,
				submitter: p.user.username,
				summary: p.summary,
				status: p.userVote?.decision || 'PENDING',
				problemImportance: p.problemImportance,
				problemStatement: p.problemStatement,
				proposedSolution: p.proposedSolution,
				implementationDetails: p.implementationDetails,
				totalFundingRequired: p.totalFundingRequired,
				keyObjectives: p.keyObjectives,
				communityBenefits: p.communityBenefits,
				keyPerformanceIndicators: p.keyPerformanceIndicators,
				budgetBreakdown: p.budgetBreakdown,
				estimatedCompletionDate: p.estimatedCompletionDate,
				milestones: p.milestones,
				teamMembers: p.teamMembers,
				relevantExperience: p.relevantExperience,
				potentialRisks: p.potentialRisks,
				mitigationPlans: p.mitigationPlans,
				discordHandle: p.discordHandle,
				email: p.email,
				website: p.website,
				githubProfile: p.githubProfile,
				otherLinks: p.otherLinks,
				createdAt: p.createdAt,
				updatedAt: p.updatedAt,
				userVote: p.userVote || null,
				isReviewerEligible: isReviewer,
				user: {
					id: p.user.id,
					linkId: p.user.linkId,
					username: p.user.username,
				},
				voteStats: VoteStatsEmpty.getVoteStats(
					minReviewerApprovals,
					p.voteStats,
					p.id,
				),
				currentPhase: p.status,
			}),
		)

		// Sort proposals:
		// 1. Consideration phase pending first
		// 2. Consideration phase voted
		// 3. Deliberation phase
		const sortedProposals = formattedProposals.sort((a, b) => {
			if (
				a.currentPhase === 'CONSIDERATION' &&
				b.currentPhase === 'DELIBERATION'
			)
				return -1
			if (
				a.currentPhase === 'DELIBERATION' &&
				b.currentPhase === 'CONSIDERATION'
			)
				return 1
			if (a.currentPhase === b.currentPhase) {
				if (a.status === 'PENDING' && b.status !== 'PENDING') return -1
				if (a.status !== 'PENDING' && b.status === 'PENDING') return 1
			}
			return 0
		})

		return NextResponse.json(sortedProposals)
	} catch (error) {
		logger.error('Failed to fetch consideration proposals:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		)
	}
}
