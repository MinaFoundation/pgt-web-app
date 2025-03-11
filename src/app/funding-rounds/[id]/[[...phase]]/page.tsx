import Link from 'next/link'
import {
	FundingRoundPhase,
	FundingRoundWithPhases,
} from '@/types/funding-round'
import { CompletedPhase } from '@/components/phases/CompletedPhase'
import { VotingPhase } from '@/components/phases/VotingPhase'
import { DeliberationPhase } from '@/components/phases/DeliberationPhase'
import { ConsiderationPhase } from '@/components/phases/ConsiderationPhase'
import { SubmissionPhase } from '@/components/phases/SubmissionPhase'
import { BetweenPhases } from '@/components/phases/BetweenPhases'
import {
	ArrowLeftIcon,
	ChartNoAxesCombined,
	CheckCheckIcon,
	CircleHelpIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FundingRoundService } from '@/services'
import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import {
	formatDate,
	getPreviousAndNextForBetweenPhase,
} from '@/lib/funding-round-utils'
import { PhaseTimeline } from '@/components/funding-rounds/PhaseTimeline'
import { FundingRoundStatusOverviewCards } from '@/components/funding-rounds/FundingRoundOverviewCards'
import { Metadata } from 'next'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'

export const dynamic = 'force-dynamic'

const FUNDING_ROUND_PHASES: Exclude<FundingRoundPhase, 'UPCOMING'>[] = [
	'SUBMISSION',
	'CONSIDERATION',
	'DELIBERATION',
	'VOTING',
	'COMPLETED',
	'BETWEEN_PHASES',
]

const getFundingRoundById = async (
	id: string,
): Promise<FundingRoundWithPhases> => {
	const fundingRoundService = new FundingRoundService(prisma)
	const fundingRound = await fundingRoundService.getFundingRoundById(id)
	if (!fundingRound) return notFound()
	return fundingRound
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>
}): Promise<Metadata> {
	const { id } = await params

	const data = await getFundingRoundById(id)

	return {
		title: `${data.name} | Funding Round | MEF`,
		description: data.description,
	}
}

export default async function FundingRoundDashboard({
	params,
}: {
	params: Promise<{ id: string; phase: string }>
}) {
	const { id, phase: phaseParams } = await params

	if (phaseParams?.length > 1) {
		return notFound()
	}

	const { data: phase, success } = z
		.enum([
			'submission',
			'consideration',
			'deliberation',
			'voting',
			'completed',
			'between_phases',
		])
		.optional()
		.safeParse(phaseParams?.[0])

	if (!success) {
		return notFound()
	}

	const data = await getFundingRoundById(id)

	// TODO: This is a temporary fix to handle the case where the funding round is upcoming
	if (data.phase === 'UPCOMING') {
		return <div>Upcoming</div>
	}

	const previousOrCurrentActivePhase =
		data.phase === 'BETWEEN_PHASES'
			? getPreviousAndNextForBetweenPhase(data.phases).previousPhase?.name
			: data.phase

	// Check if the provided phase param is active or completed
	const isPhaseFinished =
		!!phase &&
		!!previousOrCurrentActivePhase &&
		previousOrCurrentActivePhase !== 'UPCOMING' &&
		(phase === 'between_phases' ||
			FUNDING_ROUND_PHASES.indexOf(previousOrCurrentActivePhase) >
				FUNDING_ROUND_PHASES.indexOf(
					phase.toUpperCase() as Exclude<FundingRoundPhase, 'UPCOMING'>,
				))

	const isPhaseActive = data.phase.toLowerCase() === phase

	if (!isPhaseFinished && !isPhaseActive) {
		redirect(`/funding-rounds/${id}/${data.phase.toLowerCase()}`)
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
					<PhaseTimeline
						data={data}
						selectedPhase={
							phase.toUpperCase() as Exclude<FundingRoundPhase, 'UPCOMING'>
						}
					/>

					{/* Content Area */}
					{isPhaseFinished ? (
						<FinishedPhase id={data.id} phase={phase} />
					) : (
						<FundingRoundPhaseComponent data={data} />
					)}
				</div>

				{/* Help Link */}
				<footer className="flex justify-center md:justify-end">
					<Link
						href={phase in faqLinks ? faqLinks[phase] : '/how-it-works'}
						className="flex items-center gap-1 text-secondary hover:underline"
					>
						<CircleHelpIcon className="h-4 w-4" />
						Feeling lost? Check How it Works
					</Link>
				</footer>
			</div>
		</div>
	)
}

const faqLinks: { [key: string]: string } = {
	submission: '/how-it-works#proposal-creation-and-submission',
	consideration: '/how-it-works#proposal-consideration-phase',
	deliberation: '/how-it-works#proposal-deliberation-during-a-funding-round',
	voting: '/how-it-works#proposal-voting-during-a-funding-round',
}

function FinishedPhase({ id, phase }: { id: string; phase: string }) {
	const capitalizedPhase =
		phase.charAt(0).toUpperCase() + phase.slice(1).toLowerCase()

	return (
		<div className="space-y-8">
			<div>
				<h2 className="text-2xl font-bold">{capitalizedPhase} Phase</h2>
				<Badge variant="success" className="mt-2">
					Completed <CheckCheckIcon className="ml-1 h-4 w-4" />
				</Badge>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>{capitalizedPhase} Summary</CardTitle>
					<CardDescription>
						{capitalizedPhase} phase has been successfully completed.
						Congratulations to all participants!
					</CardDescription>
				</CardHeader>
				<CardFooter>
					<Link href={`/funding-rounds/${id}/${phase.toLowerCase()}/summary`}>
						<Button>
							<ChartNoAxesCombined className="mr-1 h-4 w-4" /> View Summary
						</Button>
					</Link>
				</CardFooter>
			</Card>
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
			return <SubmissionPhase fundingRoundId={data.id} />
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
