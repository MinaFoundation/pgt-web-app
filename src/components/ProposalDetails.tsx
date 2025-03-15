'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	ArrowLeftIcon,
	ChevronDownIcon,
	ChevronUpIcon,
} from '@radix-ui/react-icons'
import { useToast } from '@/hooks/use-toast'
import { SelectFundingRoundDialog } from '@/components/dialogs/SelectFundingRoundDialog'
import { ViewFundingRoundDialog } from '@/components/dialogs/ViewFundingRoundDialog'
import { Badge } from '@/components/ui/badge'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { ProposalComments } from '@/components/ProposalComments'
import { useProposal } from '@/hooks/use-proposal'
import { useProposalComments } from '@/hooks/use-proposal-comments'
import { useAuth } from '@/contexts/AuthContext'
import { useFundingRounds } from '@/hooks/use-funding-rounds'
import { ProposalStatus } from '@prisma/client'
import Link from 'next/link'

export function ProposalDetails({ proposalId }: { proposalId: string }) {
	const { toast } = useToast()
	const [isExpanded, setIsExpanded] = useState(false)
	const [selectFundingRoundOpen, setSelectFundingRoundOpen] = useState(false)
	const [viewFundingRoundOpen, setViewFundingRoundOpen] = useState(false)

	const {
		data: submissionFundingRounds = [],
		isLoading: checkingSubmissionFundingRounds,
	} = useFundingRounds({
		filterBy: 'SUBMISSION',
	})

	const hasActiveSubmissionRounds = submissionFundingRounds.length > 0

	const { user } = useAuth()

	const {
		data: proposal,
		isLoading: isLoadingProposal,
		refetch: refetchProposal,
	} = useProposal(proposalId)

	const { data: comments, isLoading: isLoadingComments } =
		useProposalComments(proposalId)

	const handleSubmitToFunding = async (roundId: string) => {
		try {
			const response = await fetch(`/api/proposals/${proposalId}/submit`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ fundingRoundId: roundId }),
			})

			if (!response.ok) throw new Error('Failed to submit proposal')

			toast({
				title: 'Success',
				description: 'Proposal submitted to funding round',
			})

			refetchProposal()
		} catch (error) {
			throw error // Let the dialog handle the error
		}
	}

	const handleWithdrawFromFunding = async () => {
		try {
			const response = await fetch(`/api/proposals/${proposalId}/withdraw`, {
				method: 'POST',
			})

			if (!response.ok) throw new Error('Failed to withdraw proposal')

			toast({
				title: 'Success',
				description: 'Proposal withdrawn from funding round',
			})

			refetchProposal()
		} catch (error) {
			throw error // Let the dialog handle the error
		}
	}

	const handleSubmitClick = () => {
		if (!hasActiveSubmissionRounds) {
			toast({
				title: 'No Available Funding Rounds',
				description:
					'There are currently no funding rounds accepting proposals. Please check back later.',
				variant: 'default',
			})
			return
		}
		setSelectFundingRoundOpen(true)
	}

	const isOwner =
		proposal?.user.id === user?.id || proposal?.user.linkId === user?.linkId
	const canEdit = proposal?.status === ProposalStatus.DRAFT && isOwner

	if (isLoadingProposal || isLoadingComments) {
		return <div className="py-8 text-center">Loading proposal...</div>
	}

	if (!proposal) {
		return <div className="py-8 text-center">Proposal not found</div>
	}

	return (
		<div className="mx-auto max-w-4xl p-6">
			<div className="mb-6">
				<h1 className="mb-4 text-3xl font-bold">Proposal Details</h1>
				<Link href="/proposals">
					<Button
						variant="ghost"
						className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
					>
						<ArrowLeftIcon className="h-4 w-4" />
						Back
					</Button>
				</Link>
			</div>

			<div className="space-y-6 rounded-lg border p-6">
				<div className="space-y-4">
					<h2 className="mb-4 text-2xl font-bold">{proposal.title}</h2>
					<p className="text-muted-foreground">by {proposal.user.username}</p>
					<div className="flex gap-2">
						<span className="rounded-full bg-muted px-2 py-1 text-sm">
							Status: {proposal.status.toLowerCase()}
						</span>
						{proposal.fundingRound && (
							<Button
								variant="link"
								className="h-auto p-0"
								onClick={() => setViewFundingRoundOpen(true)}
							>
								<Badge variant="outline" className="cursor-pointer">
									{proposal.fundingRound.name}
								</Badge>
							</Button>
						)}
					</div>
				</div>

				<div className="space-y-6">
					<div>
						<h3 className="mb-2 text-xl font-semibold">Summary</h3>
						<p className="text-muted-foreground">{proposal.summary}</p>
					</div>

					{isExpanded && (
						<>
							<div>
								<h3 className="mb-2 text-xl font-semibold">Key Objectives</h3>
								<p className="text-muted-foreground">
									{proposal.keyObjectives}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">
									Problem Statement
								</h3>
								<p className="text-muted-foreground">
									{proposal.problemStatement}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">
									Problem Importance
								</h3>
								<p className="text-muted-foreground">
									{proposal.problemImportance}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">
									Proposed Solution
								</h3>
								<p className="text-muted-foreground">
									{proposal.proposedSolution}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">
									Implementation Details
								</h3>
								<p className="text-muted-foreground">
									{proposal.implementationDetails}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">
									Total Funding Required
								</h3>
								<p className="text-muted-foreground">
									{proposal.totalFundingRequired.toString()} MINA
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">
									Community Benefits
								</h3>
								<p className="text-muted-foreground">
									{proposal.communityBenefits}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">
									Key Performance Indicators
								</h3>
								<p className="text-muted-foreground">
									{proposal.keyPerformanceIndicators}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">Budget Breakdown</h3>
								<p className="text-muted-foreground">
									{proposal.budgetBreakdown}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">Milestones</h3>
								<p className="text-muted-foreground">{proposal.milestones}</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">
									Estimated Completion Date
								</h3>
								<p className="text-muted-foreground">
									{new Date(
										proposal.estimatedCompletionDate,
									).toLocaleDateString()}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">Team Members</h3>
								<p className="text-muted-foreground">{proposal.teamMembers}</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">
									Relevant Experience
								</h3>
								<p className="text-muted-foreground">
									{proposal.relevantExperience}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">Potential Risks</h3>
								<p className="text-muted-foreground">
									{proposal.potentialRisks}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">Mitigation Plans</h3>
								<p className="text-muted-foreground">
									{proposal.mitigationPlans}
								</p>
							</div>

							<div>
								<h3 className="mb-2 text-xl font-semibold">
									Contact Information
								</h3>
								<div className="space-y-2">
									<p className="text-muted-foreground">
										Discord: {proposal.discordHandle}
									</p>
									<p className="text-muted-foreground">
										Email: {proposal.email}
									</p>
									{proposal.website && (
										<p className="text-muted-foreground">
											Website:{' '}
											<a
												href={proposal.website}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary hover:underline"
											>
												{proposal.website}
											</a>
										</p>
									)}
									{proposal.githubProfile && (
										<p className="text-muted-foreground">
											GitHub:{' '}
											<a
												href={proposal.githubProfile}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary hover:underline"
											>
												{proposal.githubProfile}
											</a>
										</p>
									)}
									{proposal.otherLinks && (
										<p className="text-muted-foreground">
											Other Links:{' '}
											<span className="text-primary">
												{proposal.otherLinks}
											</span>
										</p>
									)}
								</div>
							</div>
						</>
					)}
				</div>

				<div className="flex items-center justify-between pt-4">
					<Button
						variant="ghost"
						onClick={() => setIsExpanded(!isExpanded)}
						className="flex items-center gap-2"
					>
						{isExpanded ? (
							<>
								See less
								<ChevronUpIcon className="h-4 w-4" />
							</>
						) : (
							<>
								See more
								<ChevronDownIcon className="h-4 w-4" />
							</>
						)}
					</Button>

					{proposal.status === 'DRAFT' && (
						<div className="flex gap-4">
							{canEdit && (
								<Link href={`/proposals/${proposalId}/edit`}>
									<Button variant="outline">Edit</Button>
								</Link>
							)}
							{proposal.fundingRound ? (
								<Button
									onClick={() => setViewFundingRoundOpen(true)}
									variant="secondary"
								>
									View Funding Round Details
								</Button>
							) : (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<div>
												<Button
													onClick={handleSubmitClick}
													disabled={
														checkingSubmissionFundingRounds ||
														!hasActiveSubmissionRounds
													}
												>
													{checkingSubmissionFundingRounds
														? 'Checking rounds...'
														: 'Submit to funding round'}
												</Button>
											</div>
										</TooltipTrigger>
										{!hasActiveSubmissionRounds && (
											<TooltipContent>
												<p>
													No funding rounds are currently accepting proposals
												</p>
											</TooltipContent>
										)}
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
					)}
				</div>

				<ProposalComments comments={comments!} />
			</div>

			<SelectFundingRoundDialog
				open={selectFundingRoundOpen}
				onOpenChange={setSelectFundingRoundOpen}
				onSubmit={handleSubmitToFunding}
				proposalTitle={proposal.title}
			/>

			{proposal.fundingRound && (
				<ViewFundingRoundDialog
					open={viewFundingRoundOpen}
					onOpenChange={setViewFundingRoundOpen}
					fundingRound={proposal.fundingRound}
					proposalTitle={proposal.title}
					onWithdraw={handleWithdrawFromFunding}
					canWithdraw={isOwner}
				/>
			)}
		</div>
	)
}
