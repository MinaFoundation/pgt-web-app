'use client'

import React, { useState } from 'react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card'
import { InfoIcon, ChevronRight, ChevronDown } from 'lucide-react'
import { ProcessingResult } from '@/lib/gpt-survey/runner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Props {
	results: ProcessingResult[]
}

interface ApiRequestInfo {
	method: 'GET' | 'POST'
	endpoint: string
	body?: unknown
	headers?: Record<string, string>
}

interface ApiResponseInfo {
	status: number
	body: unknown
}

export function ProcessingResultsTable({ results }: Props) {
	const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

	const toggleRow = (id: string) => {
		setExpandedRows(prev => ({
			...prev,
			[id]: !prev[id],
		}))
	}

	const getStatusBadge = (
		status: ProcessingResult['status'],
		submittedAt?: Date,
	) => {
		if (submittedAt) {
			return <Badge className="bg-green-500">Submitted</Badge>
		}
		return <Badge variant="destructive">Not Submitted</Badge>
	}

	const getFeedbackStatusBadge = (
		status: ProcessingResult['feedbacks'][0]['status'],
		submittedAt?: Date,
	) => {
		if (submittedAt) {
			return <Badge className="bg-green-500">Submitted</Badge>
		}
		return <Badge variant="destructive">Not Submitted</Badge>
	}

	const formatDate = (date?: Date | string) => {
		if (!date) return ''
		return new Date(date).toLocaleString()
	}

	const renderApiInfo = (
		request?: ApiRequestInfo,
		response?: ApiResponseInfo,
	) => {
		if (!request) return null

		return (
			<div className="space-y-2 rounded-md bg-muted/50 p-2 text-sm">
				<div className="font-medium">API Request:</div>
				<div className="font-mono text-xs">
					{request?.method || 'POST'}{' '}
					{`${process.env.NEXT_PUBLIC_API_URL}${request?.endpoint || ''}`}
				</div>
				<div className="whitespace-pre-wrap font-mono text-xs">
					{JSON.stringify(
						request?.body || 'Dry run - no actual request made',
						null,
						2,
					)}
				</div>
				{response && (
					<>
						<div className="mt-4 font-medium">API Response:</div>
						<div className="whitespace-pre-wrap font-mono text-xs">
							{JSON.stringify(response.body, null, 2)}
						</div>
					</>
				)}
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[30px]"></TableHead>
						<TableHead>ID</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Submitted At</TableHead>
						<TableHead>Summary Status</TableHead>
						<TableHead>API Info</TableHead>
						<TableHead>Feedbacks</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{results.map(result => (
						<React.Fragment key={result.proposalId}>
							<TableRow
								className={cn(
									'group cursor-pointer',
									expandedRows[result.proposalId] && 'bg-muted/50',
								)}
								onClick={() => toggleRow(result.proposalId.toString())}
							>
								<TableCell>
									{expandedRows[result.proposalId] ? (
										<ChevronDown className="h-4 w-4" />
									) : (
										<ChevronRight className="h-4 w-4" />
									)}
								</TableCell>
								<TableCell>{result.proposalId}</TableCell>
								<TableCell>
									<div>
										<div>{result.title}</div>
										<div className="text-sm text-muted-foreground">
											Author: {result.proposalAuthor}
										</div>
									</div>
								</TableCell>
								<TableCell>
									<div className="flex items-center space-x-2">
										{getStatusBadge(result.status, result.submittedAt)}
										{result.error && (
											<HoverCard>
												<HoverCardTrigger>
													<InfoIcon className="h-4 w-4 text-red-500" />
												</HoverCardTrigger>
												<HoverCardContent>
													<p className="text-sm text-red-500">{result.error}</p>
												</HoverCardContent>
											</HoverCard>
										)}
									</div>
								</TableCell>
								<TableCell>{formatDate(result.submittedAt)}</TableCell>
								<TableCell>
									{result.summary ? (
										<Badge className="bg-green-500">Summarized</Badge>
									) : (
										<Badge variant="secondary">No Summary</Badge>
									)}
									{result.summaryUpdatedAt && (
										<div className="mt-1 text-xs text-muted-foreground">
											Updated: {formatDate(result.summaryUpdatedAt)}
										</div>
									)}
								</TableCell>
								<TableCell>
									{result.apiRequest && (
										<HoverCard>
											<HoverCardTrigger>
												<InfoIcon className="h-4 w-4 text-blue-500" />
											</HoverCardTrigger>
											<HoverCardContent className="w-[600px]">
												{renderApiInfo(result.apiRequest, result.apiResponse)}
											</HoverCardContent>
										</HoverCard>
									)}
								</TableCell>
								<TableCell>
									<div className="space-y-1">
										{result.feedbacks.length} feedback(s)
									</div>
								</TableCell>
							</TableRow>
							{expandedRows[result.proposalId] && (
								<TableRow className="bg-muted/50">
									<TableCell colSpan={7} className="p-4">
										<div className="space-y-4">
											{result.summary ? (
												<div className="mb-6">
													<div className="mb-2 flex items-center justify-between">
														<div className="font-medium">Proposal Summary</div>
														<Badge className="bg-green-500">
															Last updated:{' '}
															{formatDate(result.summaryUpdatedAt)}
														</Badge>
													</div>
													<div className="rounded-md bg-muted/50 p-4">
														<div className="prose prose-sm dark:prose-invert max-w-none">
															{result.summary.split('\n').map((line, i) => (
																<p key={i} className="mb-2 whitespace-pre-wrap">
																	{line}
																</p>
															))}
														</div>
													</div>
												</div>
											) : (
												<div className="mb-6">
													<div className="mb-2 flex items-center justify-between">
														<div className="font-medium">Proposal Summary</div>
														<Badge variant="secondary">
															No Summary Available
														</Badge>
													</div>
												</div>
											)}

											<div className="font-medium">Feedback Submissions</div>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Vote ID</TableHead>
														<TableHead>User</TableHead>
														<TableHead>Feedback</TableHead>
														<TableHead>Status</TableHead>
														<TableHead>Submitted At</TableHead>
														<TableHead>API Info</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{result.feedbacks.map(feedback => (
														<TableRow key={feedback.voteId}>
															<TableCell>{feedback.voteId}</TableCell>
															<TableCell>{feedback.username}</TableCell>
															<TableCell>
																<div className="max-w-md truncate">
																	{feedback.feedbackContent}
																</div>
															</TableCell>
															<TableCell>
																<div className="flex items-center space-x-2">
																	{getFeedbackStatusBadge(
																		feedback.status,
																		feedback.submittedAt,
																	)}
																	{feedback.error && (
																		<HoverCard>
																			<HoverCardTrigger>
																				<InfoIcon className="h-4 w-4 text-red-500" />
																			</HoverCardTrigger>
																			<HoverCardContent>
																				<p className="text-sm text-red-500">
																					{feedback.error}
																				</p>
																			</HoverCardContent>
																		</HoverCard>
																	)}
																</div>
															</TableCell>
															<TableCell>
																{formatDate(feedback.submittedAt)}
															</TableCell>
															<TableCell>
																{feedback.apiRequest && (
																	<HoverCard>
																		<HoverCardTrigger>
																			<InfoIcon className="h-4 w-4 text-blue-500" />
																		</HoverCardTrigger>
																		<HoverCardContent className="w-[600px]">
																			{renderApiInfo(
																				feedback.apiRequest,
																				feedback.apiResponse,
																			)}
																		</HoverCardContent>
																	</HoverCard>
																)}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									</TableCell>
								</TableRow>
							)}
						</React.Fragment>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
