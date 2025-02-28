import { type FC } from 'react'
import { CheckCircleIcon } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
	Vote,
	type ConsiderationPhaseSummary as ConsiderationPhaseSummaryType,
} from '@/types/phase-summary'
import {
	getPhaseStatus,
	getPhaseProgress,
	getProgressColor,
} from '@/lib/phase-utils'
import { BasePhaseSummary } from './BasePhaseSummary'
import { PhaseTimeCard } from './PhaseTimeCard'
import { StatsCard } from './StatsCard'
import { ProposalList } from './ProposalList'
import { BudgetDistributionChart } from '../funding-rounds/BudgetDistributionChart'
import { VotesTable } from './VotesTable'

interface Props {
	summary: ConsiderationPhaseSummaryType
	fundingRoundId: string
}

export const ConsiderationPhaseSummary: FC<Props> = ({
	summary,
	fundingRoundId,
}) => {
	const phaseStatus = getPhaseStatus(summary.phaseTimeInfo)
	const progress = getPhaseProgress(summary.phaseTimeInfo)
	const progressColor = getProgressColor(progress)
	console.log('summary proposals', summary.proposalVotes)
	const votes: Vote[] = summary.proposalVotes.flatMap(proposal =>
		proposal.communityVotes.voters.map(voter => ({
			account: voter.account,
			hash: voter.hash,
			memo: '',
			height: voter.height,
			status: voter.status,
			timestamp: voter.timestamp,
			nonce: 0,
		})),
	)

	// If phase hasn't started yet, show countdown widget
	if (phaseStatus.status === 'not-started') {
		return (
			<div className="container mx-auto max-w-2xl">
				<PhaseTimeCard
					timeInfo={summary.phaseTimeInfo}
					phaseStatus={phaseStatus}
				/>
			</div>
		)
	}

	return (
		<TooltipProvider>
			<BasePhaseSummary
				title={`${summary.fundingRoundName}'s Consideration Phase Summary`}
				description="Overview of the consideration phase progress and community votes"
				phaseStatus={phaseStatus}
				leftColumn={
					<>
						<PhaseTimeCard
							timeInfo={summary.phaseTimeInfo}
							phaseStatus={{
								...phaseStatus,
								progressColor:
									phaseStatus.status === 'ended'
										? phaseStatus.progressColor
										: progressColor,
							}}
						/>
						<StatsCard
							title="Moving Forward Status"
							icon={
								<CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
							}
							description={`Out of ${summary.totalProposals} proposals, ${summary.movedForwardProposals} are moving forward to deliberation, while ${summary.notMovedForwardProposals} are not moving forward.`}
							positiveCount={summary.movedForwardProposals}
							negativeCount={summary.notMovedForwardProposals}
							positiveLabel="Moving Forward"
							negativeLabel="Not Moving"
						/>
					</>
				}
				rightColumn={
					<BudgetDistributionChart budgetBreakdown={summary.budgetBreakdown} />
				}
				proposalList={
					<ProposalList
						title="Ranked Proposals"
						proposals={summary.proposalVotes}
						showCommunityVotes={true}
					/>
				}
				votesTable={
					<VotesTable
						title="Casted Votes"
						noVotesMessage="No Community votes has been cast"
						votes={votes}
					/>
				}
			/>
		</TooltipProvider>
	)
}
