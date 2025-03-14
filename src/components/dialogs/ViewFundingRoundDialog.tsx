'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FundingRoundWithPhases } from '@/types/funding-round'

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
	fundingRound: FundingRoundWithPhases
	proposalTitle: string
	onWithdraw?: () => Promise<void>
	mode?: 'view' | 'withdraw'
	canWithdraw?: boolean
}

export function ViewFundingRoundDialog({
	open,
	onOpenChange,
	fundingRound,
	proposalTitle,
	onWithdraw,
	mode = 'withdraw',
	canWithdraw = false,
}: Props) {
	const [loading, setLoading] = useState(false)
	const [confirmWithdraw, setConfirmWithdraw] = useState(false)
	const { toast } = useToast()

	const handleWithdraw = async () => {
		if (!onWithdraw) {
			console.warn('onWithdraw callback is not defined')
			return
		}

		try {
			setLoading(true)
			await onWithdraw()
			onOpenChange(false)
			toast({
				title: 'Proposal Withdrawn',
				description:
					'Your proposal has been withdrawn. You will need to create a new proposal to submit to a funding round.',
				variant: 'default',
			})
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to withdraw proposal',
				variant: 'destructive',
			})
		} finally {
			setLoading(false)
			setConfirmWithdraw(false)
		}
	}

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>🎯 Funding Round Details</DialogTitle>
						<DialogDescription>
							{mode === 'withdraw' ? (
								<>
									Your proposal, titled <i>{proposalTitle}</i>, is submitted to
									the following funding round:
								</>
							) : (
								<>
									Review the funding round details before submitting your
									proposal:
								</>
							)}
						</DialogDescription>
					</DialogHeader>
					<Card className="mt-4">
						<CardHeader>
							<CardTitle>📋 {fundingRound.name}</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="mb-4 text-sm text-muted-foreground">
								{fundingRound.description}
							</p>
							<div className="mt-4">
								<table className="w-full text-sm">
									<tbody>
										<tr className="border-b">
											<td className="py-2 font-medium">🔖 Status:</td>
											<td>
												<Badge variant="outline">{fundingRound.status}</Badge>
											</td>
										</tr>
										<tr className="border-b">
											<td className="py-2 font-medium">📅 Period:</td>
											<td>
												{format(new Date(fundingRound.startDate), 'PPP')} -{' '}
												{format(new Date(fundingRound.endDate), 'PPP')}
											</td>
										</tr>
										<tr className="border-b">
											<td className="py-2 font-medium">
												🕒 Consideration Phase:
											</td>
											<td>
												{format(
													new Date(fundingRound.phases.consideration.startDate),
													'PPP',
												)}{' '}
												-{' '}
												{format(
													new Date(fundingRound.phases.consideration.endDate),
													'PPP',
												)}
											</td>
										</tr>
										<tr className="border-b">
											<td className="py-2 font-medium">
												🗣️ Deliberation Phase:
											</td>
											<td>
												{format(
													new Date(fundingRound.phases.deliberation.startDate),
													'PPP',
												)}{' '}
												-{' '}
												{format(
													new Date(fundingRound.phases.deliberation.endDate),
													'PPP',
												)}
											</td>
										</tr>
										<tr>
											<td className="py-2 font-medium">🗳️ Voting Phase:</td>
											<td>
												{format(
													new Date(fundingRound.phases.voting.startDate),
													'PPP',
												)}{' '}
												-{' '}
												{format(
													new Date(fundingRound.phases.voting.endDate),
													'PPP',
												)}
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</CardContent>
					</Card>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={loading}
						>
							Close
						</Button>
						{mode === 'withdraw' && onWithdraw && canWithdraw && (
							<Button
								variant="destructive"
								onClick={() => setConfirmWithdraw(true)}
								disabled={loading}
							>
								Withdraw Proposal
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={confirmWithdraw} onOpenChange={setConfirmWithdraw}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>⚠️ Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This will withdraw your proposal from the funding round. You will
							need to create a new proposal to submit to another funding round.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleWithdraw}
							disabled={loading}
							className="bg-red-600 hover:bg-red-700"
						>
							{loading ? 'Withdrawing...' : 'Withdraw Proposal'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
