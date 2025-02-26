'use client'

import { useState, useEffect, useMemo } from 'react'
import { ProposalStatus } from '@prisma/client'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	CopyIcon,
	InfoIcon,
	ArrowUpDown,
	AlertCircle,
	RefreshCwIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { useProcessProposals } from '@/hooks/use-process-proposals'

interface OCVVote {
	id: number
	proposalId: number
	voteData: {
		votes: Array<{
			hash: string
			memo: string
			nonce: number
			height: number
			status: string
			account: string
			timestamp: number
		}>
		elegible: boolean
		proposal_id: number
		vote_status: string
		total_stake_weight: string
		negative_stake_weight: string
		positive_stake_weight: string
		total_community_votes: number
		total_negative_community_votes: number
		total_positive_community_votes: number
	}
	createdAt: string
	updatedAt: string
	proposal: {
		title: string
		reviewerCount: number
		fundingRoundName: string
		status: ProposalStatus
	}
}

interface PaginatedResponse {
	data: OCVVote[]
	pagination: {
		currentPage: number
		totalPages: number
		pageSize: number
		totalCount: number
	}
	sort: {
		field: string
		order: 'asc' | 'desc'
	}
}

type SortField =
	| 'proposalId'
	| 'ocvStatus'
	| 'reviewerProgress'
	| 'communityVotes'
	| 'fundingRound'
	| 'status'
type SortOrder = 'asc' | 'desc'

export function OCVVotesTable() {
	const [votes, setVotes] = useState<OCVVote[]>([])
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [sortConfig, setSortConfig] = useState<{
		field: SortField
		order: SortOrder
	}>({
		field: 'proposalId',
		order: 'asc',
	})

	useEffect(() => {
		const fetchVotes = async () => {
			try {
				setIsLoading(true)
				const response = await fetch(`/api/admin/ocv-votes?page=${currentPage}`)
				if (!response.ok) throw new Error('Failed to fetch votes')

				const data: PaginatedResponse = await response.json()
				setVotes(data.data)
				setTotalPages(data.pagination.totalPages)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'An error occurred')
			} finally {
				setIsLoading(false)
			}
		}

		fetchVotes()
	}, [currentPage])

	const sortedVotes = useMemo(() => {
		const sortedData = [...votes]
		sortedData.sort((a, b) => {
			switch (sortConfig.field) {
				case 'proposalId':
					return sortConfig.order === 'asc'
						? a.proposalId - b.proposalId
						: b.proposalId - a.proposalId
				case 'ocvStatus':
					return sortConfig.order === 'asc'
						? Number(a.voteData.elegible) - Number(b.voteData.elegible)
						: Number(b.voteData.elegible) - Number(a.voteData.elegible)
				case 'reviewerProgress':
					const progressA = 1 / a.proposal.reviewerCount
					const progressB = 1 / b.proposal.reviewerCount
					return sortConfig.order === 'asc'
						? progressA - progressB
						: progressB - progressA
				case 'communityVotes':
					return sortConfig.order === 'asc'
						? a.voteData.total_positive_community_votes -
								b.voteData.total_positive_community_votes
						: b.voteData.total_positive_community_votes -
								a.voteData.total_positive_community_votes
				case 'fundingRound':
					return sortConfig.order === 'asc'
						? a.proposal.fundingRoundName.localeCompare(
								b.proposal.fundingRoundName,
							)
						: b.proposal.fundingRoundName.localeCompare(
								a.proposal.fundingRoundName,
							)
				case 'status':
					return sortConfig.order === 'asc'
						? a.proposal.status.localeCompare(b.proposal.status)
						: b.proposal.status.localeCompare(a.proposal.status)
				default:
					return 0
			}
		})
		return sortedData
	}, [votes, sortConfig])

	const toggleSort = (field: SortField) => {
		setSortConfig(current => ({
			field,
			order:
				current.field === field && current.order === 'asc' ? 'desc' : 'asc',
		}))
	}

	const { mutate: processProposals, isPending: isProcessingProposals } =
		useProcessProposals()

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="flex items-center gap-2 text-destructive">
					<AlertCircle className="h-4 w-4" />
					<span>{error}</span>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-col items-end gap-4 lg:flex-row lg:items-center lg:justify-between">
				<Alert>
					<AlertDescription className="ml-2 flex items-center gap-2">
						<InfoIcon className="h-4 w-4" />
						<span>
							Vote data updates may take up to 10 minutes to reflect. Check{' '}
							<Link
								href="/admin/worker-heartbeats"
								className="font-medium underline underline-offset-4 hover:text-primary"
							>
								Worker Heartbeats
							</Link>{' '}
							for information on running jobs.
						</span>
					</AlertDescription>
				</Alert>
				<Button
					onClick={() => processProposals()}
					loading={isProcessingProposals}
				>
					<RefreshCwIcon className="mr-1 h-4 w-4" />
					Process Proposals
				</Button>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								<Button
									variant="ghost"
									onClick={() => toggleSort('proposalId')}
								>
									ID
									<ArrowUpDown className="ml-2 h-4 w-4" />
								</Button>
							</TableHead>
							<TableHead>Proposal</TableHead>
							<TableHead>
								<Button
									variant="ghost"
									onClick={() => toggleSort('fundingRound')}
								>
									Funding Round
									<ArrowUpDown className="ml-2 h-4 w-4" />
								</Button>
							</TableHead>
							<TableHead>
								<Button variant="ghost" onClick={() => toggleSort('status')}>
									Status
									<ArrowUpDown className="ml-2 h-4 w-4" />
								</Button>
							</TableHead>
							<TableHead>
								<Button variant="ghost" onClick={() => toggleSort('ocvStatus')}>
									OCV Status
									<ArrowUpDown className="ml-2 h-4 w-4" />
								</Button>
							</TableHead>
							<TableHead>
								<Button
									variant="ghost"
									onClick={() => toggleSort('reviewerProgress')}
								>
									Reviewer Progress
									<ArrowUpDown className="ml-2 h-4 w-4" />
								</Button>
							</TableHead>
							<TableHead>
								<Button
									variant="ghost"
									onClick={() => toggleSort('communityVotes')}
								>
									Community Votes
									<ArrowUpDown className="ml-2 h-4 w-4" />
								</Button>
							</TableHead>
							<TableHead>Last Updated</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedVotes.map(vote => (
							<TableRow key={vote.id}>
								<TableCell>
									<Button
										variant="link"
										className="h-auto p-0 font-medium"
										onClick={() =>
											(window.location.href = `/proposals/${vote.proposalId}`)
										}
									>
										{vote.proposalId}
									</Button>
								</TableCell>
								<TableCell className="font-medium">
									{vote.proposal.title}
								</TableCell>
								<TableCell>{vote.proposal.fundingRoundName}</TableCell>
								<TableCell>
									<Badge
										variant={
											vote.proposal.status === 'CONSIDERATION'
												? 'default'
												: vote.proposal.status === 'DELIBERATION'
													? 'secondary'
													: 'outline'
										}
									>
										{vote.proposal.status.charAt(0) +
											vote.proposal.status.slice(1).toLowerCase()}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge
										variant={vote.voteData.elegible ? 'outline' : 'secondary'}
									>
										{vote.voteData.elegible ? 'Eligible' : 'Not Eligible'}
									</Badge>
								</TableCell>
								<TableCell>
									<div className="space-y-2">
										<Progress
											value={(1 / vote.proposal.reviewerCount) * 100}
											className="h-2"
										/>
										<p className="text-xs text-muted-foreground">
											1 of {vote.proposal.reviewerCount} reviews
										</p>
									</div>
								</TableCell>
								<TableCell>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<div>
												<p className="text-sm">
													Total: {vote.voteData.total_community_votes}
												</p>
												<div className="flex gap-3 text-xs">
													<span className="text-green-600">
														For: {vote.voteData.total_positive_community_votes}
													</span>
													<span className="text-red-600">
														Against:{' '}
														{vote.voteData.total_negative_community_votes}
													</span>
												</div>
											</div>
											<HoverCard>
												<HoverCardTrigger>
													<Button
														variant="ghost"
														size="sm"
														className="h-6 w-6 p-0"
													>
														<InfoIcon className="h-4 w-4" />
													</Button>
												</HoverCardTrigger>
												<HoverCardContent className="w-80">
													<div className="space-y-2">
														<pre className="max-h-[400px] overflow-auto rounded bg-muted p-2 text-sm">
															{JSON.stringify(vote.voteData, null, 2)}
														</pre>
														<Button
															variant="outline"
															size="sm"
															className="w-full"
															onClick={() => {
																navigator.clipboard.writeText(
																	JSON.stringify(vote.voteData, null, 2),
																)
															}}
														>
															<CopyIcon className="mr-2 h-4 w-4" />
															Copy JSON
														</Button>
													</div>
												</HoverCardContent>
											</HoverCard>
										</div>
									</div>
								</TableCell>
								<TableCell>
									{formatDistanceToNow(new Date(vote.updatedAt), {
										addSuffix: true,
									})}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{totalPages > 1 && (
				<div className="flex justify-center">
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
									className={cn(
										'cursor-pointer',
										currentPage === 1 && 'pointer-events-none opacity-50',
									)}
								/>
							</PaginationItem>
							{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
								<PaginationItem key={page}>
									<PaginationLink
										onClick={() => setCurrentPage(page)}
										isActive={currentPage === page}
										className="cursor-pointer"
									>
										{page}
									</PaginationLink>
								</PaginationItem>
							))}
							<PaginationItem>
								<PaginationNext
									onClick={() =>
										setCurrentPage(p => Math.min(totalPages, p + 1))
									}
									className={cn(
										'cursor-pointer',
										currentPage === totalPages &&
											'pointer-events-none opacity-50',
									)}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}
		</div>
	)
}
