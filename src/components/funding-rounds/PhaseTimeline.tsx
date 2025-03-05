import { getPreviousAndNextForBetweenPhase } from '@/lib/funding-round-utils'
import { cn } from '@/lib/utils'
import {
	FundingRoundPhase,
	FundingRoundWithPhases,
} from '@/types/funding-round'

const FUNDING_ROUND_PHASES: Exclude<FundingRoundPhase, 'UPCOMING'>[] = [
	'SUBMISSION',
	'CONSIDERATION',
	'DELIBERATION',
	'VOTING',
	'COMPLETED',
	'BETWEEN_PHASES',
]

export function PhaseTimeline({ data }: { data: FundingRoundWithPhases }) {
	const timelinePhases = FUNDING_ROUND_PHASES.filter(
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
						previousOrCurrentActivePhase !== 'UPCOMING' &&
						index <= FUNDING_ROUND_PHASES.indexOf(previousOrCurrentActivePhase))

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
