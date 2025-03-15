'use client'

import { useState, useEffect } from 'react'
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
import { CopyIcon, InfoIcon, ArrowUpDown, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { WorkerStatus } from '@prisma/client'
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

// Match the Prisma schema exactly
interface WorkerHeartbeat {
	id: string
	name: string
	lastHeartbeat: string // ISO date string
	status: WorkerStatus
	metadata: Record<string, unknown> | null
	createdAt: string // ISO date string
}

const statusColors = {
	RUNNING: 'bg-blue-500',
	COMPLETED: 'bg-green-500',
	FAILED: 'bg-red-500',
	NOT_STARTED: 'bg-gray-500',
} as const

type SortField = keyof Pick<
	WorkerHeartbeat,
	'createdAt' | 'lastHeartbeat' | 'status' | 'name'
>
type SortOrder = 'asc' | 'desc'

interface SortConfig {
	field: SortField
	order: SortOrder
}

interface PaginatedResponse {
	data: WorkerHeartbeat[]
	pagination: {
		currentPage: number
		totalPages: number
		pageSize: number
		totalCount: number
	}
	sort: {
		field: SortField
		order: SortOrder
	}
}

export const WorkerHeartbeatsTable: React.FC = () => {
	const [heartbeats, setHeartbeats] = useState<WorkerHeartbeat[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [sortConfig, setSortConfig] = useState<SortConfig>({
		field: 'createdAt',
		order: 'desc',
	})

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text)
	}

	useEffect(() => {
		const fetchHeartbeats = async () => {
			try {
				setIsLoading(true)
				const params = new URLSearchParams({
					page: currentPage.toString(),
					pageSize: '25',
					sortField: sortConfig.field,
					sortOrder: sortConfig.order,
				})

				const response = await fetch(`/api/admin/worker-heartbeats?${params}`)
				const json = await response.json()

				if (!response.ok) {
					throw new Error(json.message || 'Failed to fetch heartbeats')
				}

				const { data, pagination } = json as PaginatedResponse
				setHeartbeats(data)
				setTotalPages(pagination.totalPages)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'An error occurred')
			} finally {
				setIsLoading(false)
			}
		}

		fetchHeartbeats()
	}, [currentPage, sortConfig])

	const handleSort = (field: SortField) => {
		setSortConfig(current => ({
			field,
			order:
				current.field === field && current.order === 'asc' ? 'desc' : 'asc',
		}))
	}

	const getSortIcon = (field: SortField) => {
		if (sortConfig.field !== field) {
			return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
		}
		return (
			<ArrowUpDown
				className={cn(
					'ml-2 h-4 w-4 transition-transform',
					sortConfig.order === 'desc' ? 'rotate-180' : '',
					'text-foreground',
				)}
			/>
		)
	}

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

	if (heartbeats.length === 0) {
		return (
			<div className="p-8 text-center text-muted-foreground">
				No worker heartbeats found
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead
								onClick={() => handleSort('name')}
								className="cursor-pointer transition-colors hover:bg-muted/50"
							>
								<div className="flex items-center">
									Job Name {getSortIcon('name')}
								</div>
							</TableHead>
							<TableHead
								onClick={() => handleSort('status')}
								className="cursor-pointer transition-colors hover:bg-muted/50"
							>
								<div className="flex items-center">
									Status {getSortIcon('status')}
								</div>
							</TableHead>
							<TableHead
								onClick={() => handleSort('lastHeartbeat')}
								className="cursor-pointer transition-colors hover:bg-muted/50"
							>
								<div className="flex items-center">
									Last Heartbeat {getSortIcon('lastHeartbeat')}
								</div>
							</TableHead>
							<TableHead
								onClick={() => handleSort('createdAt')}
								className="cursor-pointer transition-colors hover:bg-muted/50"
							>
								<div className="flex items-center">
									Created At {getSortIcon('createdAt')}
								</div>
							</TableHead>
							<TableHead>Metadata</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{heartbeats.map(heartbeat => (
							<TableRow key={heartbeat.id}>
								<TableCell className="font-medium">{heartbeat.name}</TableCell>
								<TableCell>
									<Badge
										variant="secondary"
										className={cn(statusColors[heartbeat.status], 'text-white')}
									>
										{heartbeat.status}
									</Badge>
								</TableCell>
								<TableCell>
									{formatDistanceToNow(new Date(heartbeat.lastHeartbeat), {
										addSuffix: true,
									})}
								</TableCell>
								<TableCell>
									{formatDistanceToNow(new Date(heartbeat.createdAt), {
										addSuffix: true,
									})}
								</TableCell>
								<TableCell>
									{heartbeat.metadata ? (
										<HoverCard>
											<HoverCardTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="hover:bg-muted/50"
												>
													<InfoIcon className="h-4 w-4" />
													<span className="sr-only">View metadata</span>
												</Button>
											</HoverCardTrigger>
											<HoverCardContent align="start" className="w-[520px]">
												<div className="space-y-2">
													<pre className="max-h-[400px] overflow-auto rounded bg-muted p-2 text-sm">
														{JSON.stringify(heartbeat.metadata, null, 2)}
													</pre>
													<Button
														variant="outline"
														size="sm"
														className="w-full"
														onClick={() =>
															copyToClipboard(
																JSON.stringify(heartbeat.metadata, null, 2),
															)
														}
													>
														<CopyIcon className="mr-2 h-4 w-4" />
														Copy JSON
													</Button>
												</div>
											</HoverCardContent>
										</HoverCard>
									) : (
										<span className="text-muted-foreground">No metadata</span>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{totalPages > 1 && (
				<div className="flex justify-center">
					<Pagination
						totalPages={totalPages}
						currentPage={currentPage}
						onPageChange={setCurrentPage}
					>
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
