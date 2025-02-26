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
	totalFundingRequired: Prisma.Decimal
	createdAt: Date
	status: ProposalStatus
	submitter: string
	problemImportance: string
	problemStatement: string
	implementationDetails: string
	potentialRisks: string
	email: string
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
	totalFundingRequired: Prisma.Decimal
	createdAt: Date
	status: ProposalStatus
	problemImportance: string
	problemStatement: string
	implementationDetails: string
	potentialRisks: string
	email: string
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
						totalFundingRequired: proposal.totalFundingRequired,
						createdAt: proposal.createdAt,
						status: proposal.status,
						submitter: hasUsername(proposal.user.metadata)
							? proposal.user.metadata.username
							: 'Unknown',
						problemStatement: proposal.problemStatement,
						problemImportance: proposal.problemImportance,
						implementationDetails: proposal.implementationDetails,
						potentialRisks: proposal.potentialRisks,
						email: proposal.email,
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
