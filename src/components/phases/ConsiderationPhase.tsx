'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	ChevronRight,
	ChevronDown,
	NotepadTextIcon,
	CircleDashedIcon,
	ArrowDownNarrowWideIcon,
	ArrowDownWideNarrowIcon,
	SearchIcon,
	FilterIcon,
} from 'lucide-react'
import { useConsiderationPhase } from '@/hooks/use-consideration-phase'
import { useConsiderationVote } from '@/hooks/use-consideration-vote'
import { cn, truncateWallet } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { OCVVoteButton } from '@/components/web3/OCVVoteButton'
import { ProposalStatus } from '@prisma/client'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card'
import { ConsiderationProposalResponseJson } from '@/app/api/funding-rounds/[id]/consideration-proposals/route'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select'
import { Input } from '../ui/input'
import { useQueryState } from 'nuqs'
import { z } from 'zod'

type ReviewState = 'initial' | 'decided' | 'editing'

export const queryParamsSchema = z.object({
	query: z.string().optional().nullable(),
	filterBy: z
		.enum(['all', 'approved', 'rejected', 'pending'])
		.optional()
		.nullable(),
	sortBy: z.enum(['createdAt', 'status']).optional().nullable(),
	sortOrder: z.enum(['asc', 'desc']).optional().nullable(),
})

export type QueryParams = z.infer<typeof queryParamsSchema>

const SORT_OPTIONS: {
	value: NonNullable<QueryParams['sortBy']>
	label: string
}[] = [
	{ value: 'createdAt', label: 'Date' },
	{ value: 'status', label: 'Status' },
]

export function ConsiderationPhase({
	fundingRoundId,
	fundingRoundMEFId,
}: {
	fundingRoundId: string
	fundingRoundMEFId: number
}) {
	const { proposals, loading, setProposals } =
		useConsiderationPhase(fundingRoundId)
	const [reviewStates, setReviewStates] = useState<Record<number, ReviewState>>(
		{},
	)
	const [decisions, setDecisions] = useState<Record<number, string>>({})
	const [newDecision, setNewDecision] = useState<Record<number, string>>({})
	const [expanded, setExpanded] = useState<{
		[key: number]: boolean
	}>({})
	const { filterBy, setFilterBy } = useConsiderationPhaseSearchParams()

	const handleVoteSuccess = useCallback(
		(proposalId: number, newStatus: ProposalStatus) => {
			setProposals(prevProposals =>
				prevProposals.map(proposal =>
					proposal.id === proposalId
						? { ...proposal, currentPhase: newStatus }
						: proposal,
				),
			)
		},
		[setProposals],
	)

	const { submitVote, isLoading: isVoting } = useConsiderationVote({
		fundingRoundId,
		onVoteSuccess: handleVoteSuccess,
	})

	useEffect(() => {
		proposals.forEach((proposal: ConsiderationProposalResponseJson) => {
			if (proposal.userVote) {
				setReviewStates(prev => ({ ...prev, [proposal.id]: 'decided' }))
				setDecisions(prev => ({
					...prev,
					[proposal.id]: proposal.userVote!.feedback,
				}))
			}
		})
	}, [proposals])

	const toggleExpanded = (proposalId: number) => {
		setExpanded(prev => ({
			...prev,
			[proposalId]: !prev[proposalId],
		}))
	}

	const handleDecision = async (
		proposalId: number,
		decision: 'APPROVED' | 'REJECTED',
	) => {
		if (!decisions[proposalId]?.trim()) {
			alert('Please provide feedback before making a decision')
			return
		}

		const result = await submitVote(proposalId, decision, decisions[proposalId])
		if (result) {
			setProposals((prev: ConsiderationProposalResponseJson[]) => {
				const updatedProposals = prev.filter(
					(p: ConsiderationProposalResponseJson) => p.id !== proposalId,
				)
				const votedProposal = prev.find(
					(p: ConsiderationProposalResponseJson) => p.id === proposalId,
				)
				if (votedProposal) {
					const newVoteStats = calculateVoteStats(votedProposal, { decision })
					return [
						...updatedProposals,
						{
							...votedProposal,
							status: decision.toLowerCase() as 'approved' | 'rejected',
							userVote: {
								decision,
								feedback: decisions[proposalId],
							},
							voteStats: newVoteStats,
						},
					]
				}
				return prev
			})
			setReviewStates(prev => ({ ...prev, [proposalId]: 'decided' }))
		}
	}

	const startEdit = (proposalId: number) => {
		setNewDecision(prev => ({
			...prev,
			[proposalId]: '',
		}))
		setReviewStates(prev => ({ ...prev, [proposalId]: 'editing' }))
	}

	const cancelEdit = (proposalId: number) => {
		setNewDecision(prev => ({
			...prev,
			[proposalId]: '',
		}))
		setReviewStates(prev => ({ ...prev, [proposalId]: 'decided' }))
	}

	const submitNewDecision = async (
		proposalId: number,
		decision: 'APPROVED' | 'REJECTED',
	) => {
		if (!newDecision[proposalId]?.trim()) {
			alert('Please provide feedback before submitting')
			return
		}

		const result = await submitVote(
			proposalId,
			decision,
			newDecision[proposalId],
		)
		if (result) {
			setProposals((prev: ConsiderationProposalResponseJson[]) =>
				prev.map((p: ConsiderationProposalResponseJson) => {
					if (p.id === proposalId) {
						const newVoteStats = calculateVoteStats(p, { decision })
						return {
							...p,
							status: decision.toLowerCase() as 'approved' | 'rejected',
							userVote: {
								decision,
								feedback: newDecision[proposalId],
							},
							voteStats: newVoteStats,
						}
					}
					return p
				}),
			)
			setDecisions(prev => ({
				...prev,
				[proposalId]: newDecision[proposalId],
			}))
			setNewDecision(prev => ({
				...prev,
				[proposalId]: '',
			}))
		}
	}

	const renderVoteButtons = (proposal: ConsiderationProposalResponseJson) => {
		if (!proposal.isReviewerEligible) {
			return (
				<div className="flex flex-col gap-2 md:flex-row">
					<OCVVoteButton
						proposalId={proposal.id.toString()}
						useWallet={true}
						voteStats={proposal.voteStats}
						fundingRoundMEFId={fundingRoundMEFId}
					/>
					<OCVVoteButton
						proposalId={proposal.id.toString()}
						useWallet={false}
						voteStats={proposal.voteStats}
						fundingRoundMEFId={fundingRoundMEFId}
					/>
				</div>
			)
		}

		return (
			<>
				<Button
					variant="default"
					className="bg-green-600 hover:bg-green-700"
					onClick={() => handleDecision(proposal.id, 'APPROVED')}
					disabled={isVoting}
					loading={isVoting}
				>
					✅ Approve for Deliberation
				</Button>

				<Button
					variant="destructive"
					onClick={() => handleDecision(proposal.id, 'REJECTED')}
					disabled={isVoting}
					loading={isVoting}
				>
					❌ Reject for Deliberation
				</Button>
			</>
		)
	}

	const renderEditButtons = (proposal: ConsiderationProposalResponseJson) => {
		if (!proposal.isReviewerEligible) {
			return (
				<div className="flex gap-2">
					<OCVVoteButton
						proposalId={proposal.id.toString()}
						useWallet={true}
						voteStats={proposal.voteStats}
						fundingRoundMEFId={fundingRoundMEFId}
					/>
					<OCVVoteButton
						proposalId={proposal.id.toString()}
						useWallet={false}
						voteStats={proposal.voteStats}
						fundingRoundMEFId={fundingRoundMEFId}
					/>
				</div>
			)
		}

		return (
			<div className="flex gap-2">
				<Button
					variant="default"
					className="bg-green-600 hover:bg-green-700"
					onClick={() => submitNewDecision(proposal.id, 'APPROVED')}
					disabled={isVoting}
					loading={isVoting}
				>
					✅ Approve for Deliberation
				</Button>
				<Button
					variant="destructive"
					onClick={() => submitNewDecision(proposal.id, 'REJECTED')}
					disabled={isVoting}
					loading={isVoting}
				>
					❌ Reject for Deliberation
				</Button>
			</div>
		)
	}

	const renderFeedbackSection = (
		proposal: ConsiderationProposalResponseJson,
	) => {
		if (!proposal.isReviewerEligible) {
			if (proposal.status !== 'pending') {
				return (
					<div className="rounded-md bg-muted p-4">
						<h4 className="mb-2 font-medium">📋 Status:</h4>
						<div className="flex items-center gap-2">
							<Badge
								variant={
									proposal.status === 'approved' ? 'default' : 'destructive'
								}
							>
								{proposal.status === 'approved' ? '✅ Approved' : '❌ Rejected'}{' '}
								for Deliberation
							</Badge>
						</div>
					</div>
				)
			}
			return null
		}

		if (reviewStates[proposal.id] === 'editing') {
			return (
				<div className="space-y-4">
					<div className="rounded-md bg-muted p-4">
						<h4 className="mb-2 font-medium">📝 Current Decision:</h4>
						<div className="mb-2 flex items-center gap-2">
							<Badge
								variant={
									proposal.status === 'approved' ? 'default' : 'destructive'
								}
							>
								{proposal.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
							</Badge>
						</div>
						<p className="text-muted-foreground">{decisions[proposal.id]}</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor={`new-decision-${proposal.id}`}>New Feedback</Label>
						<Textarea
							id={`new-decision-${proposal.id}`}
							placeholder="Enter your new feedback..."
							value={newDecision[proposal.id] || ''}
							onChange={e =>
								setNewDecision(prev => ({
									...prev,
									[proposal.id]: e.target.value,
								}))
							}
							className="min-h-[100px]"
						/>
					</div>
				</div>
			)
		}

		if (reviewStates[proposal.id] === 'decided') {
			return (
				<div className="rounded-md bg-muted p-4">
					<h4 className="mb-2 font-medium">📋 Decision:</h4>
					<div className="mb-2 flex items-center gap-2">
						<Badge
							variant={
								proposal.status === 'approved' ? 'default' : 'destructive'
							}
						>
							{proposal.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
						</Badge>
					</div>
					<p className="text-muted-foreground">
						{decisions[proposal.id] || proposal.userVote?.feedback}
					</p>
				</div>
			)
		}

		return (
			<div className="space-y-2">
				<Label htmlFor={`feedback-${proposal.id}`}>Your Feedback</Label>
				<Textarea
					id={`feedback-${proposal.id}`}
					placeholder="Enter your feedback..."
					value={decisions[proposal.id] || ''}
					onChange={e =>
						setDecisions(prev => ({
							...prev,
							[proposal.id]: e.target.value,
						}))
					}
					className="min-h-[100px]"
				/>
			</div>
		)
	}

	// Group proposals by phase
	const groupedProposals = useMemo(() => {
		const considerationProposals = proposals.filter(
			p => p.currentPhase === 'CONSIDERATION',
		)
		const deliberationProposals = proposals.filter(
			p => p.currentPhase === 'DELIBERATION',
		)
		return { considerationProposals, deliberationProposals }
	}, [proposals])

	if (loading) {
		return <ConsiderationPhaseSkeleton />
	}

	const tabs: {
		label: string
		count: number
		icon: React.FC<{ className?: string }>
		tab: QueryParams['filterBy']
		description: string
	}[] = [
		{
			label: 'Proposals',
			count: proposals.length,
			icon: NotepadTextIcon,
			tab: 'all',
			description: 'All proposals submitted for consideration.',
		},
		{
			label: 'Approved',
			count: proposals.filter(
				(p: ConsiderationProposalResponseJson) => p.status === 'approved',
			).length,
			icon: ArrowDownNarrowWideIcon,
			tab: 'approved',
			description:
				'These proposals have reached the required approval threshold and are moving to deliberation. Reviewers can still modify their consideration votes.',
		},
		{
			label: 'Rejected',
			count: proposals.filter(
				(p: ConsiderationProposalResponseJson) => p.status === 'rejected',
			).length,
			icon: ArrowDownWideNarrowIcon,
			tab: 'rejected',
			description:
				'These proposals have been rejected and will not receive funding.',
		},
		{
			label: 'Pending',
			count: proposals.filter(
				(p: ConsiderationProposalResponseJson) => p.status === 'pending',
			).length,
			icon: CircleDashedIcon,
			tab: 'pending',
			description:
				'These proposals are still pending review. Reviewers and Community can vote on these proposals.',
		},
	]

	return (
		<div className="space-y-8">
			<header className="space-y-4">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Consideration Phase
					</h2>
					<p className="text-gray-700">
						Review submitted proposals and determine which ones you find
						valuable enough to receive funding.
					</p>
				</div>
				<div className="flex gap-2">
					{tabs.map(tab => (
						<Button
							key={tab.tab}
							variant={filterBy === tab.tab ? 'secondary' : 'outline'}
							onClick={() => setFilterBy(tab.tab ?? null)}
							className={cn(
								'flex items-center gap-1',
								filterBy !== tab.tab && 'hover:bg-secondary/30',
							)}
						>
							<tab.icon className="h-4 w-4" />
							{tab.count} {tab.label}
						</Button>
					))}
				</div>

				{filterBy !== 'all' && (
					<div className="rounded-md border border-gray-200 p-4">
						<h4 className="text-lg font-bold">
							<span className="text-muted-foreground">
								<FilterIcon className="inline h-4 w-4" /> Filtering by:
							</span>{' '}
							<span className="capitalize">{filterBy}</span>
						</h4>
						<p className="text-sm text-muted-foreground">
							{tabs.find(tab => tab.tab === filterBy)?.description}
						</p>
					</div>
				)}

				<FundingRoundsControls />
			</header>

			<div className="space-y-6">
				{/* Consideration Phase Proposals */}
				<div className="grid gap-4">
					{proposals.map(proposal => (
						<Card
							key={proposal.id}
							className={cn(
								'relative transition-all duration-200',
								proposal.status === 'approved' &&
									'border-green-500/20 bg-green-50/50 dark:bg-green-900/10',
								proposal.status === 'rejected' &&
									'border-red-500/20 bg-red-50/50 dark:bg-red-900/10',
							)}
						>
							{proposal.currentPhase === 'DELIBERATION' && (
								<Badge
									variant="secondary"
									className="absolute right-4 top-4 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
								>
									✨ Moving to Deliberation
								</Badge>
							)}
							<CardHeader>
								<div className="flex items-start justify-between">
									<div>
										<CardTitle className="text-2xl">{proposal.title}</CardTitle>
										<CardDescription className="break-all">
											👤 Submitted by {proposal.submitter}
										</CardDescription>
										<div className="mt-4">
											<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
												{/* Reviewer Votes */}
												<VoteStatusCard
													icon="👥"
													title="Reviewer Votes"
													eligibilityStatus={
														proposal.voteStats.reviewerEligible
															? 'Eligible'
															: `Need ${proposal.voteStats.requiredReviewerApprovals - proposal.voteStats.approved} more`
													}
													isEligible={proposal.voteStats.reviewerEligible}
													stats={
														<VoteProgress
															approved={proposal.voteStats.approved}
															rejected={proposal.voteStats.rejected}
															total={proposal.voteStats.total}
														/>
													}
												>
													<div />
												</VoteStatusCard>

												{/* Community Votes */}
												<VoteStatusCard
													icon="🌍"
													title="Community Votes"
													eligibilityStatus={
														proposal.voteStats.communityVotes.isEligible
															? 'Eligible'
															: 'Not Eligible'
													}
													isEligible={
														proposal.voteStats.communityVotes.isEligible
													}
												>
													<HoverCard>
														<HoverCardTrigger asChild>
															<div className="flex cursor-help items-center justify-between">
																<div className="flex items-center gap-2">
																	<span className="text-sm font-medium text-green-600">
																		{proposal.voteStats.communityVotes.positive}{' '}
																		votes
																	</span>
																	<span className="text-xs text-muted-foreground">
																		(
																		{
																			proposal.voteStats.communityVotes
																				.positiveStakeWeight
																		}{' '}
																		stake)
																	</span>
																</div>
																<Button
																	variant="ghost"
																	size="sm"
																	className="text-xs text-muted-foreground"
																>
																	View Voters ↗
																</Button>
															</div>
														</HoverCardTrigger>
														<HoverCardContent
															className="w-full max-w-[340px]"
															align="end"
															side="left"
														>
															<div className="space-y-3">
																<div className="flex items-center justify-between">
																	<h4 className="text-sm font-semibold">
																		Community Voters
																	</h4>
																	<Badge variant="outline" className="text-xs">
																		{
																			proposal.voteStats.communityVotes.voters
																				.length
																		}{' '}
																		total
																	</Badge>
																</div>

																<div className="rounded bg-muted/50 p-2 text-xs text-muted-foreground">
																	Note: OCV votes may take up to 10 minutes to
																	appear here. Don&apos;t worry if your vote
																	doesn&apos;t show up immediately after voting.
																</div>

																{proposal.voteStats.communityVotes.voters
																	.length > 0 ? (
																	<div className="-mr-2 max-h-[240px] space-y-1.5 overflow-y-auto pr-2">
																		{proposal.voteStats.communityVotes.voters.map(
																			(voter, i) => (
																				<div
																					key={i}
																					className="flex items-center justify-between rounded-md p-1.5 transition-colors hover:bg-muted"
																				>
																					<div className="flex min-w-0 flex-1 items-center gap-2">
																						<span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
																							{i + 1}
																						</span>
																						<VoterAddress
																							address={voter.address}
																						/>
																					</div>
																					<div className="flex-shrink-0 pl-2">
																						<FormattedTimestamp
																							timestamp={voter.timestamp}
																						/>
																					</div>
																				</div>
																			),
																		)}
																	</div>
																) : (
																	<div className="py-4 text-center text-sm text-muted-foreground">
																		No votes yet
																	</div>
																)}

																<div className="border-t pt-2">
																	<p className="text-xs text-muted-foreground">
																		Total Stake Weight:{' '}
																		{
																			proposal.voteStats.communityVotes
																				.positiveStakeWeight
																		}
																	</p>
																</div>
															</div>
														</HoverCardContent>
													</HoverCard>
												</VoteStatusCard>
											</div>
										</div>
									</div>
									{proposal.status !== 'pending' && (
										<Badge
											variant={
												proposal.status === 'approved'
													? 'default'
													: 'destructive'
											}
										>
											{proposal.status === 'approved'
												? '✅ Approved'
												: '❌ Rejected'}
										</Badge>
									)}
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<h3 className="mb-2 text-xl font-semibold">Summary</h3>
									{expanded[proposal.id] ? (
										<>
											<p className="mb-4 text-muted-foreground">
												{proposal.proposalSummary}
											</p>
											<div className="space-y-4">
												<div>
													<h3 className="mb-2 text-xl font-semibold">
														Key Objectives
													</h3>
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
														{proposal.totalFundingRequired.toLocaleString()}{' '}
														MINA
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
													<h3 className="mb-2 text-xl font-semibold">
														Budget Breakdown
													</h3>
													<p className="text-muted-foreground">
														{proposal.budgetBreakdown}
													</p>
												</div>
												<div>
													<h3 className="mb-2 text-xl font-semibold">
														Milestones
													</h3>
													<p className="text-muted-foreground">
														{proposal.milestones}
													</p>
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
													<h3 className="mb-2 text-xl font-semibold">
														Team Members
													</h3>
													<p className="text-muted-foreground">
														{proposal.teamMembers}
													</p>
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
													<h3 className="mb-2 text-xl font-semibold">
														Potential Risks
													</h3>
													<p className="text-muted-foreground">
														{proposal.potentialRisks}
													</p>
												</div>
												<div>
													<h3 className="mb-2 text-xl font-semibold">
														Mitigation Plans
													</h3>
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
											</div>
										</>
									) : (
										<p className="line-clamp-3 text-muted-foreground">
											{proposal.proposalSummary}
										</p>
									)}
								</div>

								{renderFeedbackSection(proposal)}
							</CardContent>
							<CardFooter className="flex items-center justify-between">
								<Button
									variant="ghost"
									className="gap-2"
									onClick={() => toggleExpanded(proposal.id)}
								>
									{expanded[proposal.id] ? (
										<>
											See less
											<ChevronDown className="h-4 w-4" />
										</>
									) : (
										<>
											See more
											<ChevronRight className="h-4 w-4" />
										</>
									)}
								</Button>

								<div className="flex items-center gap-4">
									{reviewStates[proposal.id] === 'editing' ? (
										<>
											<Button
												variant="outline"
												onClick={() => cancelEdit(proposal.id)}
											>
												❌ Cancel
											</Button>
											{renderEditButtons(proposal)}
										</>
									) : reviewStates[proposal.id] === 'decided' ? (
										<>
											{proposal.isReviewerEligible && (
												<Button
													variant="ghost"
													className="underline"
													onClick={() => startEdit(proposal.id)}
												>
													✏️ Edit Decision
												</Button>
											)}
											<Badge
												variant={
													proposal.status === 'approved'
														? 'default'
														: 'destructive'
												}
											>
												{proposal.status === 'approved'
													? '✅ Approved'
													: '❌ Rejected'}{' '}
												for Deliberation
											</Badge>
										</>
									) : (
										<>{renderVoteButtons(proposal)}</>
									)}
								</div>
							</CardFooter>
						</Card>
					))}
				</div>

				{/* Deliberation Phase Proposals */}
				{groupedProposals.deliberationProposals.length > 0 && (
					<div className="space-y-4 border-t pt-8">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h2 className="text-2xl font-bold">
									Moving to Deliberation Phase
								</h2>
								<p className="text-muted-foreground">
									These proposals have reached the required approval threshold
									and are moving to deliberation. Reviewers can still modify
									their consideration votes.
								</p>
							</div>
							<span className="text-muted-foreground">
								{groupedProposals.deliberationProposals.length} proposals
							</span>
						</div>
						<div className="grid gap-4">
							{groupedProposals.deliberationProposals.map(proposal => (
								<Card
									key={proposal.id}
									className={cn(
										'border-purple-500/20 bg-purple-50/50 transition-all duration-200 dark:bg-purple-900/10',
										'relative overflow-hidden',
									)}
								>
									<div className="absolute right-4 top-4">
										<Badge
											variant="secondary"
											className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
										>
											✨ Moving to Deliberation
										</Badge>
									</div>

									<CardHeader className="pt-12">
										<div className="flex items-start justify-between">
											<div>
												<CardTitle className="text-2xl">
													{proposal.title}
												</CardTitle>
												<CardDescription>
													👤 Submitted by {proposal.submitter}
												</CardDescription>
												<div className="mt-4">
													<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
														{/* Reviewer Votes */}
														<VoteStatusCard
															icon="👥"
															title="Reviewer Votes"
															eligibilityStatus={
																proposal.voteStats.reviewerEligible
																	? 'Eligible'
																	: `Need ${proposal.voteStats.requiredReviewerApprovals - proposal.voteStats.approved} more`
															}
															isEligible={proposal.voteStats.reviewerEligible}
															stats={
																<VoteProgress
																	approved={proposal.voteStats.approved}
																	rejected={proposal.voteStats.rejected}
																	total={proposal.voteStats.total}
																/>
															}
														>
															<div />
														</VoteStatusCard>

														{/* Community Votes */}
														<VoteStatusCard
															icon="🌍"
															title="Community Votes"
															eligibilityStatus={
																proposal.voteStats.communityVotes.isEligible
																	? 'Eligible'
																	: 'Not Eligible'
															}
															isEligible={
																proposal.voteStats.communityVotes.isEligible
															}
														>
															<HoverCard>
																<HoverCardTrigger asChild>
																	<div className="flex cursor-help items-center justify-between">
																		<div className="flex items-center gap-2">
																			<span className="text-sm font-medium text-green-600">
																				{
																					proposal.voteStats.communityVotes
																						.positive
																				}{' '}
																				votes
																			</span>
																			<span className="text-xs text-muted-foreground">
																				(
																				{
																					proposal.voteStats.communityVotes
																						.positiveStakeWeight
																				}{' '}
																				stake)
																			</span>
																			<span className="text-xs text-muted-foreground">
																				(
																				{
																					proposal.voteStats.communityVotes
																						.positiveStakeWeight
																				}{' '}
																				stake)
																			</span>
																		</div>
																		<Button
																			variant="ghost"
																			size="sm"
																			className="text-xs text-muted-foreground"
																		>
																			View Voters ↗
																		</Button>
																	</div>
																</HoverCardTrigger>
																<HoverCardContent
																	className="w-full max-w-[340px]"
																	align="end"
																	side="left"
																>
																	<div className="space-y-3">
																		<div className="flex items-center justify-between">
																			<h4 className="text-sm font-semibold">
																				Community Voters
																			</h4>
																			<Badge
																				variant="outline"
																				className="text-xs"
																			>
																				{
																					proposal.voteStats.communityVotes
																						.voters.length
																				}{' '}
																				total
																			</Badge>
																		</div>

																		<div className="rounded bg-muted/50 p-2 text-xs text-muted-foreground">
																			Note: OCV votes may take up to 10 minutes
																			to appear here. Don&apos;t worry if your
																			vote doesn&apos;t show up immediately
																			after voting.
																		</div>

																		{proposal.voteStats.communityVotes.voters
																			.length > 0 ? (
																			<div className="-mr-2 max-h-[240px] space-y-1.5 overflow-y-auto pr-2">
																				{proposal.voteStats.communityVotes.voters.map(
																					(voter, i) => (
																						<div
																							key={i}
																							className="flex items-center justify-between rounded-md p-1.5 transition-colors hover:bg-muted"
																						>
																							<div className="flex min-w-0 flex-1 items-center gap-2">
																								<span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
																									{i + 1}
																								</span>
																								<VoterAddress
																									address={voter.address}
																								/>
																							</div>
																							<div className="flex-shrink-0 pl-2">
																								<FormattedTimestamp
																									timestamp={voter.timestamp}
																								/>
																							</div>
																						</div>
																					),
																				)}
																			</div>
																		) : (
																			<div className="py-4 text-center text-sm text-muted-foreground">
																				No votes yet
																			</div>
																		)}

																		<div className="border-t pt-2">
																			<p className="text-xs text-muted-foreground">
																				Total Stake Weight:{' '}
																				{
																					proposal.voteStats.communityVotes
																						.positiveStakeWeight
																				}
																			</p>
																		</div>
																	</div>
																</HoverCardContent>
															</HoverCard>
														</VoteStatusCard>
													</div>
												</div>
											</div>
											{proposal.status !== 'pending' && (
												<Badge
													variant={
														proposal.status === 'approved'
															? 'default'
															: 'destructive'
													}
												>
													{proposal.status === 'approved'
														? '✅ Approved'
														: '❌ Rejected'}
												</Badge>
											)}
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
										<div>
											<h3 className="mb-2 text-xl font-semibold">Summary</h3>
											{expanded[proposal.id] ? (
												<>
													<p className="mb-4 text-muted-foreground">
														{proposal.proposalSummary}
													</p>
													<div className="space-y-4">
														<div>
															<h3 className="mb-2 text-xl font-semibold">
																Key Objectives
															</h3>
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
																{proposal.totalFundingRequired.toLocaleString()}{' '}
																MINA
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
															<h3 className="mb-2 text-xl font-semibold">
																Budget Breakdown
															</h3>
															<p className="text-muted-foreground">
																{proposal.budgetBreakdown}
															</p>
														</div>
														<div>
															<h3 className="mb-2 text-xl font-semibold">
																Milestones
															</h3>
															<p className="text-muted-foreground">
																{proposal.milestones}
															</p>
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
															<h3 className="mb-2 text-xl font-semibold">
																Team Members
															</h3>
															<p className="text-muted-foreground">
																{proposal.teamMembers}
															</p>
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
															<h3 className="mb-2 text-xl font-semibold">
																Potential Risks
															</h3>
															<p className="text-muted-foreground">
																{proposal.potentialRisks}
															</p>
														</div>
														<div>
															<h3 className="mb-2 text-xl font-semibold">
																Mitigation Plans
															</h3>
															<p className="text-muted-foreground">
																{proposal.mitigationPlans}
															</p>
														</div>
														<div>
															<h3 className="mb-2 text-xl font-semibold">
																Contact Information
															</h3>
															<div className="space-y-2">
																{/* Show Discord info if author is a Discord user */}
																{proposal.submitterMetadata?.authSource
																	?.type === 'discord' ? (
																	<p className="text-muted-foreground">
																		Discord:{' '}
																		{
																			proposal.submitterMetadata.authSource
																				.username
																		}
																	</p>
																) : /* Check for linked Discord account */
																proposal.submitterMetadata?.linkedAccounts?.some(
																		account =>
																			account.authSource.type === 'discord',
																  ) ? (
																	<p className="text-muted-foreground">
																		Discord:{' '}
																		{
																			proposal.submitterMetadata.linkedAccounts.find(
																				account =>
																					account.authSource.type === 'discord',
																			)?.authSource.username
																		}{' '}
																		(linked account)
																	</p>
																) : (
																	<p className="text-sm italic text-muted-foreground">
																		No Discord account linked
																	</p>
																)}
																<p className="text-muted-foreground">
																	Email: {proposal.email}
																</p>
															</div>
														</div>
													</div>
												</>
											) : (
												<p className="line-clamp-3 text-muted-foreground">
													{proposal.proposalSummary}
												</p>
											)}
										</div>

										{renderFeedbackSection(proposal)}
									</CardContent>
									<CardFooter className="flex items-center justify-between">
										<Button
											variant="ghost"
											className="gap-2"
											onClick={() => toggleExpanded(proposal.id)}
										>
											{expanded[proposal.id] ? (
												<>
													See less
													<ChevronDown className="h-4 w-4" />
												</>
											) : (
												<>
													See more
													<ChevronRight className="h-4 w-4" />
												</>
											)}
										</Button>

										<div className="flex items-center gap-4">
											{reviewStates[proposal.id] === 'editing' ? (
												<>
													<Button
														variant="outline"
														onClick={() => cancelEdit(proposal.id)}
													>
														❌ Cancel
													</Button>
													{renderEditButtons(proposal)}
												</>
											) : reviewStates[proposal.id] === 'decided' ? (
												<>
													{proposal.isReviewerEligible && (
														<Button
															variant="ghost"
															className="underline"
															onClick={() => startEdit(proposal.id)}
														>
															✏️ Edit Decision
														</Button>
													)}
													<Badge
														variant={
															proposal.status === 'approved'
																? 'default'
																: 'destructive'
														}
													>
														{proposal.status === 'approved'
															? '✅ Approved'
															: '❌ Rejected'}{' '}
														for Deliberation
													</Badge>
												</>
											) : (
												<>{renderVoteButtons(proposal)}</>
											)}
										</div>
									</CardFooter>
								</Card>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

function useConsiderationPhaseSearchParams() {
	const [sortBy, setSortBy] = useQueryState<QueryParams['sortBy']>('sortBy', {
		defaultValue: 'createdAt',
		parse: value => queryParamsSchema.shape.sortBy.parse(value),
	})
	const [sortOrder, setSortOrder] = useQueryState<QueryParams['sortOrder']>(
		'sortOrder',
		{
			defaultValue: 'desc',
			parse: value => queryParamsSchema.shape.sortOrder.parse(value),
		},
	)
	const [query, setQuery] = useQueryState('query')
	const [filterBy, setFilterBy] = useQueryState<QueryParams['filterBy']>(
		'filterBy',
		{
			defaultValue: 'all',
			parse: value =>
				z.enum(['all', 'pending', 'approved', 'rejected']).parse(value),
		},
	)

	return {
		filterBy,
		setFilterBy,
		sortBy,
		setSortBy,
		sortOrder,
		setSortOrder,
		query,
		setQuery,
	}
}

function FundingRoundsControls({ disabled }: { disabled?: boolean }) {
	const { sortBy, sortOrder, query, setSortBy, setSortOrder, setQuery } =
		useConsiderationPhaseSearchParams()

	const [searchQuery, setSearchQuery] = useState(query || '')

	const handleSearchKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				setQuery(e.currentTarget.value)
			}
		},
		[setQuery],
	)

	const handleSortByChange = useCallback(
		(value: NonNullable<QueryParams['sortBy']>) => {
			setSortBy(value)
		},
		[setSortBy],
	)

	const handleSortOrderChange = useCallback(
		(value: NonNullable<QueryParams['sortOrder']>) => {
			setSortOrder(value)
		},
		[setSortOrder],
	)

	return (
		<section className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
			{/* Search Form */}
			<form
				onSubmit={e => {
					e.preventDefault()
				}}
				className="relative w-full md:max-w-md"
				aria-label="Search funding rounds"
			>
				<label htmlFor="search-input" className="sr-only">
					Search funding rounds
				</label>
				<SearchIcon
					className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
					aria-hidden="true"
				/>
				<Input
					id="search-input"
					type="search"
					placeholder="Search rounds..."
					value={searchQuery}
					onKeyDown={handleSearchKeyDown}
					onChange={e => setSearchQuery(e.target.value)}
					className="w- max-w-[420px] pl-9"
					disabled={disabled}
				/>
			</form>

			{/* Sorting Controls */}
			<div className="flex gap-2">
				{/* Sort by */}
				<Select
					value={sortBy || undefined}
					onValueChange={handleSortByChange}
					disabled={disabled}
				>
					<SelectTrigger className="w-[90px]" aria-label="Sort by">
						<SelectValue placeholder="Sort by" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{SORT_OPTIONS.map(option => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>

				{/* Sort order */}
				<Select
					value={sortOrder || undefined}
					onValueChange={handleSortOrderChange}
					disabled={disabled}
				>
					<SelectTrigger className="w-[50px]" aria-label="Sort order">
						<SelectValue placeholder="Order" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value="asc">
								<ArrowDownNarrowWideIcon className="mr-1 inline h-5 w-5" />
								Asc
							</SelectItem>
							<SelectItem value="desc">
								<ArrowDownWideNarrowIcon className="mr-1 inline h-5 w-5" />
								Desc
							</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>
		</section>
	)
}

function calculateVoteStats(
	proposal: ConsiderationProposalResponseJson,
	newVote?: { decision: 'APPROVED' | 'REJECTED' },
) {
	const stats = { ...proposal.voteStats }

	// Update vote counts
	if (proposal.userVote && newVote) {
		if (proposal.userVote.decision === 'APPROVED') stats.approved--
		if (proposal.userVote.decision === 'REJECTED') stats.rejected--
		stats.total--
	}

	if (newVote) {
		if (newVote.decision === 'APPROVED') stats.approved++
		if (newVote.decision === 'REJECTED') stats.rejected++
		stats.total++
	}

	// Recalculate reviewer eligibility based on new vote counts
	stats.reviewerEligible = stats.approved >= stats.requiredReviewerApprovals

	return stats
}

// Add this helper component for vote stats
function VoteStatusCard({
	icon,
	title,
	eligibilityStatus,
	isEligible,
	stats,
	children,
}: {
	icon: string
	title: string
	eligibilityStatus: string
	isEligible: boolean
	stats?: React.ReactNode
	children?: React.ReactNode
}) {
	return (
		<div className="rounded-lg border bg-card p-4 shadow-sm">
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-lg">{icon}</span>
					<h4 className="text-sm font-semibold">{title}</h4>
				</div>
				<Badge
					variant={isEligible ? 'default' : 'secondary'}
					className={cn(
						'transition-all',
						isEligible &&
							'bg-green-500/15 text-green-600 hover:bg-green-500/25',
						!isEligible &&
							'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25',
					)}
				>
					{eligibilityStatus}
				</Badge>
			</div>
			{stats}
			{children}
		</div>
	)
}

// Add this helper component for vote progress
function VoteProgress({
	approved,
	rejected,
	total,
}: {
	approved: number
	rejected: number
	total: number
}) {
	const approvedPercent = total > 0 ? (approved / total) * 100 : 0
	const rejectedPercent = total > 0 ? (rejected / total) * 100 : 0

	return (
		<div className="space-y-1">
			<div className="flex justify-between text-xs text-muted-foreground">
				<div className="flex gap-4">
					<span className="font-medium text-green-600">
						{approved} Approved ({Math.round(approvedPercent)}%)
					</span>
					<span className="font-medium text-red-600">
						{rejected} Rejected ({Math.round(rejectedPercent)}%)
					</span>
				</div>
				<span>&nbsp;{total} total</span>
			</div>
			<div className="relative h-2 overflow-hidden rounded-full bg-muted">
				<div className="absolute inset-0 flex w-full">
					<div
						className="bg-green-500 transition-all duration-300"
						style={{ width: `${approvedPercent}%` }}
					/>
					<div
						className="bg-red-500 transition-all duration-300"
						style={{ width: `${rejectedPercent}%` }}
					/>
				</div>
			</div>
		</div>
	)
}

// First, add this helper component for formatting timestamps
function FormattedTimestamp({ timestamp }: { timestamp: number }) {
	const date = new Date(timestamp)
	return (
		<span className="whitespace-nowrap text-xs text-muted-foreground">
			{date.toLocaleString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			})}
		</span>
	)
}

// Add this component for the address display
function VoterAddress({ address }: { address: string }) {
	const [isExpanded, setIsExpanded] = useState(false)

	return (
		<div className="min-w-0 flex-1">
			<code
				className={cn(
					'inline-block max-w-full cursor-pointer rounded bg-muted px-1.5 py-0.5 font-mono text-xs transition-all hover:bg-muted/80',
					isExpanded ? 'break-all' : 'truncate',
				)}
				onClick={() => setIsExpanded(!isExpanded)}
				title={isExpanded ? 'Click to collapse' : 'Click to expand'}
			>
				{isExpanded ? address : truncateWallet(address)}
			</code>
		</div>
	)
}

function ConsiderationPhaseSkeleton() {
	return (
		<div className="space-y-8">
			<header>
				<h2 className="text-2xl font-bold tracking-tight">
					Consideration Phase
				</h2>
				<p className="text-gray-700">
					Review submitted proposals and determine which ones you find valuable
					enough to receive funding.
				</p>
				<div className="mt-2 flex gap-2">
					<Badge className="h-6 w-20 animate-pulse bg-muted" />
					<Badge className="h-6 w-20 animate-pulse bg-muted" />
				</div>
			</header>

			<div className="space-y-6">
				{/* Consideration Phase Proposals */}
				<div className="grid gap-4">
					{new Array(2).fill('').map((_, index) => (
						<div
							key={index}
							className="h-40 w-full animate-pulse rounded-md bg-muted"
						/>
					))}
				</div>
			</div>
		</div>
	)
}
