'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
	AlertCircleIcon,
	ArrowDownNarrowWideIcon,
	ArrowDownWideNarrowIcon,
	FilterIcon,
	InfoIcon,
	NotepadTextIcon,
	SearchIcon,
	SendIcon,
	SquareArrowOutUpRightIcon,
	SquarePenIcon,
	Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SelectFundingRoundDialog } from '@/components/dialogs/SelectFundingRoundDialog'
import { ViewFundingRoundDialog } from '@/components/dialogs/ViewFundingRoundDialog'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useActionFeedback } from '@/hooks/use-action-feedback'
import { Badge } from '@/components/ui/badge'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from './ui/card'
import { useProposals } from '@/hooks/use-proposals'
import {
	ProposalCounts,
	ProposalSummaryWithUserAndFundingRound,
} from '@/types/proposals'
import { useFundingRounds } from '@/hooks/use-funding-rounds'
import {
	cn,
	formatNumberWithCommas,
	isWalletAddress,
	truncateWallet,
} from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
	getProposalsOptionsSchema,
	GetProposalsOptionsSchema,
} from '@/schemas/proposals'
import { useQueryState } from 'nuqs'
import { Input } from './ui/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select'

const SORT_OPTIONS: {
	value: NonNullable<GetProposalsOptionsSchema['sortBy']>
	label: string
}[] = [
	{ value: 'status', label: 'Status' },
	{ value: 'createdAt', label: 'Date' },
	{ value: 'totalFundingRequired', label: 'Budget' },
]

export function ProposalsList() {
	const { toast } = useToast()

	const searchParams = useProposalsSearchParams()

	const {
		data: { proposals, counts } = {
			proposals: [],
			counts: { all: 0, my: 0, others: 0 },
		},
		isLoading,
		refetch: refetchProposals,
	} = useProposals(searchParams)

	const [deleteId, setDeleteId] = useState<number | null>(null)
	const [selectedProposalId, setSelectedProposalId] = useState<number | null>(
		null,
	)
	const [viewFundingRoundOpen, setViewFundingRoundOpen] = useState(false)
	const [selectFundingRoundOpen, setSelectFundingRoundOpen] = useState(false)
	const {
		data: submissionFundingRounds = [],
		isLoading: checkingSubmissionFundingRounds,
	} = useFundingRounds({
		filterBy: 'SUBMISSION',
	})
	const { user } = useAuth()

	const hasActiveSubmissionRounds = submissionFundingRounds.length > 0

	const { handleAction, loading: deleteLoading } = useActionFeedback({
		successMessage: 'Proposal deleted successfully',
		errorMessage: 'Failed to delete proposal',
		requireConfirmation: true,
		confirmMessage:
			'Are you sure you want to delete this proposal? This action cannot be undone.',
	})

	const handleDelete = async (id: number) => {
		await handleAction(async () => {
			const response = await fetch(`/api/proposals/${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				throw new Error('Failed to delete proposal')
			}

			refetchProposals()
		})
	}

	const handleSubmitToFunding = async (roundId: string) => {
		if (!selectedProposalId) return

		try {
			const response = await fetch(
				`/api/proposals/${selectedProposalId}/submit`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ fundingRoundId: roundId }),
				},
			)

			if (!response.ok) throw new Error('Failed to submit proposal')

			toast({
				title: 'Success',
				description: 'Proposal submitted to funding round',
			})

			refetchProposals()
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to submit proposal to funding round',
				variant: 'destructive',
			})
		}
	}

	const handleWithdrawFromFunding = async (proposalId: number) => {
		try {
			const response = await fetch(`/api/proposals/${proposalId}/withdraw`, {
				method: 'POST',
			})

			if (!response.ok) throw new Error('Failed to withdraw proposal')

			toast({
				title: 'Success',
				description: 'Proposal withdrawn from funding round',
			})

			refetchProposals()
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to withdraw proposal',
				variant: 'destructive',
			})
		}
	}

	const handleSubmitClick = (proposalId: number) => {
		if (!hasActiveSubmissionRounds) {
			toast({
				title: 'No Available Funding Rounds',
				description:
					'There are currently no funding rounds accepting proposals. Please check back later.',
				variant: 'default',
			})
			return
		}
		setSelectedProposalId(proposalId)
		setSelectFundingRoundOpen(true)
	}

	const selectedProposal = selectedProposalId
		? proposals.find(p => p.id === selectedProposalId)
		: null

	return (
		<div className="mx-auto w-full max-w-4xl space-y-6 p-4">
			<ProposalsListHeader counts={counts} />

			{isLoading ? (
				<ProposalsListSkeleton />
			) : (
				<div className="space-y-4">
					{proposals.map(proposal => (
						<ProposalCard
							key={proposal.id}
							proposal={proposal}
							isOwner={
								user?.id === proposal.user.id ||
								user?.linkId === proposal.user.linkId
							}
							checkingRounds={checkingSubmissionFundingRounds}
							hasAvailableRounds={hasActiveSubmissionRounds}
							deleteLoading={deleteLoading}
							onSubmit={() => handleSubmitClick(proposal.id)}
							onDelete={() => handleDelete(proposal.id)}
							onViewFundingRound={() => {
								setSelectedProposalId(proposal.id)
								setViewFundingRoundOpen(true)
							}}
						/>
					))}
				</div>
			)}

			<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete your
							proposal.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteId && handleDelete(deleteId)}
							className="bg-red-600 hover:bg-red-700"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<SelectFundingRoundDialog
				open={selectFundingRoundOpen}
				onOpenChange={setSelectFundingRoundOpen}
				onSubmit={handleSubmitToFunding}
				proposalTitle={selectedProposal?.title || ''}
			/>

			{selectedProposal?.fundingRound && (
				<ViewFundingRoundDialog
					open={viewFundingRoundOpen}
					onOpenChange={setViewFundingRoundOpen}
					fundingRound={selectedProposal.fundingRound}
					proposalTitle={selectedProposal.title}
					canWithdraw={true}
					mode="withdraw"
					onWithdraw={() => handleWithdrawFromFunding(selectedProposal.id)}
				/>
			)}
		</div>
	)
}

function useProposalsSearchParams() {
	const [query, setQuery] = useQueryState('query')
	const [filterBy, setFilterBy] = useQueryState<
		GetProposalsOptionsSchema['filterBy']
	>('filterBy', {
		defaultValue: 'all',
		parse: value => getProposalsOptionsSchema.shape.filterBy.parse(value),
	})
	const [sortBy, setSortBy] = useQueryState<
		GetProposalsOptionsSchema['sortBy']
	>('sortBy', {
		defaultValue: 'createdAt',
		parse: value => getProposalsOptionsSchema.shape.sortBy.parse(value),
	})
	const [sortOrder, setSortOrder] = useQueryState<
		GetProposalsOptionsSchema['sortOrder']
	>('sortOrder', {
		defaultValue: 'desc',
		parse: value => getProposalsOptionsSchema.shape.sortOrder.parse(value),
	})

	return {
		query,
		setQuery,
		filterBy,
		setFilterBy,
		sortBy,
		setSortBy,
		sortOrder,
		setSortOrder,
	}
}

function ProposalsControls({ disabled }: { disabled?: boolean }) {
	const { sortBy, sortOrder, query, setSortBy, setSortOrder, setQuery } =
		useProposalsSearchParams()

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
		(value: NonNullable<GetProposalsOptionsSchema['sortBy']>) => {
			setSortBy(value)
		},
		[setSortBy],
	)

	const handleSortOrderChange = useCallback(
		(value: NonNullable<GetProposalsOptionsSchema['sortOrder']>) => {
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

function ProposalsListHeader({ counts }: { counts?: ProposalCounts }) {
	const tabs: {
		label: string
		count?: number
		icon: React.FC<{ className?: string }>
		tab: GetProposalsOptionsSchema['filterBy']
		description: string
	}[] = [
		{
			label: 'All Proposals',
			count: counts?.all,
			icon: NotepadTextIcon,
			tab: 'all',
			description: 'All proposals, including your drafts.',
		},
		{
			label: 'My Proposals',
			count: counts?.my,
			icon: ArrowDownNarrowWideIcon,
			tab: 'my',
			description: 'Your proposals, submmitted or drafts.',
		},
		{
			label: 'Others Proposals',
			count: counts?.others,
			icon: ArrowDownWideNarrowIcon,
			tab: 'others',
			description: 'Proposals submitted by other users.',
		},
	]

	const { filterBy, setFilterBy } = useProposalsSearchParams()

	return (
		<header className="space-y-4">
			<div>
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold">Proposals</h1>
					<Link href="/proposals/create">
						<Button className="button-3d font-semibold" size="sm">
							Create a proposal
						</Button>
					</Link>
				</div>

				<p className="mt-2 text-sm text-gray-600 md:mt-1">
					Browse and manage proposals for the Mina Ecosystem Funding
				</p>
			</div>

			<div className="grid grid-cols-2 gap-2 md:grid-cols-3">
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
						<span>{tabs.find(({ tab }) => tab === filterBy)?.label}</span>
					</h4>
					<p className="text-sm text-muted-foreground">
						{tabs.find(tab => tab.tab === filterBy)?.description}
					</p>
				</div>
			)}

			<ProposalsControls />
		</header>
	)
}

function ProposalCard({
	proposal,
	isOwner,
	checkingRounds,
	hasAvailableRounds,
	deleteLoading,
	onSubmit,
	onDelete,
	onViewFundingRound,
}: {
	proposal: ProposalSummaryWithUserAndFundingRound
	isOwner: boolean
	checkingRounds: boolean
	hasAvailableRounds: boolean
	deleteLoading: boolean
	onSubmit: () => void
	onDelete: () => void
	onViewFundingRound: () => void
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Link
						href={`/proposals/${proposal.id}`}
						className="flex items-center justify-between text-xl font-semibold hover:underline"
					>
						{proposal.title}{' '}
						<SquareArrowOutUpRightIcon className="inline h-5 w-5" />
					</Link>
				</CardTitle>
				<CardDescription className="flex justify-between">
					<span className="w-48 items-center gap-2 overflow-hidden truncate text-sm text-muted-foreground">
						by{' '}
						<span className="font-semibold">
							{isWalletAddress(proposal.user.username)
								? truncateWallet(proposal.user.username)
								: proposal.user.username}
						</span>
					</span>
					<span className="text-sm font-semibold text-gray-600">
						{formatNumberWithCommas(proposal.totalFundingRequired)} MINA
					</span>
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-2">
				<p className="text-sm text-gray-600">
					<span className="font-semibold">Summary:</span>{' '}
					{proposal.summary.substring(0, 240)}...
				</p>
				<p className="text-sm text-gray-600">
					<span className="font-semibold">Created at:</span>{' '}
					{formatDate(new Date(proposal.createdAt))}
				</p>
			</CardContent>
			<CardFooter className="flex flex-col gap-4 sm:flex-row sm:justify-between">
				<div>
					{proposal.fundingRound && isOwner ? (
						<>
							<Button
								variant="outline"
								onClick={onViewFundingRound}
								size="sm"
								className="font-semibold"
							>
								<SquarePenIcon className="mr-1" />
								{proposal.fundingRound.name}
							</Button>
						</>
					) : isOwner ? (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div>
										<Button
											variant="secondary"
											onClick={onSubmit}
											disabled={checkingRounds || !hasAvailableRounds}
											size="sm"
											className="font-semibold"
										>
											<SendIcon className="mr-1" />
											{checkingRounds
												? 'Checking rounds...'
												: 'Submit to funding round'}
										</Button>
									</div>
								</TooltipTrigger>
								{!hasAvailableRounds && (
									<TooltipContent className="bg-secondary">
										<InfoIcon className="mr-1 inline h-3 w-3" />
										No funding rounds are currently accepting proposals
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>
					) : (
						<Badge variant="outline">
							<AlertCircleIcon className="mr-1 inline h-3 w-3" />
							No funding round
						</Badge>
					)}
				</div>
				<div className="flex items-center gap-4">
					<Badge
						variant="outline"
						className="border-gray-200 capitalize text-gray-600"
					>
						{proposal.status.toLowerCase()}
					</Badge>
					{proposal.status === 'DRAFT' && (
						<div className="flex items-center">
							<Link
								href={`/proposals/${proposal.id}/edit`}
								className="text-muted-foreground underline hover:text-foreground"
							>
								<Button
									variant="ghost"
									size="icon"
									onClick={onDelete}
									disabled={deleteLoading}
									className="text-gray-600 hover:bg-secondary/20 hover:text-secondary-dark"
								>
									<SquarePenIcon className="h-5 w-5" />
								</Button>
							</Link>

							<Button
								variant="ghost"
								size="icon"
								onClick={onDelete}
								disabled={deleteLoading}
								className="text-gray-600 hover:bg-destructive/20 hover:text-destructive"
								loading={deleteLoading}
							>
								<Trash2 className="h-5 w-5" />
							</Button>
						</div>
					)}
				</div>
			</CardFooter>
		</Card>
	)
}

function ProposalsListSkeleton() {
	return (
		<div className="space-y-4">
			{Array.from({ length: 3 }).map((_, i) => (
				<Card key={i}>
					<CardHeader>
						<CardTitle>
							<div className="h-6 w-1/2 animate-pulse rounded bg-gray-200" />
						</CardTitle>
						<CardDescription>
							<div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-4">
								<div className="h-6 w-1/4 animate-pulse rounded bg-gray-200" />
								<div className="h-6 w-1/4 animate-pulse rounded bg-gray-200" />
							</div>
							<div className="flex items-center gap-4">
								<div className="h-6 w-1/4 animate-pulse rounded bg-gray-200" />
								<div className="h-6 w-1/4 animate-pulse rounded bg-gray-200" />
							</div>
						</div>
					</CardContent>
					<CardFooter className="flex justify-between gap-4">
						<div>
							<div className="h-6 w-1/4 animate-pulse rounded bg-gray-200" />
						</div>
						<div>
							<div className="h-6 w-1/4 animate-pulse rounded bg-gray-200" />
						</div>
					</CardFooter>
				</Card>
			))}
		</div>
	)
}

const formatDate = (date: Date) =>
	`${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()}`
