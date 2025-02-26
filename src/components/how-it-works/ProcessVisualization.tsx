'use client'

import { cn } from '@/lib/utils'

export function ProcessVisualization() {
	//TODO: Remove it
	const currentPhase = 'voting' as unknown
	const getPhaseStyle = (phase: string) => {
		const isActive = false
		const isPast = false

		return {
			container: cn(
				'border-2 p-4 rounded-lg text-center transition-all duration-200 relative',
				isActive && 'border-primary bg-primary/5 shadow-lg',
				!isActive && isPast && 'border-muted bg-muted/5 opacity-60',
				!isActive && !isPast && 'border-gray-300',
			),
			text: cn(
				'text-sm',
				isActive && 'text-primary font-medium',
				!isActive && isPast && 'text-muted-foreground',
				!isActive && !isPast && 'text-foreground',
			),
		}
	}

	return (
		<div className="relative mt-8">
			{/* Timeline line */}
			<div className="absolute bottom-0 left-24 top-0 w-px bg-gray-200" />

			{/* Week 1-2: Submit */}
			<div className="relative mb-32">
				<div className="flex items-start gap-8">
					<div className="w-24 pt-2">
						<div className="text-sm text-gray-600">WEEK 1-2</div>
						<div className="text-xs text-gray-500">SUBMIT</div>
					</div>
					<div className="flex-1">
						<div className={getPhaseStyle('submission').container}>
							<div className={getPhaseStyle('submission').text}>
								PROPOSAL SUBMISSION
							</div>
							{/* Vertical connector from submission to consideration */}
							<div
								className="absolute left-1/2 h-32 w-px border-l-2 border-dashed border-gray-300"
								style={{ top: 'calc(100% + 1px)' }}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Week 3-4: Consider */}
			<div className="relative mb-32">
				<div className="flex items-start gap-8">
					<div className="w-24 pt-2">
						<div className="text-sm text-gray-600">WEEK 3-4</div>
						<div className="text-xs text-gray-500">CONSIDER</div>
					</div>
					<div className="flex-1">
						<div className={getPhaseStyle('consideration').container}>
							<div className={getPhaseStyle('consideration').text}>
								<div>AT LEAST 5 REVIEWERS</div>
								<div>OR</div>
								<div>AT LEAST 10% OF PARTICIPATING</div>
								<div>COMMUNITY MEMBERS</div>
								<div>INDICATE INTEREST IN THE</div>
								<div>PROPOSAL</div>
							</div>
							{/* Vertical connectors to outcomes */}
							<div
								className="absolute left-1/4 h-32 w-px border-l-2 border-dashed border-gray-300"
								style={{ top: 'calc(100% + 1px)' }}
							/>
							<div
								className="absolute right-1/4 h-32 w-px border-l-2 border-dashed border-gray-300"
								style={{ top: 'calc(100% + 1px)' }}
							/>
						</div>

						{/* Outcomes */}
						<div className="mt-32 grid grid-cols-2 gap-8">
							<div
								className={cn(
									getPhaseStyle('consideration').container,
									'relative',
								)}
							>
								<div className={getPhaseStyle('consideration').text}>
									PROPOSAL DECLINED
								</div>
							</div>
							<div
								className={cn(
									getPhaseStyle('consideration').container,
									'relative',
								)}
							>
								<div className={getPhaseStyle('consideration').text}>
									PROPOSAL APPROVED
									<br />
									FOR DELIBERATION
								</div>
								{/* Connector to deliberation phase */}
								<div
									className="absolute right-1/2 h-32 w-px border-l-2 border-dashed border-gray-300"
									style={{ top: 'calc(100% + 1px)' }}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Week 5-6: Deliberate */}
			<div className="relative mb-32">
				<div className="flex items-start gap-8">
					<div
						className={cn(
							'w-24 rounded-md pt-2',
							currentPhase === 'deliberation' && 'bg-primary/10 p-2',
						)}
					>
						<div className="text-sm text-gray-600">WEEK 5-6</div>
						<div className="text-xs text-gray-500">DELIBERATE</div>
					</div>
					<div className="flex-1">
						<div className="relative grid grid-cols-2 gap-8">
							<div className={getPhaseStyle('deliberation').container}>
								<div className={getPhaseStyle('deliberation').text}>
									<div className="mb-2 font-medium">10 REVIEWERS:</div>
									<div>VERIFY IF THE PROPOSAL IS VALUABLE</div>
									<div>AND BENEFICIAL FOR THE MINA</div>
									<div>ECOSYSTEM AND PROVIDE FEEDBACK</div>
								</div>
							</div>
							{/* Horizontal connector between boxes */}
							<div className="absolute left-[calc(50%-2rem)] right-[calc(50%-2rem)] top-1/2 border-t-2 border-dashed border-gray-300" />
							<div className={getPhaseStyle('deliberation').container}>
								<div className={getPhaseStyle('deliberation').text}>
									<div className="mb-2 font-medium">COMMUNITY MEMBERS:</div>
									<div>PROVIDE FEEDBACK ON THE</div>
									<div>PROPOSAL</div>
								</div>
							</div>
						</div>
						{/* Connector to voting with label */}
						<div className="relative">
							<div
								className="absolute left-1/2 h-32 w-px border-l-2 border-dashed border-gray-300"
								style={{ top: 'calc(100% + 1px)' }}
							/>
							<div className="absolute left-1/2 mt-8 -translate-x-1/2 transform text-center text-sm text-gray-500">
								PROPOSAL GOES INTO
								<br />
								VOTING WITH REVIEWERS&apos;
								<br />
								RECOMMENDATION
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Week 7-8: Vote */}
			<div className="relative mb-32">
				<div className="flex items-start gap-8">
					<div className="w-24 pt-2">
						<div className="text-sm text-gray-600">WEEK 7-8</div>
						<div className="text-xs text-gray-500">VOTE</div>
					</div>
					<div className="flex-1">
						<div className={getPhaseStyle('voting').container}>
							<div className={getPhaseStyle('voting').text}>
								<div className="mb-2 font-medium">ALL COMMUNITY MEMBERS:</div>
								<div>VOTE ON FUNDING SELECTED</div>
								<div>PROPOSALS</div>
							</div>
							{/* Connector to result */}
							<div
								className="absolute left-1/2 h-32 w-px border-l-2 border-dashed border-gray-300"
								style={{ top: 'calc(100% + 1px)' }}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Result */}
			<div className="relative">
				<div className="flex items-start gap-8">
					<div className="w-24 pt-2">
						<div className="text-sm text-gray-600">RESULT</div>
					</div>
					<div className="flex-1">
						<div
							className={cn(
								'text-center text-sm',
								currentPhase === 'completed'
									? 'font-medium text-primary'
									: 'text-muted-foreground',
							)}
						>
							FINAL RESULT
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
