import { type FC } from 'react'
import { VoteIcon } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { type VotingPhaseRankedSummary as VotingPhaseRankedSummaryType } from '@/types/phase-summary'
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
	summary: VotingPhaseRankedSummaryType
	fundingRoundId: string
}

export const VotingPhaseRankedSummary: FC<Props> = ({
	summary,
	fundingRoundId,
}) => {
	const phaseStatus = getPhaseStatus(summary.phaseTimeInfo)
	const progress = getPhaseProgress(summary.phaseTimeInfo)
	const progressColor = getProgressColor(progress)

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
				title={`${summary.fundingRoundName}'s Ranked Voting Summary`}
				description="Overview of the ranked voting results"
				phaseStatus={phaseStatus}
				stats={
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2 text-sm">
							<span className="text-muted-foreground">Total Votes Cast:</span>
							<span className="font-medium">{summary.totalVotes}</span>
						</div>
					</div>
				}
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
							className="transition-colors"
						/>
						<StatsCard
							title="Voting Status"
							icon={<VoteIcon className="h-4 w-4 text-muted-foreground" />}
							description={`Out of ${summary.totalProposals} proposals, ${
								summary.proposalVotes.filter(p => p.hasVotes).length
							} have received votes.`}
							positiveCount={
								summary.proposalVotes.filter(p => p.hasVotes).length
							}
							negativeCount={
								summary.proposalVotes.filter(p => !p.hasVotes).length
							}
							positiveLabel="With Votes"
							negativeLabel="No Votes"
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
						showCommunityVotes={false}
					/>
				}
				votesTable={
					<VotesTable
						title="Casted Votes"
						votes={summary.votes}
						noVotesMessage="No Community votes has been cast"
					/>
				}
			/>
		</TooltipProvider>
	)
}
