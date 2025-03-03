import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import { ProposalStatus, Prisma } from '@prisma/client'
import logger from '@/logging'
import { UserMetadata } from '@/services/UserService'
import { UserService } from '@/services'

export interface SubmittedProposalsJSON {
	id: number
	title: string
	proposalSummary: string
	keyObjectives: string
	problemStatement: string
	problemImportance: string
	proposedSolution: string
	implementationDetails: string
	totalFundingRequired: Prisma.Decimal
	communityBenefits: string
	keyPerformanceIndicators: string
	budgetBreakdown: string
	milestones: string
	estimatedCompletionDate: Date
	teamMembers: string
	relevantExperience: string
	potentialRisks: string
	mitigationPlans: string
	discordHandle: string
	email: string
	website?: string | null
	githubProfile?: string | null
	otherLinks?: string | null
	createdAt: Date
	status: ProposalStatus
	submitter: string
	submitterMetadata: {
		authSource: {
			type: string
			id: string
			username: string
		}
		linkedAccounts?: Array<{
			id: string
			authSource: {
				type: string
				id: string
				username: string
			}
		}>
	}
}

// Type for the raw proposal from database
interface RawProposal {
	id: number
	title: string
	proposalSummary: string
	keyObjectives: string
	problemStatement: string
	problemImportance: string
	proposedSolution: string
	implementationDetails: string
	totalFundingRequired: Prisma.Decimal
	communityBenefits: string
	keyPerformanceIndicators: string
	budgetBreakdown: string
	milestones: string
	estimatedCompletionDate: Date
	teamMembers: string
	relevantExperience: string
	potentialRisks: string
	mitigationPlans: string
	discordHandle: string
	email: string
	website?: string | null
	githubProfile?: string | null
	otherLinks?: string | null
	createdAt: Date
	status: ProposalStatus
	user: {
		id: string
		metadata: Prisma.JsonValue
	}
}

// Type guard to check if the metadata has the required username field
function hasUsername(
	metadata: Prisma.JsonValue,
): metadata is { username: string } {
	return (
		typeof metadata === 'object' &&
		metadata !== null &&
		'username' in metadata &&
		typeof (metadata as { username: string }).username === 'string'
	)
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getOrCreateUserFromRequest(request)
		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const fundingRoundId = (await params).id
		const userService = new UserService(prisma)

		// Get all proposals for this funding round
		const proposals = await prisma.proposal.findMany({
			where: {
				fundingRoundId,
				status: ProposalStatus.CONSIDERATION,
			},
			include: {
				user: {
					select: {
						id: true,
						metadata: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		// Transform the proposals to include user information
		const formattedProposals = await Promise.all(
			proposals.map(
				async (proposal: RawProposal): Promise<SubmittedProposalsJSON> => {
					const linkedAccounts = await userService.getLinkedAccounts(
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
						otherLinks: proposal.otherLinks,
						createdAt: proposal.createdAt,
						status: proposal.status,
						submitter: hasUsername(proposal.user.metadata)
							? proposal.user.metadata.username
							: 'Unknown',
						submitterMetadata: {
							authSource: {
								type:
									(proposal.user.metadata as UserMetadata)?.authSource?.type ||
									'',
								id:
									(proposal.user.metadata as UserMetadata)?.authSource?.id ||
									'',
								username:
									(proposal.user.metadata as UserMetadata)?.authSource
										?.username || '',
							},
							linkedAccounts: linkedAccountsMetadata,
						},
					}
				},
			),
		)

		return NextResponse.json(formattedProposals)
	} catch (error) {
		logger.error('Failed to fetch proposals:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		)
	}
}
