import { type FC } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	type ProposalVoteBase,
	type ReviewerVoteStats,
	type CommunityVoteStats,
	type SubmissionProposalVote,
	type VotingProposalVote,
	RankedVotingProposalVote,
} from '@/types/phase-summary'
import { ProposalCard } from './ProposalCard'

type ProposalVote =
	| (ProposalVoteBase & {
			reviewerVotes: ReviewerVoteStats
			communityVotes?: CommunityVoteStats
	  })
	| SubmissionProposalVote
	| VotingProposalVote
	| RankedVotingProposalVote

interface Props {
	title: string
	proposals: ProposalVote[]
	showCommunityVotes?: boolean
}

export const ProposalList: FC<Props> = ({
	title,
	proposals,
	showCommunityVotes = false,
}) => {
	// Sort proposals by yes votes in descending order for review phases
	// or by submission date for submission phase
	const sortedProposals = [...proposals].sort((a, b) => {
		if ('submissionDate' in a && 'submissionDate' in b) {
			return b.submissionDate.getTime() - a.submissionDate.getTime()
		}
		if ('reviewerVotes' in a && 'reviewerVotes' in b) {
			return (b.reviewerVotes?.yesVotes ?? 0) - (a.reviewerVotes?.yesVotes ?? 0)
		}
		return 0
	})

	return (
		<Card>
			<CardHeader className="py-3">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
			</CardHeader>
			<CardContent className="p-3">
				<ScrollArea className="h-[calc(100vh-250px)] min-h-[300px] w-full">
					<div className="grid grid-cols-1 gap-3 pr-3 sm:grid-cols-2 lg:grid-cols-3">
						{sortedProposals.map((proposal, index) => (
							<ProposalCard
								key={proposal.id}
								proposal={proposal}
								rank={index + 1}
								showCommunityVotes={showCommunityVotes}
							/>
						))}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	)
}
