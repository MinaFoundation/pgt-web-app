'use client'

import { useState, useCallback } from 'react'
import { ArrowDownNarrowWide, ArrowDownWideNarrow, Search } from 'lucide-react'
import { FundingRoundCard } from '@/components/funding-rounds/FundingRoundCard'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectGroup,
	SelectItem,
} from '@/components/ui/select'
import { useFundingRounds } from '@/hooks/use-funding-rounds'
import {
	getPublicFundingRoundsOptionsSchema,
	GetPublicFundingRoundOptions,
} from '@/services'
import { useQueryState } from 'nuqs'
import { FundingRoundWithPhases } from '@/types/funding-round'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const SORT_OPTIONS: {
	value: NonNullable<GetPublicFundingRoundOptions['sortBy']>
	label: string
}[] = [
	{ value: 'startDate', label: 'Date' },
	{ value: 'status', label: 'Status' },
	{ value: 'totalBudget', label: 'Budget' },
]

type FundingRoundTab = 'details' | 'summary'

export default function FundingRounds() {
	const { tab, sortBy, sortOrder, query } = useFundingRoundsSearchParams()

	const { isLoading, data: rounds = [] } = useFundingRounds({
		query,
		sortBy,
		sortOrder,
	})

	return (
		<main className="w-full max-w-5xl space-y-8">
			<header className="space-y-4">
				<FundingRoundsHeader />

				<FundingRoundsTabs />

				<FundingRoundsControls disabled={isLoading} />
			</header>

			{isLoading ? (
				<FundingRoudsListSkeleton />
			) : (
				<FundingRoundsList tab={tab} rounds={rounds} />
			)}
		</main>
	)
}

function useFundingRoundsSearchParams() {
	const [sortBy, setSortBy] = useQueryState<
		GetPublicFundingRoundOptions['sortBy']
	>('sortBy', {
		defaultValue: 'startDate',
		parse: value =>
			getPublicFundingRoundsOptionsSchema.shape.sortBy.parse(value),
	})
	const [sortOrder, setSortOrder] = useQueryState<
		GetPublicFundingRoundOptions['sortOrder']
	>('sortOrder', {
		defaultValue: 'desc',
		parse: value =>
			getPublicFundingRoundsOptionsSchema.shape.sortOrder.parse(value),
	})
	const [query, setQuery] = useQueryState('query')
	const [tab, setTab] = useQueryState<FundingRoundTab>('tab', {
		defaultValue: 'details',
		parse: value => (value === 'summary' ? 'summary' : 'details'),
	})

	return {
		tab,
		setTab,
		sortBy,
		setSortBy,
		sortOrder,
		setSortOrder,
		query,
		setQuery,
	}
}

function FundingRoundsHeader() {
	return (
		<header className="text-dark">
			<h1 className="mb-2 text-2xl font-bold">Funding Rounds</h1>
			<p>Explore and participate in funding rounds for community proposals.</p>
		</header>
	)
}

function FundingRoundsTabs() {
	const { tab, setTab } = useFundingRoundsSearchParams()

	const handleTabChange = useCallback(
		(value: string) => {
			setTab(value as FundingRoundTab)
		},
		[setTab],
	)

	return (
		<Tabs
			defaultValue={tab}
			onValueChange={handleTabChange}
			className="w-full max-w-[420px]"
		>
			<TabsList className="grid h-11 w-full grid-cols-2">
				<TabsTrigger value="details" className="text-base">
					Rounds List
				</TabsTrigger>
				<TabsTrigger value="summary" className="text-base">
					Rounds Summary
				</TabsTrigger>
			</TabsList>
		</Tabs>
	)
}

function FundingRoundsControls({ disabled }: { disabled?: boolean }) {
	const { sortBy, sortOrder, query, setSortBy, setSortOrder, setQuery } =
		useFundingRoundsSearchParams()

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
		(value: NonNullable<GetPublicFundingRoundOptions['sortBy']>) => {
			setSortBy(value)
		},
		[setSortBy],
	)

	const handleSortOrderChange = useCallback(
		(value: NonNullable<GetPublicFundingRoundOptions['sortOrder']>) => {
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
				<Search
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
								<ArrowDownNarrowWide className="mr-1 inline h-5 w-5" />
								Asc
							</SelectItem>
							<SelectItem value="desc">
								<ArrowDownWideNarrow className="mr-1 inline h-5 w-5" />
								Desc
							</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>
		</section>
	)
}

function FundingRoundsList({
	tab,
	rounds,
}: {
	tab: FundingRoundTab
	rounds: FundingRoundWithPhases[]
}) {
	return (
		<section className="flex flex-col gap-6">
			{rounds.map(round => (
				<FundingRoundCard
					key={round.id}
					linkType={tab}
					data={round}
					className="h-full"
				/>
			))}

			{/* Empty State */}
			{rounds.length === 0 && (
				<p className="mt-8 text-center text-gray-500">
					No rounds found matching your search.
				</p>
			)}
		</section>
	)
}

function FundingRoudsListSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			{new Array(2).fill('').map((_, index) => (
				<div
					key={index}
					className="flex h-40 w-full animate-pulse gap-6 rounded-md bg-muted"
				/>
			))}
		</div>
	)
}
