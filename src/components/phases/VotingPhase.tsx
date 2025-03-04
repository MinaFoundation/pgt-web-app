'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useToast } from '@/hooks/use-toast'
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
import {
	ChevronDownIcon,
	ChevronUpIcon,
	ChartBarIcon,
	GripVerticalIcon,
	WalletIcon,
	SaveIcon,
	AlertTriangleIcon,
	CircleCheckBigIcon,
	PenIcon,
} from 'lucide-react'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { cn, isTouchDevice } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useFundingRound } from '@/hooks/use-funding-round'
import { useEligibleProposals } from '@/hooks/use-eligible-proposals'
import { OCVRankedVoteResponse, RankedProposalAPIResponse } from '@/services'
import { useOCVVotes } from '@/hooks/use-ocv-votes'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { TouchBackend } from 'react-dnd-touch-backend'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../ui/tooltip'
import { formatDistanceToNow } from 'date-fns'
import { DialogDescription } from '@radix-ui/react-dialog'
import {
	ManualVoteDialog,
	ManualVoteDialogVoteType,
} from '../web3/dialogs/OCVManualInstructions'
import { FundingRoundWithPhases } from '@/types/funding-round'

type ProposalId = RankedProposalAPIResponse['id']

type VotingStep = 'select' | 'ranking' | 'confirm' | 'finished'

export function VotingPhase({ fundingRoundId }: { fundingRoundId: string }) {
	const { state } = useWallet()
	const { toast } = useToast()

	// Fetch data
	const { data: fundingRound, isLoading: isFundingRoundLoading } =
		useFundingRound(fundingRoundId)
	const { data: proposals, isLoading: isProposalsLoading } =
		useEligibleProposals(fundingRoundId)
	const { data: votesData, isLoading: isVotesDataLoading } =
		useOCVVotes(fundingRoundId)

	// Steps state
	const [currentStep, setCurrentStep] = useState<VotingStep>('select')
	const [selectedProposalsIds, setSelectedProposalsIds] = useState<
		ProposalId[]
	>([])
	const [rankedProposalsIds, setRankedProposalsIds] = useState<ProposalId[]>([])

	// Action states
	const [showWalletDialog, setShowWalletDialog] = useState(false)
	const [showVoteDialog, setShowVoteDialog] = useState(false)

	// Handle user-specific vote data when wallet is connected
	useEffect(() => {
		if (!state.wallet?.address || !votesData || !proposals) return

		const updateSelectedProposals = () => {
			const userVote = votesData.votes.find(
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
					.map(p => p.id)

				setSelectedProposalsIds(votedProposals)
				setRankedProposalsIds(votedProposals)
				setCurrentStep('finished')
			}
		}

		updateSelectedProposals()
	}, [state.wallet, votesData, proposals])

	const handleNext = () => {
		if (currentStep === 'select') {
			if (selectedProposalsIds.length === 0) {
				toast({
					title: 'No proposals selected',
					description:
						'Please select at least one proposal to vote for before proceeding.',
				})
				return
			}
			setRankedProposalsIds([...selectedProposalsIds])
			setCurrentStep('ranking')
		} else if (currentStep === 'ranking') {
			setCurrentStep('confirm')
		}
	}

	const handleBack = () => {
		if (currentStep === 'ranking') {
			setCurrentStep('select')
		} else if (currentStep === 'confirm') {
			setCurrentStep('ranking')
		}
	}

	const handleSubmit = () => {
		setShowVoteDialog(true)
	}

	const handleChangeVote = () => {
		setCurrentStep('select')
		setSelectedProposalsIds([])
		setRankedProposalsIds([])
	}

	const isVotingActive = useMemo(() => {
		if (!fundingRound) return false
		const now = new Date()
		const startDate = new Date(fundingRound.phases.voting.startDate)
		const endDate = new Date(fundingRound.phases.voting.endDate)
		return now >= startDate && now <= endDate
	}, [fundingRound])

	const hasVotingEnded = useMemo(() => {
		if (!fundingRound) return false
		const now = new Date()
		const endDate = new Date(fundingRound.phases.voting.endDate)
		return now > endDate
	}, [fundingRound])

	if (isFundingRoundLoading || isProposalsLoading || isVotesDataLoading) {
		return (
			<div className="container mx-auto max-w-7xl px-2 md:px-6">
				<VotingPhaseSkeleton />
			</div>
		)
	}

	if (!fundingRound || !proposals || !votesData) {
		return (
			<div className="container mx-auto max-w-7xl px-2 md:px-6">
				<Card>
					<CardHeader>
						<CardTitle>No Data Available</CardTitle>
						<CardDescription>
							There was an error fetching the data. Please try again later.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		)
	}

	// If voting has ended, only show the funding distribution
	if (hasVotingEnded) {
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
				<VotingResultsDistribution
					totalBudget={Number(fundingRound!.totalBudget)}
					isVotingActive={isVotingActive}
					proposals={proposals.proposals.map(p => ({
						id: p.id,
						title: p.title,
						totalFundingRequired: Number(p.totalFundingRequired),
						author: {
							username: p.author.username,
							authType: p.author.authType,
						},
					}))}
					winnerIds={votesData!.winners}
				/>
			</div>
		)
	}

	return (
		<div className="space-y-4 md:px-6">
			<div>
				<h2 className="text-2xl font-bold">Voting Phase</h2>
				<p>
					Ranking proposals and cast your votes to determine which proposals
					will receive funding.
				</p>
			</div>

			<VotingPhaseSteps currentStep={currentStep} />

			<VotingStepRender
				{...{
					currentStep,
					proposals: proposals.proposals,
					selectedProposalsIds,
					rankedProposalsIds,
					handleNext,
					handleBack,
				}}
				setRankedProposalsIds={setRankedProposalsIds}
				setSelectedProposalsIds={setSelectedProposalsIds}
				handleSubmit={handleSubmit}
				handleChangeVote={handleChangeVote}
			/>

			<LiveFundingDistribution
				fundingRound={fundingRound}
				proposals={proposals.proposals}
				votesData={votesData}
			/>

			<WalletConnectorDialog
				open={showWalletDialog}
				onOpenChange={setShowWalletDialog}
			/>

			<VotingConfirmationDialog
				open={showVoteDialog}
				onOpenChange={setShowVoteDialog}
				fundingRoundId={fundingRoundId}
				mefId={fundingRound.mefId}
				rankedProposalsIds={rankedProposalsIds}
			/>
		</div>
	)
}

function LiveFundingDistribution({
	fundingRound,
	proposals,
	votesData,
}: {
	fundingRound: FundingRoundWithPhases
	proposals: RankedProposalAPIResponse[]
	votesData: OCVRankedVoteResponse
}) {
	const [showFundingDistribution, setShowFundingDistribution] = useState(false)

	const isVotingActive = useMemo(() => {
		if (!fundingRound) return false
		const now = new Date()
		const startDate = new Date(fundingRound.phases.voting.startDate)
		const endDate = new Date(fundingRound.phases.voting.endDate)
		return now >= startDate && now <= endDate
	}, [fundingRound])

	return (
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
								{fundingRound.phases.voting.endDate
									? new Date(
											fundingRound.phases.voting.endDate,
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
						<VotingResultsDistribution
							totalBudget={Number(fundingRound!.totalBudget)}
							isVotingActive={isVotingActive}
							proposals={proposals.map(p => ({
								id: p.id,
								title: p.title,
								totalFundingRequired: Number(p.totalFundingRequired),
								author: {
									username: p.author.username,
									authType: p.author.authType,
								},
							}))}
							winnerIds={votesData.winners}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}

function VotingPhaseSteps({ currentStep }: { currentStep: VotingStep }) {
	const steps = [
		{
			step: 'select',
			title: '1. Select Proposals',
		},
		{
			step: 'ranking',
			title: '2. Rank Proposals',
		},
		{
			step: 'confirm',
			title: '3. Confirm your vote',
		},
	]

	return (
		<div className="mb-8 flex">
			{steps.map((step, index) => {
				const isDone =
					currentStep === 'finished' ||
					steps.findIndex(s => s.step === currentStep) > index

				const isActive = currentStep === step.step

				const isLastStep = index === steps.length - 1

				return (
					<div className="flex items-center" key={index}>
						<div className="flex-1">
							<h3
								className={cn(
									'mb-1 text-base font-bold sm:text-lg',
									isActive || isDone ? 'text-secondary-dark' : 'text-gray-400',
									isActive && 'animate-pulse',
								)}
							>
								{step.title}
							</h3>
						</div>
						{!isLastStep && (
							<StepArrowIcon className="h-5 w-2.5 text-gray-300" />
						)}
					</div>
				)
			})}
		</div>
	)
}

function StepArrowIcon({
	className,
	...props
}: Omit<
	React.SVGProps<SVGSVGElement>,
	'width' | 'height' | 'viewBox' | 'fill'
>) {
	return (
		<svg
			width="7"
			height="14"
			viewBox="0 0 7 14"
			fill="none"
			className={cn('mx-4 h-7 w-3.5', className)}
			{...props}
		>
			<path
				d="M1 13L6 7L1 1"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

function ProposalCard({
	id,
	title,
	totalFundingRequired,
	communityVotes,
	isDragging = false,
	isSelected = false,
	className,
}: RankedProposalAPIResponse & {
	isDragging?: boolean
	isSelected?: boolean
	className?: string
}) {
	return (
		<div
			className={cn(
				`flex-1 rounded-lg border bg-card p-4 transition-all hover:shadow-md`,
				isDragging ? 'border-secondary shadow-lg' : 'border-gray-200',
				isSelected && '!border-secondary bg-secondary/5',
				className,
			)}
			data-proposal-id={id}
		>
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<h3 className="font-medium text-[#2D2D2D]">{title}</h3>
				</div>
				<div className="ml-4 text-sm font-medium text-secondary-dark">
					{totalFundingRequired} MINA
				</div>
			</div>
			<div className="mt-2 text-sm text-gray-500">
				{communityVotes.totalVotes} votes
			</div>
		</div>
	)
}

function VotingSelectStep({
	proposals,
	selectedProposalsIds,
	onChange,
	onNext,
}: {
	proposals: RankedProposalAPIResponse[]
	selectedProposalsIds: ProposalId[]
	onChange: (proposal: ProposalId[]) => void
	onNext: () => void
}) {
	const handleProposalSelect = (proposalId: number) => {
		const isSelected = selectedProposalsIds.includes(proposalId)
		if (isSelected) {
			onChange(selectedProposalsIds.filter(id => id !== proposalId))
		} else {
			if (selectedProposalsIds.length >= 10) {
				return
			}
			onChange([...selectedProposalsIds, proposalId])
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<div className="mb-2 flex justify-between gap-x-4 text-gray-600">
					<p>Select up to 10 proposals you want to vote for.</p>
					<span className="flex w-20 justify-end text-sm">
						{selectedProposalsIds.length} / 10
					</span>
				</div>
				<div className="h-2 rounded-full bg-gray-100">
					<div
						className="h-full rounded-full bg-secondary transition-all"
						style={{
							width: `${(selectedProposalsIds.length / 10) * 100}%`,
						}}
					/>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{proposals.map(proposal => (
					<div
						key={proposal.id}
						onClick={() => handleProposalSelect(proposal.id)}
						className="cursor-pointer"
					>
						<ProposalCard
							{...proposal}
							isSelected={selectedProposalsIds.includes(proposal.id)}
						/>
					</div>
				))}
			</div>
			<div className="flex justify-end">
				<Button
					onClick={onNext}
					className="button-3d ml-auto bg-[#FF603B] text-white hover:bg-[#FF603B]/90"
					disabled={selectedProposalsIds.length === 0}
				>
					Next
				</Button>
			</div>
		</div>
	)
}

function VotingRankingStep({
	proposals,
	rankedProposalsIds,
	onChange,
	onNext,
	onBack,
}: {
	proposals: RankedProposalAPIResponse[]
	rankedProposalsIds: ProposalId[]
	onChange: (rankedProposals: ProposalId[]) => void
	onBack: () => void
	onNext: () => void
}) {
	const rankedProposals = useMemo(
		() =>
			[...proposals].sort(
				(a, b) =>
					rankedProposalsIds.indexOf(a.id) - rankedProposalsIds.indexOf(b.id),
			),
		[proposals, rankedProposalsIds],
	)

	const moveProposal = useCallback(
		(draggedId: ProposalId, targetId: ProposalId) => {
			const draggedIndex = rankedProposalsIds.indexOf(draggedId)
			const targetIndex = rankedProposalsIds.indexOf(targetId)

			if (
				draggedIndex === -1 ||
				targetIndex === -1 ||
				draggedIndex === targetIndex
			)
				return

			const updatedRankings = [...rankedProposalsIds]
			updatedRankings.splice(draggedIndex, 1)
			updatedRankings.splice(targetIndex, 0, draggedId)

			onChange(updatedRankings)
		},
		[rankedProposalsIds, onChange],
	)

	return (
		<DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
			<div className="space-y-6">
				<p className="text-gray-600">
					Drag and drop proposals to arrange them in order of preference.
				</p>
				<div className="space-y-2">
					{rankedProposals.map((proposal, index) => (
						<ProposalDraggableItem
							key={proposal.id}
							proposal={proposal}
							index={index}
							moveProposal={moveProposal}
						/>
					))}
				</div>
				<div className="flex justify-between">
					<Button
						variant="outline"
						onClick={onBack}
						className="border-[#FF603B] text-[#FF603B] hover:bg-[#FF603B]/10"
					>
						Back
					</Button>
					<Button
						onClick={onNext}
						className="ml-auto bg-[#FF603B] text-white hover:bg-[#FF603B]/90"
					>
						Next
					</Button>
				</div>
			</div>
		</DndProvider>
	)
}

const ProposalDraggableItem = ({
	proposal,
	index,
	moveProposal,
}: {
	proposal: RankedProposalAPIResponse
	index: number
	moveProposal: (draggedId: ProposalId, targetId: ProposalId) => void
}) => {
	const [{ isDragging }, drag] = useDrag({
		type: 'PROPOSAL',
		item: { id: proposal.id },
		collect: monitor => ({
			isDragging: monitor.isDragging(),
		}),
		options: {
			dropEffect: 'move',
		},
	})

	const [{ isOver }, drop] = useDrop({
		accept: 'PROPOSAL',
		hover: (draggedItem: { id: ProposalId }) => {
			if (draggedItem.id !== proposal.id) {
				moveProposal(draggedItem.id, proposal.id)
			}
		},
		collect: monitor => ({
			isOver: monitor.isOver(),
		}),
	})

	return (
		<div
			ref={node => {
				if (node) {
					drag(drop(node))
				}
			}}
			className={cn(
				'group flex cursor-move items-center gap-2 rounded-md border border-gray-200 bg-card p-2 transition duration-500',
				isDragging ? 'opacity-0' : 'opacity-100 hover:shadow-sm',
			)}
		>
			{isOver ? (
				<div className="flex h-20 w-full items-center justify-center bg-muted">
					<span className="text-lg font-bold text-muted-foreground">
						Drop here
					</span>
				</div>
			) : (
				<div className="flex h-20 w-full items-center justify-center">
					<GripVerticalIcon className="h-5 w-5 text-gray-400 opacity-50 transition-opacity group-hover:opacity-100" />
					<span className="w-8 text-lg font-bold text-gray-800">
						{index + 1}.
					</span>
					<div className="flex-1">
						<ProposalCard
							{...proposal}
							isDragging={isDragging}
							className="border-none py-0 hover:shadow-none"
						/>
					</div>
				</div>
			)}
		</div>
	)
}

function VotingConfirmStep({
	proposals,
	rankedProposalsIds,
	onBack,
	onSubmit,
}: {
	proposals: RankedProposalAPIResponse[]
	rankedProposalsIds: ProposalId[]
	onBack: () => void
	onSubmit: (rankedProposalsIds: ProposalId[]) => void
}) {
	const rankedProposals = useMemo(
		() =>
			[...proposals].sort(
				(a, b) =>
					rankedProposalsIds.indexOf(a.id) - rankedProposalsIds.indexOf(b.id),
			),
		[proposals, rankedProposalsIds],
	)

	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<div>
					<h2 className="items-center text-lg font-semibold">
						<AlertTriangleIcon className="mr-2 inline-block h-5 w-5 text-primary" />
						Check Your Final Proposals Ranking
					</h2>
					<p className="text-gray-600">
						Please review your ranked choices below. Once you submit your vote,
						it cannot be undone.
					</p>
				</div>
				{rankedProposals.map((proposal, index) => (
					<div key={proposal.id} className="mb-2 flex items-center gap-2">
						<span className="font-bold text-[#2D2D2D]">{index + 1}.</span>
						<ProposalCard
							{...proposal}
							className="border-accent-mint bg-accent-mint/10 hover:shadow-none"
						/>
					</div>
				))}
			</div>
			<div className="flex justify-between">
				<Button
					variant="outline"
					onClick={onBack}
					className="border-[#FF603B] text-[#FF603B] hover:bg-[#FF603B]/10"
				>
					Back
				</Button>
				<Button
					className="button-3d bg-[#FF603B] text-white"
					onClick={() => onSubmit(rankedProposalsIds)}
				>
					Submit Vote
				</Button>
			</div>
		</div>
	)
}

function VotingConfirmationDialog({
	open,
	onOpenChange,
	fundingRoundId,
	mefId,
	rankedProposalsIds,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	fundingRoundId: string
	mefId: number
	rankedProposalsIds: ProposalId[]
}) {
	const { state } = useWallet()
	const [showTransactionDialog, setShowTransactionDialog] = useState(false)
	const [showWalletDialog, setShowWalletDialog] = useState(false)
	const [showManualDialog, setShowManualDialog] = useState(false)

	const { data: votesData } = useOCVVotes(fundingRoundId)

	useEffect(() => {
		if (!open) {
			setShowWalletDialog(false)
		}
	}, [open])

	const handleVoteClick = () => {
		if (!state.wallet) {
			setShowWalletDialog(true)
			return
		}
		setShowTransactionDialog(true)
	}

	const existingVote = votesData?.votes.find(
		vote => vote.account.toLowerCase() === state.wallet?.address?.toLowerCase(),
	)

	const voteButtonTooltip = existingVote
		? `Your last vote was ${formatDistanceToNow(existingVote.timestamp)} ago`
		: undefined

	const handleSaveToMemo = () => {
		setShowManualDialog(true)
	}

	if (open && showTransactionDialog) {
		return (
			<RankedVoteTransactionDialog
				open
				onOpenChange={setShowTransactionDialog}
				selectedProposals={rankedProposalsIds.map(id => ({ id }))}
				fundingRoundMEFId={mefId}
			/>
		)
	}

	if (open && showManualDialog) {
		// Create a string of ranked proposal IDs
		const rankedVoteId: string = [mefId.toString(), ...rankedProposalsIds].join(
			' ',
		)

		return (
			<ManualVoteDialog
				open={showManualDialog}
				onOpenChange={setShowManualDialog}
				voteId={rankedVoteId}
				voteType={ManualVoteDialogVoteType.MEF}
				existingVote={
					existingVote
						? {
								address: existingVote.account,
								timestamp: existingVote.timestamp,
								hash: existingVote.hash,
							}
						: null
				}
			/>
		)
	}

	if (open && showWalletDialog) {
		return (
			<WalletConnectorDialog
				open={showWalletDialog}
				onOpenChange={setShowWalletDialog}
			/>
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Submit Your Vote</DialogTitle>
					<DialogDescription>
						Use your wallet to cast a vote to our Mina OnChain Voting
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div>
									<Button
										className="w-full transform bg-purple-600 transition-all duration-300 hover:scale-105 hover:bg-purple-700"
										onClick={handleVoteClick}
									>
										<WalletIcon className="mr-2 h-4 w-4" />
										{state.wallet
											? existingVote
												? 'Re-Vote With Wallet'
												: 'Vote with Wallet'
											: existingVote
												? 'Re-Vote via memo'
												: 'Connect Wallet to Vote'}
									</Button>
								</div>
							</TooltipTrigger>
							{voteButtonTooltip && (
								<TooltipContent>
									<p>{voteButtonTooltip}</p>
								</TooltipContent>
							)}
						</Tooltip>
					</TooltipProvider>

					<Button
						variant="outline"
						className="w-full"
						onClick={handleSaveToMemo}
					>
						<SaveIcon className="mr-2 h-4 w-4" />
						{existingVote ? 'Re-Vote Vote via memo' : 'Vote Vote via memo'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function VotingResultStep({
	proposals,
	rankedProposalsIds,
	onChangeVote,
}: {
	proposals: RankedProposalAPIResponse[]
	rankedProposalsIds: ProposalId[]
	onChangeVote: () => void
}) {
	const [showChangeVoteAlertDialog, setShowChangeVoteAlertDialog] =
		useState(false)

	const rankedProposals = useMemo(
		() =>
			[...proposals].sort(
				(a, b) =>
					rankedProposalsIds.indexOf(a.id) - rankedProposalsIds.indexOf(b.id),
			),
		[proposals, rankedProposalsIds],
	)

	const handleOnChangeVote = () => {
		onChangeVote()
		setShowChangeVoteAlertDialog(false)
	}

	if (showChangeVoteAlertDialog) {
		return (
			<Dialog
				open={showChangeVoteAlertDialog}
				onOpenChange={setShowChangeVoteAlertDialog}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Your Vote</DialogTitle>
						<DialogDescription>
							Are you sure you want to change your vote? You will be taken back
							to the voting phase to select new proposals.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end">
						<Button
							variant="outline"
							onClick={() => setShowChangeVoteAlertDialog(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleOnChangeVote}
							className="ml-2 text-white"
							variant="destructive"
						>
							Change Vote
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		)
	}

	return (
		<div className="space-y-6 py-4">
			<div className="space-y-4 rounded">
				<div>
					<h2 className="items-center text-lg font-semibold">
						<CircleCheckBigIcon className="mr-2 inline-block h-5 w-5 text-green-600" />
						You Voted!
					</h2>
					<p className="text-gray-600">
						This is the ranking you voted for. Thank you!{' '}
					</p>
				</div>
				{rankedProposals.map((proposal, index) => (
					<div key={proposal.id} className="mb-2 flex items-center gap-2">
						<span className="font-bold text-[#2D2D2D]">{index + 1}.</span>
						<ProposalCard
							{...proposal}
							className="border-accent-mint bg-accent-mint/10 hover:shadow-none"
						/>
					</div>
				))}
			</div>
			<div className="flex justify-end">
				<Button
					className="button-3d text-white"
					variant="destructive"
					onClick={() => setShowChangeVoteAlertDialog(true)}
					size="sm"
				>
					<PenIcon className="mr-1 h-4 w-4" />
					Change Vote
				</Button>
			</div>
		</div>
	)
}

function VotingStepRender({
	currentStep,
	proposals,
	selectedProposalsIds,
	setSelectedProposalsIds,
	rankedProposalsIds,
	setRankedProposalsIds,
	handleNext,
	handleBack,
	handleSubmit,
	handleChangeVote,
}: {
	currentStep: VotingStep
	proposals: RankedProposalAPIResponse[]
	selectedProposalsIds: ProposalId[]
	setSelectedProposalsIds: (proposalsIds: ProposalId[]) => void
	rankedProposalsIds: ProposalId[]
	setRankedProposalsIds: (proposalsIds: ProposalId[]) => void
	handleNext: () => void
	handleBack: () => void
	handleSubmit: () => void
	handleChangeVote: () => void
}) {
	switch (currentStep) {
		case 'select':
			return (
				<VotingSelectStep
					proposals={proposals}
					selectedProposalsIds={selectedProposalsIds}
					onChange={setSelectedProposalsIds}
					onNext={handleNext}
				/>
			)
		case 'ranking':
			return (
				<VotingRankingStep
					proposals={proposals}
					rankedProposalsIds={rankedProposalsIds}
					onChange={setRankedProposalsIds}
					onNext={handleNext}
					onBack={handleBack}
				/>
			)
		case 'confirm':
			return (
				<VotingConfirmStep
					proposals={proposals}
					rankedProposalsIds={rankedProposalsIds}
					onBack={handleBack}
					onSubmit={handleSubmit}
				/>
			)

		case 'finished':
			return (
				<VotingResultStep
					proposals={proposals}
					rankedProposalsIds={rankedProposalsIds}
					onChangeVote={handleChangeVote}
				/>
			)
		default:
			return null
	}
}

function VotingPhaseSkeleton() {
	return (
		<div className="space-y-4 md:px-6">
			<div>
				<h2 className="text-2xl font-bold">Voting Phase</h2>
				<p>
					Ranking proposals and cast your votes to determine which proposals
					will receive funding.
				</p>
			</div>
			<div className="flex space-x-4">
				{new Array(3).fill(null).map((_, index) => (
					<div
						key={index}
						className="h-8 flex-1 animate-pulse rounded bg-muted"
					/>
				))}
			</div>
			<div className="h-6 w-full animate-pulse bg-muted" />
			{new Array(2).fill(null).map((_, index) => (
				<div
					key={index}
					className="h-32 w-full animate-pulse rounded-lg bg-muted shadow-sm"
				/>
			))}
		</div>
	)
}
