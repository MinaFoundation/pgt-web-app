'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useToast } from '@/hooks/use-toast'
import RankedVoteList from '@/components/voting-phase/RankedVoteList'
import { VotingResultsDistribution } from '@/components/voting-phase/VotingResultsDistribution'
import { RankedVoteTransactionDialog } from '@/components/web3/dialogs/RankedVoteTransactionDialog'
import { WalletConnectorDialog } from '@/components/web3/WalletConnectorDialog'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon, ChevronUpIcon, ChartBarIcon } from 'lucide-react'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import type { OCVRankedVoteResponse } from '@/services/OCVApiService'
import { LocalStorageCache } from '@/lib/local-storage-cache'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useFundingRound } from '@/hooks/use-funding-round'
import { useEligibleProposals } from '@/hooks/use-eligible-proposals'
import { GetRankedEligibleProposalsAPIResponse } from '@/services'

const VOTE_DATA_CACHE_PREFIX = 'ocv_vote_data'

interface VotingPhaseProps {
	fundingRoundId: string
}

interface SelectedProposalId {
	id: number
}

export function VotingPhase({ fundingRoundId }: VotingPhaseProps) {
	const { state } = useWallet()
	const { toast } = useToast()
	const [voteData, setVoteData] = useState<OCVRankedVoteResponse>()
	const [showWalletDialog, setShowWalletDialog] = useState(false)
	const [showTransactionDialog, setShowTransactionDialog] = useState(false)
	const [selectedProposals, setSelectedProposals] =
		useState<SelectedProposalId[]>()
	const [showFundingDistribution, setShowFundingDistribution] = useState(false)

	const { data: fundingRound, isLoading } = useFundingRound(fundingRoundId)

	const { data: proposals } = useEligibleProposals(fundingRoundId)

	// Fetch vote data regardless of wallet connection
	useEffect(() => {
		let ignore = false

		const fetchVoteData = async () => {
			if (!proposals?.fundingRound.mefId || !proposals.fundingRound.votingPhase)
				return

			try {
				const startTimeDate = new Date(
					proposals.fundingRound.votingPhase.startDate,
				)
				const endTimeDate = new Date(proposals.fundingRound.votingPhase.endDate)

				const startTime = startTimeDate.getTime()
				const endTime = endTimeDate.getTime()

				const response = await fetch(
					`/api/voting/ranked-votes?roundId=${proposals.fundingRound.mefId}&startTime=${startTime}&endTime=${endTime}`,
				)

				if (!response.ok) {
					throw new Error('Failed to fetch vote data')
				}

				const data = await response.json()

				if (!ignore) {
					setVoteData(data)
					// Cache the fresh data
					const cacheKey = LocalStorageCache.getKey(
						VOTE_DATA_CACHE_PREFIX,
						proposals.fundingRound.mefId,
					)
					LocalStorageCache.set(cacheKey, data)
				}
			} catch (error) {
				if (!ignore) {
					toast({
						title: 'Warning',
						description: 'Failed to load vote data. Please try again later.',
						variant: 'default',
					})
				}
			}
		}

		fetchVoteData()

		return () => {
			ignore = true
		}
	}, [
		proposals?.fundingRound.mefId,
		proposals?.fundingRound.votingPhase,
		toast,
	])

	// Handle user-specific vote data when wallet is connected
	useEffect(() => {
		if (!state.wallet?.address || !voteData || !proposals) return

		const updateSelectedProposals = () => {
			const userVote = voteData.votes.find(
				vote =>
					vote.account.toLowerCase() === state.wallet!.address.toLowerCase(),
			)

			if (userVote) {
				const votedProposals = proposals.proposals
					.filter(p => userVote.proposals.includes(p.id))
					.sort((a, b) => {
						const aIndex = userVote.proposals.indexOf(a.id)
						const bIndex = userVote.proposals.indexOf(b.id)
						return aIndex - bIndex
					})
					.map(p => ({ id: p.id }))

				setSelectedProposals(votedProposals)
			}
		}

		updateSelectedProposals()
	}, [state.wallet, voteData, proposals])

	const handleSubmit = (
		selectedProposals: GetRankedEligibleProposalsAPIResponse,
	) => {
		const proposalIds: SelectedProposalId[] =
			selectedProposals?.proposals.map(p => ({ id: p.id })) ?? []
		setSelectedProposals(proposalIds)
		setShowTransactionDialog(true)
	}

	const handleSaveToMemo = (
		selectedProposals: GetRankedEligibleProposalsAPIResponse,
	) => {
		const memo = `YES ${selectedProposals.proposals.map(p => p.id).join(' ')}`
		navigator.clipboard.writeText(memo).then(() => {
			toast({
				title: 'Copied to Clipboard',
				description: 'The vote memo has been copied to your clipboard',
			})
		})
	}

	const handleConnectWallet = () => {
		if (!state.wallet) {
			setShowWalletDialog(true)
		} else {
			setShowTransactionDialog(true)
		}
	}

	// Check if voting phase is active
	const isVotingActive = () => {
		if (!proposals?.fundingRound.votingPhase) return false
		const now = new Date()
		const startDate = new Date(proposals.fundingRound.votingPhase.startDate)
		const endDate = new Date(proposals.fundingRound.votingPhase.endDate)
		return now >= startDate && now <= endDate
	}

	const hasVotingEnded = () => {
		if (!proposals?.fundingRound.votingPhase) return false
		const now = new Date()
		const endDate = new Date(proposals.fundingRound.votingPhase.endDate)
		return now > endDate
	}

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-7xl px-2 md:px-6">
				<Card>
					<CardHeader>
						<CardTitle>Loading Proposals...</CardTitle>
						<CardDescription>
							Please wait while we fetch the available proposals.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		)
	}

	const renderFundingDistribution = () => {
		if (!proposals || !voteData || !fundingRound) return null

		return (
			<VotingResultsDistribution
				totalBudget={Number(fundingRound!.totalBudget)}
				isVotingActive={isVotingActive()}
				proposals={proposals.proposals.map(p => ({
					id: p.id,
					title: p.title,
					totalFundingRequired: Number(p.totalFundingRequired),
					author: {
						username: p.author.username,
						authType: p.author.authType,
					},
				}))}
				winnerIds={voteData.winners}
			/>
		)
	}

	// If voting has ended, only show the funding distribution
	if (hasVotingEnded()) {
		return (
			<div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
				<Card>
					<CardHeader>
						<CardTitle>Voting Phase Completed</CardTitle>
						<CardDescription>
							The voting phase for has ended. Below are the final results and
							funding distribution.
						</CardDescription>
					</CardHeader>
				</Card>
				{renderFundingDistribution()}
			</div>
		)
	}

	return (
		<div className="space-y-4 px-2 md:px-6">
			<div>
				<h2 className="text-2xl font-bold">🗳️ Voting Phase</h2>
				<p>
					Cast your votes to determine which proposals will receive funding.
				</p>
			</div>

			<RankedVoteList
				proposals={proposals}
				existingVote={voteData?.votes.find(
					vote =>
						vote.account.toLowerCase() === state.wallet?.address?.toLowerCase(),
				)}
				onSubmit={handleSubmit}
				onSaveToMemo={handleSaveToMemo}
				onConnectWallet={handleConnectWallet}
				title={`Rank your vote`}
				fundingRoundMEFId={proposals?.fundingRound.mefId || 0}
			/>

			<div className="container mx-auto max-w-7xl py-8">
				<div className="rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
					<div
						className="group flex cursor-pointer flex-col space-y-1.5 p-4"
						onClick={() => setShowFundingDistribution(!showFundingDistribution)}
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
									<ChartBarIcon className="h-4 w-4 text-primary" />
								</div>
								<div>
									<h3 className="text-lg font-semibold leading-none tracking-tight">
										Live Funding Distribution
									</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										Based on current OCV votes • Updates in real-time
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="transition-colors group-hover:bg-primary/10"
							>
								{showFundingDistribution ? (
									<ChevronUpIcon className="h-5 w-5" />
								) : (
									<ChevronDownIcon className="h-5 w-5" />
								)}
							</Button>
						</div>
						{!showFundingDistribution && (
							<div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
								<InfoCircledIcon className="h-4 w-4" />
								<span>
									Click to see how the funding would be distributed based on
									current votes
								</span>
							</div>
						)}
					</div>

					<div
						className={cn(
							'overflow-hidden transition-all duration-300 ease-in-out',
							showFundingDistribution
								? 'max-h-[2000px] opacity-100'
								: 'max-h-0 opacity-0',
						)}
					>
						<div className="px-4 pb-4">
							<Alert className="mb-4 border-blue-200 bg-blue-50">
								<InfoCircledIcon className="h-4 w-4 text-blue-700" />
								<AlertTitle className="text-blue-900">
									Ongoing Voting Phase
								</AlertTitle>
								<AlertDescription className="text-blue-800">
									This distribution is based on current OCV votes and may change
									as more votes are counted. The final distribution will be
									determined when the voting phase ends on{' '}
									{proposals?.fundingRound.votingPhase?.endDate
										? new Date(
												proposals.fundingRound.votingPhase.endDate,
											).toLocaleDateString('en-US', {
												month: 'long',
												day: 'numeric',
												year: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
											})
										: 'the scheduled end date'}
									.
								</AlertDescription>
							</Alert>
							{renderFundingDistribution()}
						</div>
					</div>
				</div>
			</div>

			<WalletConnectorDialog
				open={showWalletDialog}
				onOpenChange={setShowWalletDialog}
			/>

			<RankedVoteTransactionDialog
				open={showTransactionDialog}
				onOpenChange={setShowTransactionDialog}
				selectedProposals={selectedProposals ?? []}
				fundingRoundMEFId={parseInt(fundingRoundId)}
			/>
		</div>
	)
}
