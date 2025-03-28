'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trash2, Plus, Loader2Icon } from 'lucide-react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { ChangeFundingRoundStatusDialog } from '@/components/dialogs/ChangeFundingRoundStatusDialog'

interface FundingRound {
	id: string
	name: string
	description: string
	status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
	startDate: string
	endDate: string
	topic: {
		id: string
		name: string
		reviewerGroups: Array<{
			reviewerGroup: {
				id: string
				name: string
			}
		}>
	}
}

export function ManageFundingRoundsComponent() {
	const [rounds, setRounds] = useState<FundingRound[]>([])
	const [loading, setLoading] = useState(true)
	const [loadingButton, setLoadingButton] = useState(false)

	const { toast } = useToast()
	const router = useRouter()
	const [statusDialogOpen, setStatusDialogOpen] = useState(false)
	const [selectedRound, setSelectedRound] = useState<FundingRound | null>(null)

	const fetchRounds = useCallback(async () => {
		try {
			const response = await fetch('/api/admin/funding-rounds')
			if (!response.ok) throw new Error('Failed to fetch funding rounds')
			const data = await response.json()
			setRounds(data)
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to load funding rounds',
				variant: 'destructive',
			})
		} finally {
			setLoading(false)
		}
	}, [toast])

	useEffect(() => {
		fetchRounds()
	}, [fetchRounds])

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this funding round?')) return

		try {
			const response = await fetch(`/api/admin/funding-rounds/${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) throw new Error('Failed to delete funding round')

			toast({
				title: 'Success',
				description: 'Funding round deleted successfully',
			})

			fetchRounds()
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to delete funding round',
				variant: 'destructive',
			})
		}
	}

	const getStatusBadgeVariant = (status: FundingRound['status']) => {
		switch (status) {
			case 'COMPLETED':
				return 'secondary'
			case 'ACTIVE':
				return 'default'
			case 'DRAFT':
				return 'outline'
			case 'CANCELLED':
				return 'destructive'
			default:
				return 'outline'
		}
	}

	const getStatusIcon = (status: FundingRound['status']) => {
		switch (status) {
			case 'COMPLETED':
				return '✅'
			case 'ACTIVE':
				return '🟢'
			case 'DRAFT':
				return '📝'
			case 'CANCELLED':
				return '❌'
			default:
				return '📝'
		}
	}

	const formatPeriod = (startDate: string, endDate: string) => {
		const start = new Date(startDate)
		const end = new Date(endDate)
		return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
	}

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			<div className="space-y-8">
				<div>
					<h1 className="mb-2 text-3xl font-bold">Manage Funding Rounds</h1>
					<p className="text-muted-foreground">
						Select a Round to manage or add a new one.
					</p>
				</div>

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[250px]">FUNDING ROUND</TableHead>
								<TableHead>REVIEWERS GROUP</TableHead>
								<TableHead>DISCUSSION TOPIC</TableHead>
								<TableHead>PERIOD</TableHead>
								<TableHead>STATUS</TableHead>
								<TableHead className="text-right">ACTIONS</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={6} className="py-4 text-center">
										Loading funding rounds...
									</TableCell>
								</TableRow>
							) : (
								rounds.map(round => (
									<TableRow key={round.id}>
										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8"
													onClick={() => handleDelete(round.id)}
													disabled={round.status === 'ACTIVE'}
												>
													<Trash2 className="h-4 w-4" />
													<span className="sr-only">Delete funding round</span>
												</Button>
												<span>{round.name}</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{round.topic.reviewerGroups.map(rg => (
													<Badge key={rg.reviewerGroup.id} variant="outline">
														{rg.reviewerGroup.name}
													</Badge>
												))}
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="secondary">{round.topic.name}</Badge>
										</TableCell>
										<TableCell>
											{formatPeriod(round.startDate, round.endDate)}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												className="h-auto p-0 hover:bg-transparent"
												onClick={() => {
													setSelectedRound(round)
													setStatusDialogOpen(true)
												}}
											>
												<Badge variant={getStatusBadgeVariant(round.status)}>
													{getStatusIcon(round.status)} {round.status}
												</Badge>
											</Button>
										</TableCell>
										<TableCell className="text-right">
											<Link href={`/admin/funding-rounds/${round.id}`}>
												<Button
													variant="ghost"
													size="sm"
													disabled={round.status === 'ACTIVE'}
												>
													Edit
												</Button>
											</Link>
										</TableCell>
									</TableRow>
								))
							)}
							{!loading && rounds.length === 0 && (
								<TableRow>
									<TableCell colSpan={6} className="py-6 text-center">
										No funding rounds found. Create your first funding round.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				<div className="flex flex-wrap gap-4">
					<Link
						href="/admin/funding-rounds/new"
						onClick={() => setLoadingButton(true)}
					>
						<Button
							variant="outline"
							className="gap-2"
							disabled={loadingButton}
						>
							{loadingButton ? (
								<Loader2Icon className="h-4 w-4 animate-spin" />
							) : (
								<Plus className="h-4 w-4" />
							)}
							Add Funding Round
						</Button>
					</Link>
				</div>

				<div>
					<Link href="/admin">
						<Button variant="secondary">Back to Dashboard</Button>
					</Link>
				</div>

				{selectedRound && (
					<ChangeFundingRoundStatusDialog
						open={statusDialogOpen}
						onOpenChange={setStatusDialogOpen}
						currentStatus={selectedRound.status}
						roundName={selectedRound.name}
						roundId={selectedRound.id}
						onStatusChange={fetchRounds}
					/>
				)}
			</div>
		</div>
	)
}
