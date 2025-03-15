'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PenIcon, Trash2 } from 'lucide-react'
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
import { ProposalSummaryWithUserAndFundingRound } from '@/types/proposals'
import { useFundingRounds } from '@/hooks/use-funding-rounds'
import { isWalletAddress, truncateWallet } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

export function ProposalsList() {
	const { toast } = useToast()

	const {
		data: proposals = [],
		isLoading,
		refetch: refetchProposals,
	} = useProposals()

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

			// Refresh proposals list
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

	if (isLoading) {
		return <ProposalsListSkeleton />
	}

	if (proposals.length === 0) {
		return (
			<div className="py-8 text-center">
				<p className="mb-4 text-muted-foreground">No proposals found</p>
				<Link href="/proposals/create">
					<Button>Create your first proposal</Button>
				</Link>
			</div>
		)
	}

	const selectedProposal = selectedProposalId
		? proposals.find(p => p.id === selectedProposalId)
		: null

	return (
		<div className="mx-auto w-full max-w-4xl p-6">
			<ProposalsListHeader />

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

function ProposalsListHeader() {
	return (
		<header className="mb-6 flex items-center justify-between border-b border-gray-200 pb-6">
			<div>
				<h1 className="text-3xl font-bold">Proposals</h1>
				<p className="text-sm text-gray-600">
					Browse and manage governance proposals for the Mina Protocol
				</p>
			</div>

			<Link href="/proposals/create">
				<Button className="button-3d font-semibold">Create a proposal</Button>
			</Link>
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
						className="text-xl font-medium hover:underline"
					>
						{proposal.title}
					</Link>
				</CardTitle>
				<CardDescription>
					<div className="flex w-48 items-center gap-2 overflow-hidden truncate text-sm text-muted-foreground">
						by{' '}
						{!isWalletAddress(proposal.user.username)
							? truncateWallet(proposal.user.username)
							: proposal.user.username}
					</div>
				</CardDescription>
			</CardHeader>

			<CardContent>
				{proposal.status === 'DRAFT' && (
					<div className="flex items-center justify-between gap-4">
						{proposal.fundingRound ? (
							<Button variant="secondary" onClick={onViewFundingRound}>
								View Funding Round Details
							</Button>
						) : (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div>
											<Button
												variant="secondary"
												onClick={onSubmit}
												disabled={checkingRounds || !hasAvailableRounds}
											>
												{checkingRounds
													? 'Checking rounds...'
													: 'Submit to funding round'}
											</Button>
										</div>
									</TooltipTrigger>
									{!hasAvailableRounds && (
										<TooltipContent>
											<p>No funding rounds are currently accepting proposals</p>
										</TooltipContent>
									)}
								</Tooltip>
							</TooltipProvider>
						)}

						<div className="flex items-center">
							<Link
								href={`/proposals/${proposal.id}/edit`}
								className="text-muted-foreground underline hover:text-foreground"
							>
								Edit
							</Link>

							<Button
								variant="ghost"
								size="icon"
								onClick={onDelete}
								disabled={deleteLoading}
								className="text-muted-foreground hover:text-foreground"
							>
								{deleteLoading ? (
									<span className="animate-spin">⌛</span>
								) : (
									<Trash2 className="h-5 w-5" />
								)}
								<span className="sr-only">Delete proposal</span>
							</Button>
						</div>
					</div>
				)}
			</CardContent>
			<CardFooter className="flex justify-between gap-4">
				<div>
					{proposal.fundingRound && isOwner ? (
						<>
							<Button variant="outline" onClick={onViewFundingRound}>
								<PenIcon className="mr-1 h-2 w-2" />
								{proposal.fundingRound.name}
							</Button>
						</>
					) : (
						proposal.fundingRound && (
							<Badge variant="outline">{proposal.fundingRound.name}</Badge>
						)
					)}
				</div>
				<Badge variant="outline" className="capitalize">
					Status: {proposal.status.toLowerCase()}
				</Badge>
			</CardFooter>
		</Card>
	)
}

function ProposalsListSkeleton() {
	return (
		<div className="mx-auto w-full max-w-4xl p-6">
			<ProposalsListHeader />
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
		</div>
	)
}
