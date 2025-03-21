import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FileTextIcon, UsersIcon, VoteIcon, CoinsIcon } from 'lucide-react'
import { getPhaseStatus } from '@/lib/phase-utils'
import { type PhaseStatus } from '@/types/phase-summary'
import { type Metadata } from 'next'
import { PhaseSummaryCard } from '@/components/funding-rounds/PhaseSummaryCard'

type MetadataProps = {
	params: Promise<{
		id: string
	}>
}

export async function generateMetadata({
	params,
}: MetadataProps): Promise<Metadata> {
	await params // We don't need the id for this metadata, but we still need to await the promise
	return {
		title: 'Phase Summaries',
		description: 'Access summaries for each phase of the funding round',
	}
}

type Props = {
	params: Promise<{
		id: string
	}>
}

interface PhaseInfo {
	title: string
	description: string
	icon: React.ReactNode
	status: PhaseStatus
	startDate: Date
	endDate: Date
	href: string
}

const getPhaseInfoWithFallback = (
	phase: {
		startDate: Date
		endDate: Date
	} | null,
	defaultDates: { startDate: Date; endDate: Date },
) => {
	if (!phase) {
		return {
			startDate: defaultDates.startDate,
			endDate: defaultDates.endDate,
			status: 'not-started' as const,
		}
	}

	return {
		startDate: phase.startDate,
		endDate: phase.endDate,
		status: getPhaseStatus({
			startDate: phase.startDate,
			endDate: phase.endDate,
		}).status,
	}
}

const PhaseSummaryDashboard = async ({ params }: Props) => {
	const { id } = await params
	const fundingRound = await prisma.fundingRound.findUnique({
		where: { id: id },
		include: {
			submissionPhase: true,
			considerationPhase: true,
			deliberationPhase: true,
			votingPhase: true,
		},
	})

	if (!fundingRound) {
		notFound()
	}

	// Default dates if phase is not set up yet
	const defaultDates = {
		startDate: new Date(),
		endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
	}

	const submissionPhaseInfo = getPhaseInfoWithFallback(
		fundingRound.submissionPhase,
		defaultDates,
	)
	const considerationPhaseInfo = getPhaseInfoWithFallback(
		fundingRound.considerationPhase,
		defaultDates,
	)
	const deliberationPhaseInfo = getPhaseInfoWithFallback(
		fundingRound.deliberationPhase,
		defaultDates,
	)
	const votingPhaseInfo = getPhaseInfoWithFallback(
		fundingRound.votingPhase,
		defaultDates,
	)

	// Post-voting phase starts when voting phase ends and continues indefinitely
	const postVotingPhaseInfo = fundingRound.votingPhase
		? {
				startDate: fundingRound.votingPhase.endDate,
				endDate: new Date('9999-12-31T23:59:59.999Z'), // Effectively infinite
				status:
					new Date() > fundingRound.votingPhase.endDate
						? ('ongoing' as const)
						: ('not-started' as const),
			}
		: {
				startDate: defaultDates.endDate, // If no voting phase, start after default end
				endDate: new Date('9999-12-31T23:59:59.999Z'),
				status: 'not-started' as const,
			}

	const phases: PhaseInfo[] = [
		{
			title: 'Submission Phase',
			description: 'Overview of submitted proposals and their distribution',
			icon: <FileTextIcon className="h-5 w-5 text-blue-500" />,
			...submissionPhaseInfo,
			href: `/funding-rounds/${id}/submission/summary`,
		},
		{
			title: 'Consideration Phase',
			description: 'Review of proposals by reviewers and community',
			icon: <UsersIcon className="h-5 w-5 text-purple-500" />,
			...considerationPhaseInfo,
			href: `/funding-rounds/${id}/consideration/summary`,
		},
		{
			title: 'Deliberation Phase',
			description: 'Final review and recommendations',
			icon: <VoteIcon className="h-5 w-5 text-emerald-500" />,
			...deliberationPhaseInfo,
			href: `/funding-rounds/${id}/deliberation/summary`,
		},
		{
			title: 'Voting Phase Ranked Results',
			description: 'Overview of the ranked voting results',
			icon: <VoteIcon className="h-5 w-5 text-emerald-500" />,
			...votingPhaseInfo,
			href: `/funding-rounds/${id}/voting/summary`,
		},
		{
			title: 'Voting Phase Funds Distribution',
			description: 'Funds distribution for the voting phase',
			icon: <CoinsIcon className="h-5 w-5 text-amber-500" />,
			...postVotingPhaseInfo,
			href: `/funding-rounds/${id}/voting-funds/summary`,
		},
	]

	return (
		<div className="container mx-auto max-w-7xl py-6">
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Phase Summaries</h1>
					<p className="text-muted-foreground">
						Access summaries for each phase of the funding round
					</p>
				</div>
				<div className="grid gap-6">
					{phases.map(phase => (
						<PhaseSummaryCard key={phase.title} {...phase} />
					))}
				</div>
			</div>
		</div>
	)
}

export default PhaseSummaryDashboard
