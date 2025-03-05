import {
	getPreviousAndNextForBetweenPhase,
	getTimeRemaining,
	getTimeSince,
} from '@/lib/funding-round-utils'
import {
	FundingRoundPhases,
	FundingRoundWithPhases,
} from '@/types/funding-round'
import { ClockIcon, CoinsIcon, FileTextIcon, TimerIcon } from 'lucide-react'

export function FundingRoundStatusOverviewCards({
	data,
}: {
	data: FundingRoundWithPhases
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
					className="rounded-md border border-border bg-muted p-2 md:p-4"
				>
					<div className="flex items-center gap-2">
						<div className="rounded-full bg-secondary/20 p-2">
							<Icon className="h-4 w-4 text-secondary md:h-6 md:w-6" />
						</div>
						<div>
							<p className="text-base font-bold md:text-lg">{value}</p>
							<p className="text-xs text-muted-foreground md:text-sm">
								{label}
							</p>
						</div>
					</div>
				</div>
			))}
		</div>
	)
}
