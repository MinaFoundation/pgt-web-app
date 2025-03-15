'use client'

import { useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { GDPRTermsDialog } from './GDPRTermsDialog'
import { ViewFundingRoundDialog } from './ViewFundingRoundDialog'
import { FundingRoundWithPhases } from '@/types/funding-round'

export function SubmitProposalConfirmDialog({
	open,
	onOpenChange,
	proposalTitle,
	fundingRound,
	onConfirm,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	proposalTitle: string
	fundingRound: FundingRoundWithPhases
	onConfirm: () => Promise<void>
}) {
	const [gdprDialogOpen, setGdprDialogOpen] = useState(false)
	const [viewFundingRoundOpen, setViewFundingRoundOpen] = useState(false)
	const [gdprAccepted, setGdprAccepted] = useState(false)
	const [loading, setLoading] = useState(false)

	const handleSubmit = async () => {
		if (!gdprAccepted) return

		try {
			setLoading(true)
			await onConfirm()
			onOpenChange(false)
		} catch (error) {
			// Error handling is done in the parent component
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Submit Proposal to Funding Round</DialogTitle>
						<DialogDescription>
							You are about to submit your proposal{' '}
							<strong>{proposalTitle}</strong> to:
						</DialogDescription>
					</DialogHeader>

					<div className="py-4">
						<Button
							variant="link"
							className="h-auto p-0"
							onClick={() => setViewFundingRoundOpen(true)}
						>
							<Badge variant="outline" className="cursor-pointer text-base">
								📋 {fundingRound.name}
							</Badge>
						</Button>

						<div className="mt-6 space-y-4 text-sm text-muted-foreground">
							<p>
								⚠️ Once submitted, you will not be able to edit your proposal.
							</p>

							<div className="flex items-center space-x-2">
								<Checkbox
									id="gdpr"
									checked={gdprAccepted}
									onCheckedChange={(checked: boolean | 'indeterminate') =>
										setGdprAccepted(checked as boolean)
									}
								/>
								<Label htmlFor="gdpr" className="text-sm font-normal">
									I agree to the{' '}
									<Button
										variant="link"
										className="h-auto p-0 underline"
										onClick={() => setGdprDialogOpen(true)}
									>
										GDPR terms
									</Button>
								</Label>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={loading}
						>
							Cancel
						</Button>
						<Button onClick={handleSubmit} disabled={loading || !gdprAccepted}>
							{loading ? 'Submitting...' : 'Submit Proposal'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<GDPRTermsDialog open={gdprDialogOpen} onOpenChange={setGdprDialogOpen} />

			<ViewFundingRoundDialog
				open={viewFundingRoundOpen}
				onOpenChange={setViewFundingRoundOpen}
				fundingRound={fundingRound}
				proposalTitle={proposalTitle}
				mode="view"
			/>
		</>
	)
}
