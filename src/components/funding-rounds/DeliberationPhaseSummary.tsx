import { type FC } from 'react'
import Link from 'next/link'
import {
	format,
	differenceInSeconds,
	formatDistanceToNow,
	isPast,
} from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
	CalendarIcon,
	CheckCircleIcon,
	ThumbsUpIcon,
	ThumbsDownIcon,
	TimerIcon,
	CoinsIcon,
	HashIcon,
	ArrowRightIcon,
} from 'lucide-react'
import { BudgetDistributionChart } from './BudgetDistributionChart'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	TooltipProvider,
} from '@/components/ui/tooltip'

import { DeliberationPhaseSummary as DeliberationPhaseSummaryType } from '@/services/DeliberationService'

interface DeliberationPhaseSummaryProps {
	summary: DeliberationPhaseSummaryType
}

const getPhaseStatus = (startDate: Date, endDate: Date) => {
	const now = new Date()

	if (now < startDate) {
		return {
			status: 'not-started',
			text: `Starts ${formatDistanceToNow(startDate, { addSuffix: true })}`,
			badge: 'secondary' as const,
			progressColor: 'from-blue-500 to-blue-600' as const,
		}
	}

	if (isPast(endDate)) {
		return {
			status: 'ended',
			text: `Ended ${formatDistanceToNow(endDate, { addSuffix: true })}`,
			badge: 'secondary' as const,
			progressColor: 'from-blue-500 to-blue-600' as const,
		}
	}

	return {
		status: 'ongoing',
		text: `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`,
		badge: 'default' as const,
		progressColor: 'from-emerald-500 to-emerald-600' as const,
	}
}

const getProposalStatus = (yesVotes: number, noVotes: number) => {
	return yesVotes > noVotes
		? {
				label: 'Recommended',
				bgColor: 'bg-emerald-50/50 hover:bg-emerald-50/80',
				borderColor: 'border-emerald-200/50',
				icon: CheckCircleIcon,
				textColor: 'text-emerald-600',
			}
		: {
				label: 'Not Recommended',
				bgColor: 'bg-rose-50/50 hover:bg-rose-50/80',
				borderColor: 'border-rose-200/50',
				icon: ThumbsDownIcon,
				textColor: 'text-rose-600',
			}
}

// Add number emoji mapping
const numberToEmoji: Record<string, string> = {
	'0': '0️⃣',
	'1': '1️⃣',
	'2': '2️⃣',
	'3': '3️⃣',
	'4': '4️⃣',
	'5': '5️⃣',
	'6': '6️⃣',
	'7': '7️⃣',
	'8': '8️⃣',
	'9': '9️⃣',
}

const getEmojiRank = (position: number): string => {
	return position.toString()
}

export const DeliberationPhaseSummary: FC<DeliberationPhaseSummaryProps> = ({
	summary,
}) => {
	const phaseStatus = getPhaseStatus(summary.startDate, summary.endDate)

	// If phase hasn't started yet, show countdown widget
	if (phaseStatus.status === 'not-started') {
		// Calculate progress until start
		const now = new Date()
		const announcementDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Assume announced 7 days before
		const totalWaitDuration = differenceInSeconds(
			summary.startDate,
			announcementDate,
		)
		const elapsedWait = differenceInSeconds(now, announcementDate)
		const progressUntilStart = Math.min(
			Math.max((elapsedWait / totalWaitDuration) * 100, 0),
			100,
		)

		return (
			<div className="container mx-auto max-w-2xl">
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center gap-3">
							<h1 className="text-2xl font-bold tracking-tight">
								Deliberation Phase
							</h1>
							<Badge
								variant="secondary"
								className="bg-blue-100 capitalize text-blue-800"
							>
								<TimerIcon className="mr-1 h-3 w-3" />
								Not Started
							</Badge>
						</div>
						<p className="mt-1 text-sm text-muted-foreground">
							The deliberation phase has not started yet. Please check back when
							it begins.
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<p className="text-xs text-muted-foreground">Starts</p>
								<p className="text-sm font-medium">
									{format(summary.startDate, 'MMM dd, yyyy')}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{format(summary.startDate, 'HH:mm')}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Ends</p>
								<p className="text-sm font-medium">
									{format(summary.endDate, 'MMM dd, yyyy')}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{format(summary.endDate, 'HH:mm')}
								</p>
							</div>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">Time until start</span>
								<span className="font-medium text-blue-600">
									{phaseStatus.text}
								</span>
							</div>
							<div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
								<div
									className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
									style={{ width: `${progressUntilStart}%` }}
								/>
							</div>
						</div>
						<div className="pt-4">
							<p className="text-center text-sm text-muted-foreground">
								Come back when the deliberation phase starts to view proposal
								summaries and cast your votes.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Rest of the existing component code for ongoing/ended states
	const totalVotes =
		summary.recommendedProposals + summary.notRecommendedProposals
	const recommendedPercentage =
		(summary.recommendedProposals / totalVotes) * 100

	// Calculate time progress
	const now = new Date()
	const totalDuration = differenceInSeconds(summary.endDate, summary.startDate)
	const elapsed = differenceInSeconds(now, summary.startDate)
	const timeProgress = Math.min(
		Math.max((elapsed / totalDuration) * 100, 0),
		100,
	)

	// Sort proposals by yes votes in descending order
	const sortedProposals = [...summary.proposalVotes].sort(
		(a, b) => b.yesVotes - a.yesVotes,
	)

	return (
		<TooltipProvider>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<div className="flex items-center gap-3">
							<h1 className="text-2xl font-bold tracking-tight">
								{summary.fundingRoundName}&apos;s Deliberation Phase Summary
							</h1>
							<Badge
								variant={phaseStatus.badge}
								className={cn(
									'capitalize',
									phaseStatus.status === 'ended'
										? 'bg-muted text-muted-foreground'
										: 'bg-emerald-100 text-emerald-800',
								)}
							>
								<TimerIcon className="mr-1 h-3 w-3" />
								{phaseStatus.status}
							</Badge>
						</div>
						<p className="mt-1 text-sm text-muted-foreground">
							Overview of the deliberation phase progress and reviewer
							recommendations
						</p>
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-[1fr,2fr]">
					<div className="space-y-4">
						{/* Phase Duration Card */}
						<Card className="h-[200px]">
							<CardHeader className="flex flex-row items-center justify-between py-2">
								<CardTitle className="flex items-center gap-2 text-sm font-medium">
									<CalendarIcon className="h-4 w-4 text-muted-foreground" />
									Phase Duration
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<p className="text-xs text-muted-foreground">Start</p>
										<p className="text-sm font-medium">
											{format(summary.startDate, 'MMM dd, yyyy')}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{format(summary.startDate, 'HH:mm')}
										</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">End</p>
										<p className="text-sm font-medium">
											{format(summary.endDate, 'MMM dd, yyyy')}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{format(summary.endDate, 'HH:mm')}
										</p>
									</div>
								</div>
								<div className="space-y-2">
									<div className="flex items-center justify-between text-xs">
										<span className="text-muted-foreground">Status</span>
										<span className="flex-1 text-center text-right font-medium">
											{phaseStatus.text}
										</span>
									</div>
									<div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
										<div
											className={cn(
												'h-full bg-gradient-to-r transition-all duration-500',
												phaseStatus.status === 'ended'
													? phaseStatus.progressColor
													: timeProgress <= 33
														? 'from-emerald-500 to-emerald-600'
														: timeProgress <= 66
															? 'from-amber-500 to-amber-600'
															: 'from-rose-500 to-rose-600',
											)}
											style={{
												width:
													phaseStatus.status === 'ended'
														? '100%'
														: `${timeProgress}%`,
											}}
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Reviewer Recommendations Card */}
						<Card className="h-[200px]">
							<CardHeader className="flex flex-row items-center justify-between py-2">
								<CardTitle className="flex items-center gap-2 text-sm font-medium">
									<CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
									Reviewer Recommendations
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-4">
									<p className="text-sm text-muted-foreground">
										Out of{' '}
										<span className="font-medium text-foreground">
											{totalVotes}
										</span>{' '}
										proposals,{' '}
										<span className="font-medium text-emerald-600">
											{summary.recommendedProposals}
										</span>{' '}
										are recommended by reviewers, while{' '}
										<span className="font-medium text-rose-600">
											{summary.notRecommendedProposals}
										</span>{' '}
										are not recommended.
									</p>
									<div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
										<div className="absolute inset-0 flex w-full">
											<div
												className="bg-emerald-500 transition-all duration-500"
												style={{ width: `${recommendedPercentage}%` }}
											/>
											<div
												className="bg-rose-500 transition-all duration-500"
												style={{ width: `${100 - recommendedPercentage}%` }}
											/>
										</div>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<Tooltip>
										<TooltipTrigger>
											<div className="flex items-center gap-2">
												<div className="h-3 w-3 rounded-full bg-emerald-500" />
												<div>
													<p className="text-sm font-medium text-emerald-600">
														{summary.recommendedProposals}
													</p>
													<p className="text-xs text-muted-foreground">
														Recommended
													</p>
												</div>
											</div>
										</TooltipTrigger>
										<TooltipContent>
											<p>Number of proposals recommended by reviewers</p>
										</TooltipContent>
									</Tooltip>
									<Tooltip>
										<TooltipTrigger>
											<div className="flex items-center gap-2">
												<div className="h-3 w-3 rounded-full bg-rose-500" />
												<div>
													<p className="text-sm font-medium text-rose-600">
														{summary.notRecommendedProposals}
													</p>
													<p className="text-xs text-muted-foreground">
														Not Recommended
													</p>
												</div>
											</div>
										</TooltipTrigger>
										<TooltipContent>
											<p>Number of proposals not recommended by reviewers</p>
										</TooltipContent>
									</Tooltip>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Budget Distribution Chart */}
					<BudgetDistributionChart budgetBreakdown={summary.budgetBreakdown} />
				</div>

				{/* Proposals List */}
				<Card>
					<CardHeader className="py-4">
						<CardTitle className="text-sm font-medium">
							Ranked Proposals
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ScrollArea className="h-[400px] w-full">
							<div className="grid grid-cols-1 gap-x-4 pr-4 md:grid-cols-2">
								{/* Left Column */}
								<div className="space-y-4">
									{sortedProposals
										.slice(0, Math.ceil(sortedProposals.length / 2))
										.map((proposal, index) => {
											const actualRank = index + 1
											const status = getProposalStatus(
												proposal.yesVotes,
												proposal.noVotes,
											)
											const StatusIcon = status.icon

											return (
												<Tooltip key={proposal.id}>
													<TooltipTrigger asChild>
														<Link
															href={`/proposals/${proposal.id}`}
															className="block"
														>
															<div
																className={cn(
																	'group flex flex-col gap-2 rounded-lg border p-4 transition-all',
																	'hover:shadow-md',
																	status.bgColor,
																	status.borderColor,
																)}
															>
																<div className="flex items-start justify-between">
																	<div className="space-y-1">
																		<div className="flex items-center gap-2">
																			<span
																				className="text-lg font-medium"
																				aria-label={`Rank ${actualRank}`}
																			>
																				{getEmojiRank(actualRank)}
																			</span>
																			<h3 className="font-medium transition-colors group-hover:text-primary">
																				{proposal.title}
																			</h3>
																			<Badge
																				variant="outline"
																				className={cn(
																					'text-xs font-normal',
																					status.textColor,
																					status.borderColor,
																				)}
																			>
																				<StatusIcon className="mr-1 h-3 w-3" />
																				{status.label}
																			</Badge>
																		</div>
																		<div className="flex items-center gap-2 text-sm text-muted-foreground">
																			<span>{proposal.proposer}</span>
																		</div>
																	</div>
																	<div className="flex items-center gap-3 text-sm">
																		<div className="flex items-center gap-1 text-emerald-600">
																			<ThumbsUpIcon className="h-4 w-4" />
																			<span>{proposal.yesVotes}</span>
																		</div>
																		<div className="flex items-center gap-1 text-rose-600">
																			<ThumbsDownIcon className="h-4 w-4" />
																			<span>{proposal.noVotes}</span>
																		</div>
																	</div>
																</div>
																<div className="flex items-center justify-between text-xs text-muted-foreground">
																	<div className="flex items-center gap-1">
																		<HashIcon className="h-3 w-3" />
																		<span>{proposal.id}</span>
																	</div>
																	<div className="flex items-center gap-1">
																		<CoinsIcon className="h-3 w-3" />
																		<span>
																			{proposal.totalFundingRequired.toNumber()}{' '}
																			MINA
																		</span>
																	</div>
																</div>
															</div>
														</Link>
													</TooltipTrigger>
													<TooltipContent>
														<p>Click to view proposal details</p>
													</TooltipContent>
												</Tooltip>
											)
										})}
								</div>
								{/* Right Column */}
								<div className="space-y-4">
									{sortedProposals
										.slice(Math.ceil(sortedProposals.length / 2))
										.map((proposal, index) => {
											const actualRank =
												Math.ceil(sortedProposals.length / 2) + index + 1
											const status = getProposalStatus(
												proposal.yesVotes,
												proposal.noVotes,
											)
											const StatusIcon = status.icon

											return (
												<Tooltip key={proposal.id}>
													<TooltipTrigger asChild>
														<Link
															href={`/proposals/${proposal.id}`}
															className="block"
														>
															<div
																className={cn(
																	'group flex flex-col gap-2 rounded-lg border p-4 transition-all',
																	'hover:shadow-md',
																	status.bgColor,
																	status.borderColor,
																)}
															>
																<div className="flex items-start justify-between">
																	<div className="space-y-1">
																		<div className="flex items-center gap-2">
																			<span
																				className="text-lg font-medium"
																				aria-label={`Rank ${actualRank}`}
																			>
																				{getEmojiRank(actualRank)}
																			</span>
																			<h3 className="font-medium transition-colors group-hover:text-primary">
																				{proposal.title}
																			</h3>
																			<Badge
																				variant="outline"
																				className={cn(
																					'text-xs font-normal',
																					status.textColor,
																					status.borderColor,
																				)}
																			>
																				<StatusIcon className="mr-1 h-3 w-3" />
																				{status.label}
																			</Badge>
																		</div>
																		<div className="flex items-center gap-2 text-sm text-muted-foreground">
																			<span>{proposal.proposer}</span>
																		</div>
																	</div>
																	<div className="flex items-center gap-3 text-sm">
																		<div className="flex items-center gap-1 text-emerald-600">
																			<ThumbsUpIcon className="h-4 w-4" />
																			<span>{proposal.yesVotes}</span>
																		</div>
																		<div className="flex items-center gap-1 text-rose-600">
																			<ThumbsDownIcon className="h-4 w-4" />
																			<span>{proposal.noVotes}</span>
																		</div>
																	</div>
																</div>
																<div className="flex items-center justify-between text-xs text-muted-foreground">
																	<div className="flex items-center gap-1">
																		<HashIcon className="h-3 w-3" />
																		<span>#{proposal.id}</span>
																	</div>
																	<div className="flex items-center gap-1">
																		<CoinsIcon className="h-3 w-3" />
																		<span>
																			{proposal.totalFundingRequired.toNumber()}{' '}
																			MINA
																		</span>
																	</div>
																</div>
															</div>
														</Link>
													</TooltipTrigger>
													<TooltipContent>
														<p>Click to view proposal details</p>
													</TooltipContent>
												</Tooltip>
											)
										})}
								</div>
							</div>
						</ScrollArea>
					</CardContent>
				</Card>
			</div>
		</TooltipProvider>
	)
}
