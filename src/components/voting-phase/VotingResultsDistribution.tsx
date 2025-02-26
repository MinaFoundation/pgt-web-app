import { type FC } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import {
	CoinsIcon,
	TrendingUpIcon,
	TrendingDownIcon,
	User2Icon,
	ExternalLinkIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { formatMINA } from '@/lib/format'

interface ProposalFundingStatus {
	id: number
	title: string
	totalFundingRequired: number
	isFunded: boolean
	missingAmount?: number
	author: {
		username: string
		authType: 'discord' | 'wallet'
	}
}

interface VotingResultsDistributionProps {
	totalBudget: number
	isVotingActive: boolean
	proposals: Array<{
		id: number
		title: string
		totalFundingRequired: number
		author: {
			username: string
			authType: 'discord' | 'wallet'
		}
	}>
	winnerIds: number[] // These are MEF IDs from the OCV API
}

export const VotingResultsDistribution: FC<VotingResultsDistributionProps> = ({
	totalBudget,
	isVotingActive,
	proposals,
	winnerIds,
}) => {
	// Calculate funding distribution
	const calculateFundingDistribution = (): ProposalFundingStatus[] => {
		let remainingBudget = totalBudget
		const fundingStatuses: ProposalFundingStatus[] = []

		// Process only winning proposals in their ranked order
		for (const winnerId of winnerIds) {
			// Find proposal by MEF ID
			const proposal = proposals.find(p => p.id == winnerId)
			if (!proposal) continue

			if (proposal.totalFundingRequired <= remainingBudget) {
				// Proposal can be fully funded
				fundingStatuses.push({
					id: proposal.id,
					title: proposal.title,
					totalFundingRequired: proposal.totalFundingRequired,
					isFunded: true,
					author: proposal.author,
				})
				remainingBudget -= proposal.totalFundingRequired
			} else {
				// Proposal cannot be funded
				fundingStatuses.push({
					id: proposal.id,
					title: proposal.title,
					totalFundingRequired: proposal.totalFundingRequired,
					isFunded: false,
					missingAmount: proposal.totalFundingRequired - remainingBudget,
					author: proposal.author,
				})
			}
		}

		return fundingStatuses
	}

	const fundingResults = calculateFundingDistribution()
	const totalFunded = fundingResults.filter(r => r.isFunded).length
	const totalNotFunded = fundingResults.filter(r => !r.isFunded).length

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			<div className="space-y-6">
				{/* Header Section */}
				<div>
					<h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
						<CoinsIcon className="h-8 w-8 text-emerald-600" />
						Funding Distribution
						{isVotingActive && (
							<Badge
								variant="outline"
								className="ml-2 bg-yellow-100 text-yellow-800"
							>
								🔄 Live Results
							</Badge>
						)}
					</h1>
					<p className="mt-2 text-gray-600">
						Total Budget:{' '}
						<span className="font-semibold">
							{formatMINA(totalBudget)} MINA
						</span>
					</p>
				</div>

				{/* Live Results Warning */}
				{isVotingActive && (
					<Alert className="border-yellow-200 bg-yellow-50">
						<InfoCircledIcon className="h-4 w-4 text-yellow-800" />
						<AlertDescription className="text-yellow-800">
							Voting is still in progress. Results and funding distribution may
							change as more votes are counted.
						</AlertDescription>
					</Alert>
				)}

				{/* Stats Cards */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Card
						className={cn(
							'bg-gradient-to-br from-emerald-50 to-white',
							'border-emerald-200/50 transition-colors hover:border-emerald-300/50',
						)}
					>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-emerald-800">
								<TrendingUpIcon className="h-5 w-5" />
								Funded Proposals
							</CardTitle>
							<CardDescription>
								{totalFunded} proposal{totalFunded !== 1 ? 's' : ''} will
								receive full funding
							</CardDescription>
						</CardHeader>
					</Card>

					<Card
						className={cn(
							'bg-gradient-to-br from-rose-50 to-white',
							'border-rose-200/50 transition-colors hover:border-rose-300/50',
						)}
					>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-rose-800">
								<TrendingDownIcon className="h-5 w-5" />
								Unfunded Proposals
							</CardTitle>
							<CardDescription>
								{totalNotFunded} proposal{totalNotFunded !== 1 ? 's' : ''}{' '}
								cannot be funded with remaining budget
							</CardDescription>
						</CardHeader>
					</Card>
				</div>

				{/* Results Grid */}
				<div className="grid gap-4">
					{fundingResults.map((result, index) => (
						<Link
							href={`/proposals/${result.id}`}
							key={result.id}
							className="block rounded-lg transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
						>
							<Card
								className={cn(
									'cursor-pointer transition-all duration-200',
									result.isFunded
										? 'border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-white hover:border-emerald-300/50'
										: 'border-rose-200/50 bg-gradient-to-br from-rose-50 to-white hover:border-rose-300/50',
								)}
							>
								<CardContent className="pt-6">
									<div className="flex flex-col gap-4">
										{/* Header Row */}
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="flex flex-col items-start gap-1">
													<div className="flex items-center gap-2">
														<span className="text-lg font-semibold text-muted-foreground">
															#{index + 1}
														</span>
														<h3 className="inline-flex items-center gap-2 text-lg font-medium hover:underline">
															{result.title}
															<ExternalLinkIcon className="h-4 w-4" />
														</h3>
													</div>
													<div className="flex items-center gap-4 text-sm text-muted-foreground">
														{result.author ? (
															<div className="flex items-center gap-1">
																<User2Icon className="h-4 w-4" />
																<span>{result.author.username}</span>
															</div>
														) : (
															<div className="flex items-center gap-1">
																<User2Icon className="h-4 w-4" />
																<span className="italic">Anonymous</span>
															</div>
														)}
														<div>ID: {result.id}</div>
													</div>
												</div>
											</div>
											<div className="flex flex-col items-end gap-2">
												<Badge
													variant={result.isFunded ? 'default' : 'destructive'}
													className={cn(
														'px-3 py-1 text-sm',
														result.isFunded
															? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
															: 'bg-rose-100 text-rose-800 hover:bg-rose-200',
													)}
												>
													{result.isFunded ? '✓ Funded' : '✗ Not Funded'}
												</Badge>
												<span className="text-sm font-medium">
													Requested: {formatMINA(result.totalFundingRequired)}{' '}
													MINA
												</span>
											</div>
										</div>

										{/* Progress Bar for Unfunded Proposals */}
										{!result.isFunded && result.missingAmount && (
											<div className="space-y-2">
												<div className="flex justify-between text-sm">
													<span className="text-emerald-600">
														Available:{' '}
														{formatMINA(
															result.totalFundingRequired -
																result.missingAmount,
														)}{' '}
														MINA
													</span>
													<span className="text-rose-600">
														Missing: {formatMINA(result.missingAmount)} MINA
													</span>
												</div>
												<Progress
													value={
														(1 -
															result.missingAmount /
																result.totalFundingRequired) *
														100
													}
													className={cn(
														'h-2 bg-rose-100',
														'[&>div]:bg-emerald-500',
													)}
												/>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			</div>
		</div>
	)
}
