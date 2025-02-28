'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import {
	ChevronDownIcon,
	ChevronUpIcon,
	ChartBarIcon,
	GripVerticalIcon,
} from 'lucide-react'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { cn, isTouchDevice } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useFundingRound } from '@/hooks/use-funding-round'
import { useEligibleProposals } from '@/hooks/use-eligible-proposals'
import {
	GetRankedEligibleProposalsAPIResponse,
	RankedProposalAPIResponse,
} from '@/services'
import { useOCVVotes } from '@/hooks/use-ocv-votes'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { TouchBackend } from 'react-dnd-touch-backend'
import { HTML5Backend } from 'react-dnd-html5-backend'

type ProposalId = RankedProposalAPIResponse['id']

type VotingStep = 'select' | 'ranking' | 'confirm'

export function VotingPhase({ fundingRoundId }: { fundingRoundId: string }) {
	const { state } = useWallet()
	const { toast } = useToast()

	const [showWalletDialog, setShowWalletDialog] = useState(false)
	const [showTransactionDialog, setShowTransactionDialog] = useState(false)
	const [showFundingDistribution, setShowFundingDistribution] = useState(false)

	// Steps state
	const [currentStep, setCurrentStep] = useState<VotingStep>('select')
	const [selectedProposalsIds, setSelectedProposalsIds] = useState<
		ProposalId[]
	>([])
	const [rankedProposalsIds, setRankedProposalsIds] = useState<ProposalId[]>([])

	const { data: fundingRound, isLoading } = useFundingRound(fundingRoundId)

	const { data: proposals } = useEligibleProposals(fundingRoundId)

	const { data: votesData } = useOCVVotes(fundingRoundId)

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
					.map(p => ({ id: p.id }))

				setSelectedProposalsIds(votedProposals.map(p => p.id))
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

	const handleSubmit = (
		selectedProposals: GetRankedEligibleProposalsAPIResponse,
	) => {}

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
		if (!proposals || !votesData || !fundingRound) return null

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
				winnerIds={votesData.winners}
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
				<h2 className="text-2xl font-bold">Voting Phase</h2>
				<p>
					Cast your votes to determine which proposals will receive funding.
				</p>
			</div>

			<VotingPhaseSteps currentStep={currentStep} />

			{proposals && (
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
				/>
			)}

			<RankedVoteList
				proposals={proposals}
				existingVote={votesData?.votes.find(
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
				selectedProposals={selectedProposalsIds.map(id => ({ id }))}
				fundingRoundMEFId={parseInt(fundingRoundId)}
			/>
		</div>
	)
}

function VotingPhaseSteps({ currentStep }: { currentStep: VotingStep }) {
	const steps = [
		{
			title: '1. Select Proposals',
			description: 'Select up to 10 proposals you want to vote for.',
		},
		{
			title: '2. Rank Proposals',
			description:
				'Drag and drop proposals to arrange them in order of preference.',
		},
		{
			title: '3. Confirm your vote',
			description: 'Review your ranked choices and submit your vote.',
		},
	]

	return (
		<div className="mb-8 flex justify-between">
			{steps.map((step, index) => {
				const isActive =
					(currentStep === 'select' && index === 0) ||
					(currentStep === 'ranking' && index <= 1) ||
					(currentStep === 'confirm' && index <= 2)

				const isLastStep = index === steps.length - 1

				return (
					<div className="flex items-center" key={index}>
						<div className="flex-1">
							<h3
								className={`mb-1 text-lg font-bold ${
									isActive ? 'text-secondary-dark' : 'text-gray-400'
								}`}
							>
								{step.title}
							</h3>
							<p
								className={`text-sm ${
									isActive ? 'text-gray-600' : 'text-gray-400'
								}`}
							>
								{step.description}
							</p>
						</div>
						{!isLastStep && <StepArrowIcon className="text-muted" />}
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
}: RankedProposalAPIResponse & {
	isDragging?: boolean
	isSelected?: boolean
}) {
	return (
		<div
			className={`flex-1 rounded-lg border p-4 transition-all ${isDragging ? 'border-secondary shadow-lg' : 'border-gray-200'} ${isSelected ? '!border-secondary bg-secondary/5' : 'bg-primary-grey/40'} hover:shadow-md`}
			data-proposal-id={id}
		>
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<h3 className="font-medium text-[#2D2D2D]">{title}</h3>
				</div>
				<div className="text-secondary-dark ml-4 text-sm font-medium">
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
				<div className="mb-2 flex justify-between text-sm text-gray-600">
					<span>Selected Proposals</span>
					<span>{selectedProposalsIds.length} / 10</span>
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
				>
					Next
				</Button>
			</div>
		</div>
	)
}

type VotingRankingStepProps = {
	proposals: RankedProposalAPIResponse[]
	rankedProposalsIds: ProposalId[]
	onChange: (rankedProposals: ProposalId[]) => void
	onBack: () => void
	onNext: () => void
}

function VotingRankingStep({
	proposals,
	rankedProposalsIds,
	onChange,
	onNext,
	onBack,
}: VotingRankingStepProps) {
	// Memoize proposals based on ranking order
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
					{onBack && (
						<Button
							variant="outline"
							onClick={onBack}
							className="border-[#FF603B] text-[#FF603B] hover:bg-[#FF603B]/10"
						>
							Back
						</Button>
					)}
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

// Draggable Proposal Item
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
				'group flex cursor-move items-center gap-2 rounded-md border border-gray-200 p-2 transition',
				isDragging ? 'opacity-0' : 'opacity-100 hover:shadow-sm',
			)}
		>
			{isOver ? (
				<div className="flex h-24 w-full items-center justify-center bg-muted">
					<span className="text-lg font-bold text-muted-foreground">
						Drop here
					</span>
				</div>
			) : (
				<div className="flex h-24 w-full items-center justify-center">
					<GripVerticalIcon className="h-5 w-5 text-gray-400 opacity-50 transition-opacity group-hover:opacity-100" />
					<span className="w-8 text-lg font-bold text-gray-800">
						{index + 1}.
					</span>
					<div className="flex-1">
						<ProposalCard {...proposal} isDragging={isDragging} />
					</div>
				</div>
			)}
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
}: {
	currentStep: VotingStep
	proposals: RankedProposalAPIResponse[]
	selectedProposalsIds: ProposalId[]
	setSelectedProposalsIds: (proposalsIds: ProposalId[]) => void
	rankedProposalsIds: ProposalId[]
	setRankedProposalsIds: (proposalsIds: ProposalId[]) => void
	handleNext: () => void
	handleBack: () => void
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
		default:
			return null
	}
}
