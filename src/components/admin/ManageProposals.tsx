'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ProposalStatus } from '@prisma/client'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { ApiResponse } from '@/lib/api-response'

interface Proposal {
	id: number
	title: string
	status: ProposalStatus
	totalFundingRequired: number
	createdAt: Date
	submitter: string
	fundingRound?: string
}

interface FundingRound {
	id: string
	name: string
	status: string
}

type SortField =
	| 'id'
	| 'title'
	| 'submitter'
	| 'status'
	| 'totalFundingRequired'
	| 'createdAt'
type SortOrder = 'asc' | 'desc'

interface SortConfig {
	field: SortField
	order: SortOrder
}

export function ManageProposalsComponent() {
	const [proposals, setProposals] = useState<Proposal[]>([])
	const [fundingRounds, setFundingRounds] = useState<FundingRound[]>([])
	const [selectedRound, setSelectedRound] = useState<string>('all')
	const [loading, setLoading] = useState(true)
	const [updating, setUpdating] = useState(false)
	const [sortConfig, setSortConfig] = useState<SortConfig>({
		field: 'id',
		order: 'asc',
	})
	const { toast } = useToast()

	// Fetch funding rounds
	useEffect(() => {
		const fetchFundingRounds = async () => {
			try {
				const response = await fetch('/api/admin/funding-rounds')
				if (!response.ok) throw new Error('Failed to fetch funding rounds')
				const data = await response.json()
				setFundingRounds(data)
			} catch (error) {
				toast({
					title: 'Error',
					description: ApiResponse.Response.errorMessageFromError(
						error,
						'Failed to load funding rounds',
					),
					variant: 'destructive',
				})
			}
		}
		fetchFundingRounds()
	}, [toast])

	// Fetch proposals
	const fetchProposals = useCallback(async () => {
		try {
			setLoading(true)
			const url =
				selectedRound === 'all'
					? '/api/admin/proposals'
					: `/api/admin/funding-rounds/${selectedRound}/proposals`
			const response = await fetch(url)
			if (!response.ok) throw new Error('Failed to fetch proposals')
			const data = await response.json()
			setProposals(data)
		} catch (error) {
			toast({
				title: 'Error',
				description: ApiResponse.Response.errorMessageFromError(
					error,
					'Failed to load proposals',
				),
				variant: 'destructive',
			})
		} finally {
			setLoading(false)
		}
	}, [selectedRound, toast])

	useEffect(() => {
		fetchProposals()
	}, [fetchProposals])

	// Update proposal status
	const updateProposalStatus = async (
		proposalId: number,
		newStatus: ProposalStatus,
	) => {
		try {
			setUpdating(true)
			const response = await fetch(
				`/api/admin/proposals/${proposalId}/status`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: newStatus }),
				},
			)

			if (!response.ok) {
				const data = await response.json()
				throw new Error(
					ApiResponse.Response.errorMessageFromResponse(
						data,
						'Failed to update status',
					),
				)
			}

			toast({
				title: 'Success',
				description: 'Proposal status updated successfully',
			})

			// Refresh proposals
			fetchProposals()
		} catch (error) {
			toast({
				title: 'Error',
				description: ApiResponse.Response.errorMessageFromError(
					error,
					'Failed to update proposal status',
				),
				variant: 'destructive',
			})
		} finally {
			setUpdating(false)
		}
	}

	const getStatusBadgeColor = (status: ProposalStatus): string => {
		const colors: Record<ProposalStatus, string> = {
			DRAFT: 'bg-gray-500',
			CONSIDERATION: 'bg-blue-500',
			DELIBERATION: 'bg-purple-500',
			VOTING: 'bg-yellow-500',
			APPROVED: 'bg-green-500',
			REJECTED: 'bg-red-500',
			WITHDRAWN: 'bg-gray-700',
		}
		return colors[status] || 'bg-gray-500'
	}

	// Sorting functions
	const handleSort = (field: SortField) => {
		setSortConfig(current => ({
			field,
			order:
				current.field === field && current.order === 'asc' ? 'desc' : 'asc',
		}))
	}

	const getSortedProposals = (proposals: Proposal[]): Proposal[] => {
		return [...proposals].sort((a, b) => {
			const { field, order } = sortConfig
			let comparison = 0

			switch (field) {
				case 'id':
					comparison = a.id - b.id
					break
				case 'title':
					comparison = a.title.localeCompare(b.title)
					break
				case 'submitter':
					comparison = a.submitter.localeCompare(b.submitter)
					break
				case 'status':
					comparison = a.status.localeCompare(b.status)
					break
				case 'totalFundingRequired':
					comparison =
						Number(a.totalFundingRequired) - Number(b.totalFundingRequired)
					break
				case 'createdAt':
					comparison =
						new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
					break
				default:
					comparison = 0
			}

			return order === 'asc' ? comparison : -comparison
		})
	}

	const getSortIcon = (field: SortField) => {
		if (sortConfig.field !== field) {
			return <ArrowUpDown className="ml-2 h-4 w-4" />
		}
		return sortConfig.order === 'asc' ? (
			<ArrowUp className="ml-2 h-4 w-4" />
		) : (
			<ArrowDown className="ml-2 h-4 w-4" />
		)
	}

	const sortedProposals = getSortedProposals(proposals)

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-2xl font-bold">Manage Proposals</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="mb-6">
					<Select value={selectedRound} onValueChange={setSelectedRound}>
						<SelectTrigger className="w-[300px]">
							<SelectValue placeholder="Select Funding Round" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Proposals</SelectItem>
							{fundingRounds.map(round => (
								<SelectItem key={round.id} value={round.id}>
									{round.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-8 w-8 animate-spin" />
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									onClick={() => handleSort('id')}
									className="cursor-pointer"
								>
									ID {getSortIcon('id')}
								</TableHead>
								<TableHead
									onClick={() => handleSort('title')}
									className="cursor-pointer"
								>
									Name {getSortIcon('title')}
								</TableHead>
								<TableHead
									onClick={() => handleSort('submitter')}
									className="cursor-pointer"
								>
									Submitter {getSortIcon('submitter')}
								</TableHead>
								<TableHead
									onClick={() => handleSort('status')}
									className="cursor-pointer"
								>
									Status {getSortIcon('status')}
								</TableHead>
								<TableHead
									onClick={() => handleSort('totalFundingRequired')}
									className="cursor-pointer"
								>
									Budget ($MINA) {getSortIcon('totalFundingRequired')}
								</TableHead>
								<TableHead
									onClick={() => handleSort('createdAt')}
									className="cursor-pointer"
								>
									Created {getSortIcon('createdAt')}
								</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedProposals.map(proposal => (
								<TableRow key={proposal.id}>
									<TableCell>{proposal.id}</TableCell>
									<TableCell>{proposal.title}</TableCell>
									<TableCell>{proposal.submitter}</TableCell>
									<TableCell>
										<Badge className={getStatusBadgeColor(proposal.status)}>
											{proposal.status}
										</Badge>
									</TableCell>
									<TableCell>
										{proposal.totalFundingRequired.toLocaleString()}
									</TableCell>
									<TableCell>
										{new Date(proposal.createdAt).toLocaleDateString()}
									</TableCell>
									<TableCell>
										<Select
											defaultValue={proposal.status}
											onValueChange={value =>
												updateProposalStatus(
													proposal.id,
													value as ProposalStatus,
												)
											}
											disabled={updating}
										>
											<SelectTrigger className="w-[180px]">
												<SelectValue placeholder="Change status" />
											</SelectTrigger>
											<SelectContent>
												{Object.values(ProposalStatus).map(status => (
													<SelectItem key={status} value={status}>
														{status}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	)
}
