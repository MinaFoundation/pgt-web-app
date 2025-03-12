'use client'

import { useState, useMemo, useEffect } from 'react'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	ChevronRight,
	ChevronDown,
	CircleDashedIcon,
	NotepadTextIcon,
	ThumbsUpIcon,
	ThumbsDownIcon,
	FilterIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeliberationPhase, useDeliberationVote } from '@/hooks'
import { DeliberationDialog } from '@/components/dialogs/DeliberationDialog'
import Link from 'next/link'
import type {
	DeliberationProposal,
	DeliberationComment,
	DeliberationVote,
} from '@/types/deliberation'
import { ReviewerComments } from '@/components/ReviewerComments'
import { useAuth } from '@/contexts/AuthContext'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { MessageSquare, ExternalLink, Clock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
	GetDeliberationProposalsOptions,
	getDeliberationProposalsOptionsSchema,
} from '@/schemas/deliberation'
import { useQueryState } from 'nuqs'

interface Props {
	fundingRoundId: string
}

interface DialogState {
	open: boolean
	proposalId?: number
	mode?: 'recommend' | 'not-recommend' | 'community'
	existingVote?: DeliberationVote
}

export function DeliberationPhase({ fundingRoundId }: Props) {
	const { user } = useAuth()

	const { filterBy, setFilterBy } = useDeliberationPhaseSearchParams()

	const [proposals, setProposals] = useState([] as DeliberationProposal[])

	const { data, isLoading } = useDeliberationPhase(fundingRoundId, {
		filterBy,
	})

	useEffect(() => {
		if (!data) return
		setProposals(data.proposals)
	}, [data])

	const [expanded, setExpanded] = useState<Record<number, boolean>>({})
	const [dialogProps, setDialogProps] = useState<DialogState>({ open: false })

	const toggleExpanded = (proposalId: number) => {
		setExpanded(prev => ({
			...prev,
			[proposalId]: !prev[proposalId],
		}))
	}

	const { submitVote } = useDeliberationVote()

	// Sort proposals - pending first, then voted
	const sortedProposals = useMemo(() => {
		return [...proposals].sort((a, b) => {
			if (!a.userDeliberation && b.userDeliberation) return -1
			if (a.userDeliberation && !b.userDeliberation) return 1
			return 0
		})
	}, [proposals])

	const handleSubmit = async (feedback: string, recommendation?: boolean) => {
		if (!dialogProps.proposalId || !user) return

		try {
			const response = await submitVote(
				dialogProps.proposalId,
				feedback,
				recommendation,
			)

			setProposals(prevProposals => {
				return prevProposals.map(proposal => {
					if (proposal.id !== dialogProps.proposalId) {
						return proposal
					}

					// Create new comment object with proper date handling
					const newComment: DeliberationComment = {
						id: response.id,
						feedback,
						recommendation: proposal.isReviewerEligible
							? recommendation
							: undefined,
						createdAt: new Date(), // This ensures it's a proper Date object
						isReviewerComment: Boolean(proposal.isReviewerEligible),
						...(proposal.isReviewerEligible
							? {
									reviewer: {
										username: user.metadata.username,
									},
								}
							: {}),
					}

					// Update comments list with proper date handling
					let updatedComments = [...proposal.reviewerComments]
					const existingCommentIndex = updatedComments.findIndex(
						c =>
							(c.isReviewerComment &&
								c.reviewer?.username === user.metadata.username) ||
							(!c.isReviewerComment && !c.reviewer?.username),
					)

					if (existingCommentIndex !== -1) {
						updatedComments[existingCommentIndex] = newComment
					} else {
						updatedComments = [...updatedComments, newComment]
					}

					// Ensure all dates are Date objects before sorting
					updatedComments = updatedComments.map(comment => ({
						...comment,
						createdAt: new Date(comment.createdAt),
					}))

					// Sort comments
					updatedComments.sort(
						(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
					)

					return {
						...proposal,
						userDeliberation: {
							feedback,
							recommendation,
							createdAt: new Date(),
							isReviewerVote: Boolean(proposal.isReviewerEligible),
						},
						hasVoted: true,
						reviewerComments: updatedComments,
					}
				})
			})

			setDialogProps({ open: false })
		} catch (error) {
			console.error('Failed to submit vote:', error)
		}
	}

	const openEditDialog = (proposal: DeliberationProposal) => {
		const mode = proposal.isReviewerEligible
			? proposal.userDeliberation?.recommendation
				? 'recommend'
				: 'not-recommend'
			: 'community'

		setDialogProps({
			open: true,
			proposalId: proposal.id,
			mode,
			existingVote: proposal.userDeliberation,
		})
	}

	const renderVoteStatus = (proposal: DeliberationProposal) => {
		if (!proposal.userDeliberation) return null

		if (proposal.isReviewerEligible) {
			return (
				<Badge
					variant={
						proposal.userDeliberation.recommendation ? 'default' : 'destructive'
					}
				>
					{proposal.userDeliberation.recommendation
						? '✅ Recommended'
						: '❌ Not Recommended'}
				</Badge>
			)
		}

		return <Badge variant="secondary">💭 Deliberation Submitted</Badge>
	}

	const renderActionButtons = (proposal: DeliberationProposal) => {
		if (proposal.userDeliberation) {
			return (
				<Button variant="outline" onClick={() => openEditDialog(proposal)}>
					✏️ Edit {proposal.isReviewerEligible ? 'Review' : 'Deliberation'}
				</Button>
			)
		}

		if (proposal.isReviewerEligible) {
			return (
				<>
					<Button
						variant="default"
						className="bg-green-600 hover:bg-green-700"
						onClick={() =>
							setDialogProps({
								open: true,
								proposalId: proposal.id,
								mode: 'recommend',
							})
						}
					>
						✅ Recommend for Vote
					</Button>
					<Button
						variant="destructive"
						onClick={() =>
							setDialogProps({
								open: true,
								proposalId: proposal.id,
								mode: 'not-recommend',
							})
						}
					>
						❌ Not Recommend
					</Button>
				</>
			)
		}

		return (
			<Button
				variant="secondary"
				onClick={() =>
					setDialogProps({
						open: true,
						proposalId: proposal.id,
						mode: 'community',
					})
				}
			>
				💭 Deliberate
			</Button>
		)
	}

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-7xl p-6">
				<Card>
					<CardContent className="p-6">
						<div className="text-center">Loading proposals...</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	const tabs: {
		label: string
		count: number
		icon: React.FC<{ className?: string }>
		tab: GetDeliberationProposalsOptions['filterBy']
		description: string
	}[] = [
		{
			label: 'Proposals',
			count: proposals.length,
			icon: NotepadTextIcon,
			tab: 'all',
			description: 'All proposals moved to deliberation.',
		},
		{
			label: 'Recommended',
			count: proposals.filter(p => p.isRecommended).length,
			icon: ThumbsUpIcon,
			tab: 'recommended',
			description:
				'These proposals are recommended by reviwers. Community can still vote on these proposals.',
		},
		{
			label: 'Not Recommended',
			count: proposals.filter(p => p.status === 'rejected').length,
			icon: ThumbsDownIcon,
			tab: 'not-recommended',
			description:
				'These proposals are not recommended by reviewers. Community can still vote on these proposals.',
		},
		{
			label: 'Pending',
			count: proposals.filter(p => p.status === 'pending').length,
			icon: CircleDashedIcon,
			tab: 'pending',
			description:
				'These proposals are still pending reviewers recommendation. Community can still vote on these proposals.',
		},
	]

	return (
		<div className="container mx-auto max-w-7xl px-2 md:px-6">
			<div className="space-y-8">
				<header className="space-y-4">
					<div>
						<h2 className="text-3xl font-bold">Deliberation Phase:</h2>
						<p>
							Discuss and refine proposals with the community before final
							voting.
						</p>
					</div>

					<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
						{tabs.map(tab => (
							<Button
								key={tab.tab}
								variant="outline"
								onClick={() => setFilterBy(tab.tab ?? null)}
								className={cn(
									'flex items-center gap-1 font-semibold hover:bg-secondary/10',
									filterBy === tab.tab
										? 'border border-secondary/40 bg-secondary/20 text-secondary-dark hover:bg-secondary/20 hover:text-secondary-dark'
										: 'text-muted-foreground hover:text-muted-foreground',
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
				</header>

				<div className="space-y-6">
					{sortedProposals.map((proposal: DeliberationProposal) => (
						<Card
							key={proposal.id}
							className={cn(
								'transition-colors hover:bg-muted/50',
								proposal.userDeliberation && 'bg-muted/10',
							)}
						>
							<CardHeader>
								<div className="flex items-start justify-between">
									<div>
										<CardTitle className="text-2xl">{proposal.title}</CardTitle>
										<CardDescription className="break-all">
											👤 Submitted by {proposal.submitter}
										</CardDescription>
									</div>
									{renderVoteStatus(proposal)}
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

								{proposal.userDeliberation && (
									<div className="rounded-lg bg-muted p-4">
										<h4 className="mb-2 font-medium">Your Deliberation:</h4>
										<p className="text-muted-foreground">
											{proposal.userDeliberation.feedback}
										</p>
									</div>
								)}
								{proposal.gptSurveySummary && (
									<Accordion type="single" collapsible>
										<AccordionItem value="summary">
											<AccordionTrigger className="flex items-center gap-2">
												<MessageSquare className="h-4 w-4" />
												<span className="font-semibold">
													Community Deliberation Summary
												</span>
											</AccordionTrigger>
											<AccordionContent>
												<div className="space-y-4 rounded-lg bg-muted/50 p-4">
													<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
														<Clock className="h-3.5 w-3.5" />
														Last updated:{' '}
														{new Date(
															proposal.gptSurveySummary.summaryUpdatedAt,
														).toLocaleString()}
													</div>
													<div className="prose prose-sm dark:prose-invert max-w-none">
														<ReactMarkdown>
															{proposal.gptSurveySummary.summary}
														</ReactMarkdown>
													</div>
												</div>
											</AccordionContent>
										</AccordionItem>
									</Accordion>
								)}
								{expanded[proposal.id] &&
									proposal.reviewerComments.length > 0 && (
										<ReviewerComments comments={proposal.reviewerComments} />
									)}
							</CardContent>

							<CardFooter className="flex items-center justify-between">
								<div className="flex items-center gap-4">
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
									<Button variant="ghost" size="sm" className="gap-2" asChild>
										<Link
											href={`/proposals/${proposal.id}`}
											target="_blank"
											rel="noopener noreferrer"
										>
											View Proposal Page
											<ExternalLink className="h-4 w-4" />
										</Link>
									</Button>
								</div>

								<div className="flex items-center gap-4">
									{renderActionButtons(proposal)}
								</div>
							</CardFooter>
						</Card>
					))}
				</div>
			</div>

			<DeliberationDialog
				open={dialogProps.open}
				onOpenChange={(open: boolean) =>
					setDialogProps({ ...dialogProps, open })
				}
				proposalId={dialogProps.proposalId!}
				isReviewer={
					proposals.find(
						(p: DeliberationProposal) => p.id === dialogProps.proposalId,
					)?.isReviewerEligible ?? false
				}
				mode={dialogProps.mode!}
				existingVote={dialogProps.existingVote}
				onSubmit={handleSubmit}
			/>
		</div>
	)
}

function useDeliberationPhaseSearchParams() {
	const [sortBy, setSortBy] = useQueryState<
		GetDeliberationProposalsOptions['sortBy']
	>('sortBy', {
		defaultValue: 'createdAt',
		parse: value =>
			getDeliberationProposalsOptionsSchema.shape.sortBy.parse(value),
	})
	const [sortOrder, setSortOrder] = useQueryState<
		GetDeliberationProposalsOptions['sortOrder']
	>('sortOrder', {
		defaultValue: 'desc',
		parse: value =>
			getDeliberationProposalsOptionsSchema.shape.sortOrder.parse(value),
	})
	const [query, setQuery] = useQueryState('query')
	const [filterBy, setFilterBy] = useQueryState<
		GetDeliberationProposalsOptions['filterBy']
	>('filterBy', {
		defaultValue: 'all',
		parse: value =>
			getDeliberationProposalsOptionsSchema.shape.filterBy.parse(value),
	})

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
