import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useSubmissionPhase } from '@/hooks/use-submission-phase'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { CardFooter } from '@/components/ui/card'

interface Props {
	fundingRoundId: string
}

interface ExpandedState {
	[key: number]: boolean
}

export function SubmissionProposalList({ fundingRoundId }: Props) {
	const { proposals, loading, error } = useSubmissionPhase(fundingRoundId)
	const [expanded, setExpanded] = useState<ExpandedState>({})

	const toggleExpanded = (proposalId: number) => {
		setExpanded(prev => ({
			...prev,
			[proposalId]: !prev[proposalId],
		}))
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
			</div>
		)
	}

	return (
		<div className="container mx-auto max-w-7xl px-2 md:px-6">
			<div className="space-y-8">
				<div>
					<h2 className="text-2xl font-bold">
						📝 Submission Phase
						<span className="ml-2 text-lg font-normal text-muted-foreground">
							({proposals.length} proposals submitted)
						</span>
					</h2>
					<p>
						Submit your proposals for this funding round. Review other
						submissions and provide feedback.
					</p>
				</div>

				{/* Action Buttons */}
				<div className="flex gap-4">
					<Link href="/proposals/create">
						<Button
							variant="default"
							className="bg-primary hover:bg-primary/90"
						>
							✨ Create A Proposal
						</Button>
					</Link>
					<Link href="/proposals">
						<Button variant="outline">📝 Submit a Proposal</Button>
					</Link>
				</div>

				{/* Proposals List */}
				<div className="space-y-6">
					{proposals.length === 0 ? (
						<Card>
							<CardContent className="p-6">
								<p className="text-center text-muted-foreground">
									No proposals have been submitted to this funding round yet.
								</p>
							</CardContent>
						</Card>
					) : (
						proposals.map(proposal => (
							<Card
								key={proposal.id}
								className="transition-colors hover:bg-muted/50"
							>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-2xl">
												{proposal.title}
											</CardTitle>
											<CardDescription className="break-all">
												👤 Submitted by {proposal.submitter}
											</CardDescription>
											<div className="mt-4 space-y-2">
												<div className="flex items-center gap-2 text-sm text-muted-foreground">
													<span>💰 Requested Budget:</span>
													<Badge variant="outline" className="text-primary">
														{proposal.totalFundingRequired.toLocaleString()}{' '}
														$MINA
													</Badge>
												</div>
											</div>
										</div>
										<Badge variant="secondary">
											{new Date(proposal.createdAt).toLocaleDateString()}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<h3 className="mb-2 text-xl font-semibold">Abstract</h3>
										{expanded[proposal.id] ? (
											<>
												<p className="mb-4 text-muted-foreground">
													{proposal.proposalSummary}
												</p>
												<div className="space-y-4">
													<div>
														<h3 className="mb-2 text-xl font-semibold">
															Motivation
														</h3>
														<p className="text-muted-foreground">
															{proposal.problemImportance}
														</p>
													</div>
													<div>
														<h3 className="mb-2 text-xl font-semibold">
															Problem Statement
														</h3>
														<p className="text-muted-foreground">
															{proposal.problemStatement}
														</p>
													</div>
													<div>
														<h3 className="mb-2 text-xl font-semibold">
															Delivery Requirements
														</h3>
														<p className="text-muted-foreground">
															{proposal.implementationDetails}
														</p>
													</div>
													<div>
														<h3 className="mb-2 text-xl font-semibold">
															Security & Performance
														</h3>
														<p className="text-muted-foreground">
															{proposal.problemStatement}
														</p>
													</div>
													<div>
														<h3 className="mb-2 text-xl font-semibold">
															Budget Request
														</h3>
														<p className="text-muted-foreground">
															{proposal.totalFundingRequired.toLocaleString()}{' '}
															MINA
														</p>
													</div>
													<div>
														<h3 className="mb-2 text-xl font-semibold">
															Contact Information
														</h3>
														<div className="space-y-2">
															{/* Show Discord info if author is a Discord user */}
															{proposal.submitterMetadata?.authSource?.type ===
															'discord' ? (
																<p className="text-muted-foreground">
																	Discord:{' '}
																	{
																		proposal.submitterMetadata.authSource
																			.username
																	}
																</p>
															) : /* Check for linked Discord account */
															proposal.submitterMetadata?.linkedAccounts?.some(
																	account =>
																		account.authSource.type === 'discord',
															  ) ? (
																<p className="text-muted-foreground">
																	Discord:{' '}
																	{
																		proposal.submitterMetadata.linkedAccounts.find(
																			account =>
																				account.authSource.type === 'discord',
																		)?.authSource.username
																	}{' '}
																	(linked account)
																</p>
															) : (
																<p className="text-sm italic text-muted-foreground">
																	No Discord account linked
																</p>
															)}
															<p className="text-muted-foreground">
																Email: {proposal.email}
															</p>
														</div>
													</div>
												</div>
											</>
										) : (
											<p className="line-clamp-3 text-muted-foreground">
												{proposal.proposalSummary}
											</p>
										)}
									</div>
								</CardContent>
								<CardFooter className="flex items-center justify-between">
									<Button
										variant="ghost"
										className="gap-2"
										onClick={() => toggleExpanded(proposal.id)}
									>
										{expanded[proposal.id] ? (
											<>
												See less
												<ChevronDown className="h-4 w-4" />
											</>
										) : (
											<>
												See more
												<ChevronRight className="h-4 w-4" />
											</>
										)}
									</Button>
								</CardFooter>
							</Card>
						))
					)}
				</div>
			</div>
		</div>
	)
}
