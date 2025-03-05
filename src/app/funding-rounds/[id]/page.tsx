import Link from 'next/link'
import { FundingRoundWithPhases } from '@/types/funding-round'
import { CompletedPhase } from '@/components/phases/CompletedPhase'
import { VotingPhase } from '@/components/phases/VotingPhase'
import { DeliberationPhase } from '@/components/phases/DeliberationPhase'
import { ConsiderationPhase } from '@/components/phases/ConsiderationPhase'
import { SubmissionProposalList } from '@/components/phases/SubmissionProposalList'
import { BetweenPhases } from '@/components/phases/BetweenPhases'
import { ArrowLeftIcon, CircleHelpIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FundingRoundService } from '@/services'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import {
	formatDate,
	getPreviousAndNextForBetweenPhase,
} from '@/lib/funding-round-utils'
import { PhaseTimeline } from '@/components/funding-rounds/PhaseTimeline'
import { FundingRoundStatusOverviewCards } from '@/components/funding-rounds/FundingRoundOverviewCards'

export const dynamic = 'force-dynamic'

const getFundingRoundById = async (
	id: string,
): Promise<FundingRoundWithPhases> => {
	const fundingRoundService = new FundingRoundService(prisma)
	const fundingRound = await fundingRoundService.getFundingRoundById(id)
	if (!fundingRound) return notFound()
	return fundingRound
}

export default async function FundingRoundDashboard({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params

	const data = await getFundingRoundById(id)

	// TODO: This is a temporary fix to handle the case where the funding round is upcoming
	if (data.phase === 'UPCOMING') {
		return <div>Upcoming</div>
	}

	return (
		<div className="container mx-auto max-w-7xl px-2 lg:px-6">
			<div className="space-y-8">
				<div className="space-y-4">
					<Link href="/funding-rounds">
						<Button variant="outline">
							<ArrowLeftIcon className="h-4 w-4" /> Back to Funding Rounds
						</Button>
					</Link>
					<div>
						<h1 className="mb-1 text-3xl font-bold uppercase">
							{data.name} | Funding Round
						</h1>
						<p className="text-muted-foreground">
							From <b>{formatDate(new Date(data.startDate))}</b> to{' '}
							<b>{formatDate(new Date(data.endDate))}</b>
						</p>
					</div>
				</div>

				{/* Status Overview */}
				<FundingRoundStatusOverviewCards data={data} />

				{/* Main Content */}
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px,1fr]">
					{/* Phase Progress */}
					<PhaseTimeline data={data} />

					{/* Content Area */}
					<FundingRoundPhaseComponent data={data} />
				</div>

				{/* Help Link */}
				<footer className="flex justify-end">
					<Link
						href="/how-it-works"
						className="flex items-center gap-1 text-secondary hover:underline"
					>
						<CircleHelpIcon className="h-4 w-4" /> Feeling lost? Check How it
						Works
					</Link>
				</footer>
			</div>
		</div>
	)
}

function FundingRoundPhaseComponent({
	data,
}: {
	data: FundingRoundWithPhases
}) {
	// If we're between phases, render the BetweenPhases component
	// TODO: I hope we can remove the possibility of between phases, otherwise we need to consider moving this logic to backend
	if (data.phase === 'BETWEEN_PHASES') {
		const { nextPhase, previousPhase } = getPreviousAndNextForBetweenPhase(
			data.phases,
		)

		return (
			<BetweenPhases
				currentPhase={previousPhase?.name ?? null}
				nextPhaseStart={
					new Date(nextPhase ? nextPhase.startDate : data.endDate)
				} // If there's no next phase, it means the next funding round is completed
				nextPhaseName={nextPhase?.name || 'COMPLETED'}
			/>
		)
	}

	// Regular phase rendering
	switch (data.phase) {
		case 'SUBMISSION':
			return <SubmissionProposalList fundingRoundId={data.id} />
		case 'CONSIDERATION':
			return (
				<ConsiderationPhase
					fundingRoundId={data.id}
					fundingRoundMEFId={data.mefId}
				/>
			)
		case 'DELIBERATION':
			return <DeliberationPhase fundingRoundId={data.id} />
		case 'VOTING':
			return <VotingPhase fundingRoundId={data.id} />
		case 'COMPLETED':
			return <CompletedPhase />
		default:
			return null
	}
}
