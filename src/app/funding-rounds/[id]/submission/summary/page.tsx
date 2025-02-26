import { type FC } from 'react'
import { notFound } from 'next/navigation'
import { SubmissionPhaseSummary } from '@/components/phase-summary/SubmissionPhaseSummary'
import { prisma } from '@/lib/prisma'
import { type SubmissionPhaseSummary as SubmissionPhaseSummaryType } from '@/types/phase-summary'
import { UserMetadata } from '@/services'

type Props = {
	params: Promise<{
		id: string
	}>
}

const getSubmissionPhaseSummary = async (
	fundingRoundId: string,
): Promise<SubmissionPhaseSummaryType> => {
	const fundingRound = await prisma.fundingRound.findUnique({
		where: { id: fundingRoundId },
		include: {
			submissionPhase: true,
			proposals: {
				include: {
					user: true,
				},
				orderBy: { createdAt: 'desc' },
			},
		},
	})

	if (!fundingRound || !fundingRound.submissionPhase) {
		notFound()
	}

	// Get all proposals that are not in DRAFT status
	const submittedProposals = fundingRound.proposals.filter(
		p => p.status !== 'DRAFT',
	)

	// Get all proposals in DRAFT status
	const draftProposals = fundingRound.proposals.filter(
		p => p.status === 'DRAFT',
	)

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

	const getUserDisplayName = (metadata: UserMetadata): string => {
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

	return {
		fundingRoundName: fundingRound.name,
		phaseTimeInfo: {
			startDate: fundingRound.submissionPhase.startDate,
			endDate: fundingRound.submissionPhase.endDate,
		},
		totalProposals: fundingRound.proposals.length,
		submittedProposals: submittedProposals.length,
		draftProposals: draftProposals.length,
		budgetBreakdown,
		proposalVotes: submittedProposals.map(proposal => ({
			id: proposal.id,
			title: proposal.title,
			proposer: getUserDisplayName(proposal.user.metadata as UserMetadata),
			status: proposal.status,
			totalFundingRequired: proposal.totalFundingRequired.toNumber(),
			submissionDate: proposal.createdAt,
		})),
	}
}

const SubmissionPhaseSummaryPage = async ({ params }: Props) => {
	const { id } = await params
	const summary = await getSubmissionPhaseSummary(id)

	return (
		<div className="container mx-auto max-w-7xl py-6">
			<SubmissionPhaseSummary summary={summary} />
		</div>
	)
}

export default SubmissionPhaseSummaryPage
