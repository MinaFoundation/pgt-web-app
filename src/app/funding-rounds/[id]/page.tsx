'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
	FundingRoundPhase,
	FundingRoundPhases,
	FundingRoundWithPhases,
} from '@/types/funding-round'
import { CompletedPhase } from '@/components/phases/CompletedPhase'
import { VotingPhase } from '@/components/phases/VotingPhase'
import { DeliberationPhase } from '@/components/phases/DeliberationPhase'
import { ConsiderationProposalList } from '@/components/ConsiderationProposalList'
import { SubmissionProposalList } from '@/components/phases/SubmissionProposalList'
import { BetweenPhases } from '@/components/phases/BetweenPhases'
import { useFundingRound } from '@/hooks/use-funding-round'
import {
	ArrowLeftIcon,
	CircleHelpIcon,
	ClockIcon,
	CoinsIcon,
	FileTextIcon,
	TimerIcon,
} from 'lucide-react'
import { use } from 'react'
import { Button } from '@/components/ui/button'

type StartedPhase = Exclude<FundingRoundPhase, 'UPCOMING'>

const STARTED_PHASES: StartedPhase[] = [
	'SUBMISSION',
	'CONSIDERATION',
	'DELIBERATION',
	'VOTING',
	'COMPLETED',
	'BETWEEN_PHASES',
]

type StartedFundingRoundWithPhases = Omit<FundingRoundWithPhases, 'phase'> & {
	phase: StartedPhase
}

type FundingRoundDashboardProps = {
	params: Promise<{ id: string }>
}

export default function FundingRoundDashboard({
	params,
}: FundingRoundDashboardProps) {
	const { id } = use(params)
	const { data: untypedData, isLoading } = useFundingRound(id)

	if (untypedData?.phase === 'UPCOMING') {
		return <div>Upcoming</div>
	}

	const data = untypedData as StartedFundingRoundWithPhases

	if (isLoading || !data) {
		return <div>Loading...</div>
	}

	return (
		<div className="container mx-auto max-w-7xl px-2 md:px-6">
			<div className="space-y-8">
				<div className="space-y-4">
					<Link href="/funding-rounds">
						<Button variant="outline">
							<ArrowLeftIcon className="h-4 w-4" /> Back to Funding Rounds
						</Button>
					</Link>
					<h1 className="text-3xl font-bold uppercase">
						{data.name} | Funding Round
					</h1>
					<h1>
						{data.startDate} - {data.endDate}
					</h1>
				</div>

				{/* Status Overview */}
				<FundingRoundStatusOverviewCards data={data} />

				{/* Main Content */}
				<div className="grid grid-cols-1 gap-8 md:grid-cols-[200px,1fr]">
					{/* Phase Progress */}
					<PhaseTimeline data={data} />

					{/* Content Area */}
					<div className="space-y-4">
						<FundingRoundPhaseComponent data={data} />
					</div>
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

function FundingRoundStatusOverviewCards({
	data,
}: {
	data: StartedFundingRoundWithPhases
}) {
	const { nextPhase, previousPhase } = getPreviousAndNextForBetweenPhase(
		data.phases,
	)

	// TODO: When finished or started funding round, bring a custom overview

	const startedDate =
		data.phase === 'BETWEEN_PHASES'
			? new Date(previousPhase ? previousPhase.endDate : data.startDate) // If there's no previous phase, it means the funding round is just starting
			: data.phase === 'COMPLETED'
				? new Date(data.endDate)
				: new Date(
						data.phases[
							data.phase.toLowerCase() as keyof FundingRoundPhases
						].startDate,
					)

	const endDate =
		data.phase === 'BETWEEN_PHASES'
			? new Date(nextPhase ? nextPhase.startDate : data.endDate) // If there's no next phase, it means the funding round is completed
			: data.phase === 'COMPLETED'
				? new Date(data.endDate)
				: new Date(
						data.phases[
							data.phase.toLowerCase() as keyof FundingRoundPhases
						].endDate,
					)

	const cards = [
		{
			label: 'Proposals Submitted',
			value: data.proposalsCount,
			icon: FileTextIcon,
		},
		{
			label: 'Total $MINA Funding',
			value: data.totalBudget,
			icon: CoinsIcon,
		},
		{
			label: 'Until End',
			value: getTimeRemaining(endDate),
			icon: ClockIcon,
		},
		{
			label: 'In Phase',
			value: getTimeSince(startedDate),
			icon: TimerIcon,
		},
	]

	return (
		<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
			{cards.map(({ label, value, icon: Icon }) => (
				<div
					key={label}
					className="rounded-md border border-border bg-muted p-4"
				>
					<div className="flex items-center gap-2">
						<div className="rounded-full bg-secondary/20 p-2">
							<Icon className="h-6 w-6 text-secondary" />
						</div>
						<div>
							<p className="text-lg font-bold">{value}</p>
							<p className="text-sm text-muted-foreground">{label}</p>
						</div>
					</div>
				</div>
			))}
		</div>
	)
}

function PhaseTimeline({ data }: { data: StartedFundingRoundWithPhases }) {
	const timelinePhases = STARTED_PHASES.filter(
		phase => phase !== 'BETWEEN_PHASES',
	)

	const previousOrCurrentActivePhase =
		data.phase === 'BETWEEN_PHASES'
			? getPreviousAndNextForBetweenPhase(data.phases).previousPhase?.name
			: data.phase

	return (
		<div className="space-y-4">
			{timelinePhases.map((phase, index) => {
				const isActive = data.phase === phase
				const isCompleted =
					data.phase === 'COMPLETED' ||
					(previousOrCurrentActivePhase &&
						index < STARTED_PHASES.indexOf(previousOrCurrentActivePhase))

				return (
					<div key={phase as string} className="relative">
						{/* Timeline connector */}
						{index > 0 && (
							<div
								className={cn(
									'absolute -top-4 left-4 h-4 w-0.5',
									isCompleted ? 'bg-secondary' : 'bg-muted-foreground/20',
								)}
							/>
						)}

						<div
							className={cn(
								'relative rounded-md p-3 font-medium capitalize',
								isCompleted && 'bg-secondary/10 text-secondary',
								isActive && 'bg-secondary text-secondary-foreground',
								!isActive && !isCompleted && 'text-muted-foreground',
							)}
						>
							{/* Phase icon */}
							<span className="mr-2">
								{phase === 'SUBMISSION' && '📝'}
								{phase === 'CONSIDERATION' && '🤔'}
								{phase === 'DELIBERATION' && '💭'}
								{phase === 'VOTING' && '🗳️'}
								{phase === 'COMPLETED' && '🏁'}
							</span>

							{/* Phase name */}
							{phase}

							{/* Completion indicator */}
							{isCompleted && (
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary">
									✓
								</span>
							)}
						</div>
					</div>
				)
			})}
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
				<ConsiderationProposalList
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

function formatDateDiff(diff: number): string {
	// Calculate days, hours, minutes
	const days = Math.floor(diff / (1000 * 60 * 60 * 24))
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

	if (days > 0) {
		return `${days}d ${hours}h`
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m`
	}
	return `${minutes}m`
}

function getTimeRemaining(date: Date): string {
	const now = Date.now()
	const diff = date.getTime() - now

	// Time already passed
	if (diff < 0) {
		return 'Ended'
	}

	return formatDateDiff(diff)
}

function getTimeSince(date: Date): string {
	const now = Date.now()
	const diff = now - date.getTime()

	return formatDateDiff(diff)
}

const getPreviousAndNextForBetweenPhase = (
	phases: FundingRoundPhases,
): {
	nextPhase: { name: StartedPhase; startDate: string; endDate: string } | null
	previousPhase: {
		name: StartedPhase
		startDate: string
		endDate: string
	} | null
} => {
	const now = new Date()

	const destructuredPhases = Object.entries(phases).map(
		([name, { startDate, endDate }], index) => ({
			index,
			name,
			startDate,
			endDate,
		}),
	)

	const nextPhase = destructuredPhases.find(
		({ startDate }) => new Date(startDate) > now,
	)

	const previousPhase =
		nextPhase && nextPhase.index > 0
			? destructuredPhases[nextPhase.index - 1]
			: null

	return {
		nextPhase: nextPhase
			? {
					name: nextPhase.name as StartedPhase,
					startDate: nextPhase.startDate,
					endDate: nextPhase.endDate,
				}
			: null,
		previousPhase: previousPhase
			? {
					name: previousPhase.name as StartedPhase,
					startDate: previousPhase.startDate,
					endDate: previousPhase.endDate,
				}
			: null,
	}
}
