'use client'

import {
	GripVertical,
	Wallet,
	ArrowRight,
	ArrowLeft,
	MessageCircle,
	Users,
	Coins,
	Info,
} from 'lucide-react'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { ProposalWithUniqueId } from './types'

/* -------------------------------------------------------------
 * Types & Interfaces
 * ------------------------------------------------------------- */
/* -------------------------------------------------------------
 * The proposal UI content (with tooltips, icons, etc.)
 * Also includes the "grip" handle where we start the reorder drag
 * ------------------------------------------------------------- */
export const ProposalContent: React.FC<{
	proposal: ProposalWithUniqueId
	index?: number
	isRanked?: boolean
}> = ({ proposal, index, isRanked }) => {
	const formatWalletAddress = (address: string) => {
		if (address.length <= 12) return address
		return `${address.slice(0, 6)}...${address.slice(-4)}`
	}

	// If isRanked, dragging the "grip" will reorder items
	const handlePointerDownForReorder = (
		e: React.PointerEvent<HTMLDivElement>,
	) => {
		if (isRanked) {
			// Stop the HTML drag from starting so that Framer can do vertical reorder
			e.stopPropagation()
			e.preventDefault()
		}
	}

	return (
		<>
			<div className="flex items-center gap-2">
				{/* Reorder Grip: only starts Framer reorder if isRanked */}
				<div
					className="cursor-grab active:cursor-grabbing"
					onPointerDown={handlePointerDownForReorder}
				>
					<GripVertical className="h-4 w-4 flex-shrink-0 text-gray-400" />
				</div>

				{isRanked && (
					<div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-600">
						{(index ?? 0) + 1}
					</div>
				)}
				<div className="flex-1 truncate">
					<span>{proposal.title}</span>
				</div>
				{isRanked ? (
					<ArrowLeft className="h-4 w-4 text-purple-500 opacity-50 group-hover:opacity-100" />
				) : (
					<ArrowRight className="h-4 w-4 text-blue-500 opacity-50 group-hover:opacity-100" />
				)}
			</div>

			<div className="flex items-center gap-4 px-2 text-sm text-muted-foreground">
				<TooltipProvider>
					{/* Proposal ID & Info */}
					<HoverCard>
						<HoverCardTrigger className="flex items-center gap-1 transition-colors hover:text-primary">
							<Info className="h-3 w-3" />
							<span className="font-mono text-xs">#{proposal.id}</span>
						</HoverCardTrigger>
						<HoverCardContent align="start" className="w-80 p-4">
							<div className="space-y-4">
								{/* Header with ID and Link */}
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="font-mono text-xs text-muted-foreground">
											Proposal ID: {proposal.id}
										</span>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="h-auto p-0 text-xs hover:bg-transparent"
										asChild
									>
										<a
											href={`/proposals/${proposal.id}`}
											target="_blank"
											rel="noopener noreferrer"
											className="font-medium text-primary hover:text-primary/80"
										>
											View Full Details →
										</a>
									</Button>
								</div>

								{/* Scrollable Abstract */}
								<div className="space-y-2">
									<h4 className="text-sm font-medium">Abstract</h4>
									<div className="scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 scrollbar-track-transparent max-h-24 overflow-y-auto pr-2 text-xs text-muted-foreground">
										{proposal.abstract}
									</div>
								</div>
							</div>
						</HoverCardContent>
					</HoverCard>

					{/* Author */}
					<Tooltip>
						<TooltipTrigger className="flex items-center gap-1">
							{proposal.author.authType === 'wallet' ? (
								<Wallet className="h-3 w-3" />
							) : (
								<MessageCircle className="h-3 w-3" />
							)}
							<span>{formatWalletAddress(proposal.author.username)}</span>
						</TooltipTrigger>
						<TooltipContent>Proposal Author</TooltipContent>
					</Tooltip>

					{/* Budget */}
					<Tooltip>
						<TooltipTrigger className="flex items-center gap-1">
							<Coins className="h-3 w-3" />
							<span>{proposal.totalFundingRequired} MINA</span>
						</TooltipTrigger>
						<TooltipContent>Requested Budget</TooltipContent>
					</Tooltip>

					{/* Reviewer Votes */}
					<HoverCard>
						<HoverCardTrigger className="flex items-center gap-1">
							<Users className="h-3 w-3" />
							<span>
								{proposal.reviewerVotes.approved}/{proposal.reviewerVotes.total}
							</span>
						</HoverCardTrigger>
						<HoverCardContent className="w-60">
							<div className="space-y-2">
								<h4 className="font-medium">Reviewer Votes</h4>
								<div className="text-sm">
									<div>Approved: {proposal.reviewerVotes.approved}</div>
									<div>Rejected: {proposal.reviewerVotes.rejected}</div>
									<div>Total: {proposal.reviewerVotes.total}</div>
								</div>
							</div>
						</HoverCardContent>
					</HoverCard>

					{/* Community Votes */}
					<HoverCard>
						<HoverCardTrigger className="flex items-center gap-1">
							<span>🌍</span>
							<span>{proposal.communityVotes.totalVotes} votes</span>
						</HoverCardTrigger>
						<HoverCardContent className="w-60">
							<div className="space-y-2">
								<h4 className="font-medium">Community Votes</h4>
								<div className="text-sm">
									<div>Total Votes: {proposal.communityVotes.totalVotes}</div>
									<div>
										Stake Weight: {proposal.communityVotes.positiveStakeWeight}
									</div>
								</div>
							</div>
						</HoverCardContent>
					</HoverCard>
				</TooltipProvider>
			</div>
		</>
	)
}
