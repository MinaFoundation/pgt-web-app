'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/contexts/WalletContext'
import { WalletConnectorDialog } from './WalletConnectorDialog'
import {
	ManualVoteDialog,
	ManualVoteDialogVoteType,
} from './dialogs/OCVManualInstructions'
import { OCVTransactionDialog } from './dialogs/OCVTransactionDialog'
import { Icons } from '@/components/icons'
import { TARGET_NETWORK } from '@/contexts/WalletContext'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	TooltipProvider,
} from '@/components/ui/tooltip'
import { formatDistanceToNow } from 'date-fns'
import type { ConsiderationVoteStats } from '@/types/consideration'

interface OCVVoteButtonProps {
	proposalId: string
	fundingRoundMEFId: number
	useWallet?: boolean
	voteStats: ConsiderationVoteStats
}

// Add type for voter
interface Voter {
	address: string
	timestamp: number
	hash: string
}

export function OCVVoteButton({
	proposalId,
	fundingRoundMEFId,
	useWallet: isWalletEnabled = true,
	voteStats,
}: OCVVoteButtonProps) {
	const { state, enforceTargetNetwork } = useWallet()
	const [showWalletDialog, setShowWalletDialog] = useState(false)
	const [showManualDialog, setShowManualDialog] = useState(false)
	const [showTransactionDialog, setShowTransactionDialog] = useState(false)

	const existingVote = useMemo(() => {
		if (!state.wallet?.address) return null
		return voteStats.communityVote.voters.find(
			(voter: Voter) =>
				voter.address.toLowerCase() === state.wallet!.address.toLowerCase(),
		)
	}, [voteStats.communityVote.voters, state.wallet])

	const handleVoteClick = async () => {
		if (!isWalletEnabled) {
			setShowManualDialog(true)
			return
		}

		if (!state.wallet) {
			setShowWalletDialog(true)
			return
		}

		if (state.wallet.network !== TARGET_NETWORK) {
			const networkSwitched = await enforceTargetNetwork()
			if (!networkSwitched) {
				return
			}
		}

		setShowTransactionDialog(true)
	}

	const buttonText = isWalletEnabled
		? state.wallet
			? existingVote
				? 'Already Voted'
				: 'Vote with Wallet'
			: 'Connect Wallet to Vote'
		: 'Vote Via Memo'

	const walletButton = (
		<Button
			variant={isWalletEnabled ? 'default' : 'outline'}
			onClick={handleVoteClick}
			className="gap-2"
			disabled={Boolean(isWalletEnabled && state.wallet && existingVote)}
		>
			{isWalletEnabled && <Icons.wallet className="h-4 w-4" />}
			{buttonText}
		</Button>
	)

	return (
		<>
			{isWalletEnabled && state.wallet && existingVote ? (
				<TooltipProvider delayDuration={0}>
					<Tooltip>
						<TooltipTrigger asChild>
							<div>{walletButton}</div>
						</TooltipTrigger>
						<TooltipContent
							side="top"
							align="center"
							className="max-w-[300px] bg-popover p-4 text-popover-foreground"
						>
							<div className="space-y-2">
								<p className="font-medium">
									You have already voted on this proposal
								</p>
								<div className="space-y-1 text-xs text-muted-foreground">
									<p>Time: {formatDistanceToNow(existingVote.timestamp)} ago</p>
									<p className="break-all">Transaction: {existingVote.hash}</p>
								</div>
							</div>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			) : (
				walletButton
			)}

			<WalletConnectorDialog
				open={showWalletDialog}
				onOpenChange={setShowWalletDialog}
			/>

			<ManualVoteDialog
				open={showManualDialog}
				onOpenChange={setShowManualDialog}
				voteId={proposalId}
				voteType={ManualVoteDialogVoteType.YES}
				existingVote={existingVote}
			/>

			{state.wallet && (
				<OCVTransactionDialog
					open={showTransactionDialog}
					onOpenChange={setShowTransactionDialog}
					proposalId={proposalId}
					fundingRoundMEFId={fundingRoundMEFId}
				/>
			)}
		</>
	)
}
