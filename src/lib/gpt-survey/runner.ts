import { GptSurveyClient, GptSurveyResponse, ApiRequestInfo } from './client'
import { GptSurveyService } from '@/services/GptSurveyService'
import logger from '@/logging'
import { AppError } from '../errors'

export interface ProcessingResult {
	proposalId: number
	title: string
	proposalAuthor?: string
	proposalDescription?: string
	endTime?: Date
	status: 'created' | 'exists' | 'error'
	error?: string
	submittedAt?: Date
	apiRequest?: ApiRequestInfo
	apiResponse?: {
		status: number
		body: unknown
	}
	summary?: string
	summaryUpdatedAt?: Date
	feedbacks: Array<{
		voteId: string
		username?: string
		feedbackContent?: string
		status: 'submitted' | 'exists' | 'error'
		error?: string
		submittedAt?: Date
		apiRequest?: ApiRequestInfo
		apiResponse?: {
			status: number
			body: unknown
		}
	}>
}

interface FeedbackResult {
	voteId: string
	username?: string
	feedbackContent?: string
	status: 'submitted' | 'exists' | 'error'
	error?: string
	apiRequest?: ApiRequestInfo
	apiResponse?: {
		status: number
		body: unknown
	}
}

export class GptSurveyRunner {
	constructor(
		private client: GptSurveyClient,
		private service: GptSurveyService,
	) {}

	async processFundingRound(
		roundId: string,
		forceSummary = false,
	): Promise<ProcessingResult[]> {
		const results: ProcessingResult[] = []
		let hasNewFeedback = false

		try {
			// Get all proposals in the funding round that are in deliberation or later
			const proposals = await this.service.getProposalsByFundingRound(roundId)
			const fundingRound = await this.service.getFundingRound(roundId)

			if (!fundingRound?.deliberationPhase) {
				throw new AppError(
					'Funding round not found or missing deliberation phase',
					404,
				)
			}

			for (const proposal of proposals) {
				const metadata = proposal.user?.metadata as
					| { username?: string }
					| undefined
				let proposalHasNewFeedback = false

				const result: ProcessingResult = {
					proposalId: proposal.id,
					title: `${proposal.id}. ${proposal.title}`,
					proposalAuthor: metadata?.username || 'anonymous',
					proposalDescription: proposal.proposalSummary || '',
					endTime: fundingRound.deliberationPhase.endDate,
					status: 'exists',
					feedbacks: [],
				}

				try {
					// Check if proposal exists in GPT Survey
					const existingSubmission = await this.service.getProposalSubmission(
						proposal.id,
					)

					if (!existingSubmission) {
						// Create proposal in GPT Survey
						const createProposalParams = {
							proposalId: proposal.id.toString(),
							title: `${proposal.id}. ${proposal.title}`,
							proposalAuthor: metadata?.username || 'anonymous',
							proposalDescription: proposal.proposalSummary || '',
							endTime: fundingRound.deliberationPhase.endDate,
							fundingRoundId: fundingRound.mefId,
						}

						const requestInfo =
							GptSurveyClient.buildCreateProposalRequest(createProposalParams)

						try {
							const response =
								await this.client.createProposal(createProposalParams)

							await this.service.createProposalSubmission({
								proposalId: proposal.id,
								request: JSON.stringify(requestInfo),
								response: JSON.stringify({
									status: response.status,
									body: response.body,
								}),
								isSuccess: response.status === 200,
							})

							result.status = 'created'
							result.apiRequest = requestInfo
							result.apiResponse = {
								status: response.status,
								body: response.body,
							}
						} catch (error) {
							result.status = 'error'
							result.error =
								error instanceof Error ? error.message : 'Unknown error'
							logger.error('Failed to create proposal in GPT Survey:', error)
						}
					}

					// Process community deliberation votes
					if (proposal.deliberationCommunityVotes) {
						for (const vote of proposal.deliberationCommunityVotes) {
							if (!vote.user?.metadata) continue

							const metadata = vote.user.metadata as { username?: string }
							const feedbackResult: FeedbackResult = {
								voteId: vote.id,
								username: metadata.username || 'anonymous',
								feedbackContent: vote.feedback || '',
								status: 'exists',
							}

							try {
								const existingFeedback =
									await this.service.getFeedbackSubmission(vote.id)

								if (!existingFeedback) {
									// Submit feedback to GPT Survey
									const feedbackRequestInfo = {
										method: 'POST' as const,
										endpoint: `/api/govbot/proposals/${proposal.id}/feedbacks`,
										body: {
											username: metadata.username || 'anonymous',
											feedbackContent: vote.feedback || '',
										},
										headers: { 'Content-Type': 'application/json' },
									}

									try {
										// Now submit the feedback
										const response = await this.client.addFeedback(
											proposal.id.toString(),
											metadata.username || 'anonymous',
											vote.feedback || '',
										)

										await this.service.createFeedbackSubmission({
											communityDeliberationVoteId: vote.id,
											proposalId: proposal.id.toString(),
											request: JSON.stringify(feedbackRequestInfo),
											response: JSON.stringify({
												status: response.status,
												body: response.body,
											}),
											isSuccess: response.status === 200,
										})

										feedbackResult.status = 'submitted'
										feedbackResult.apiRequest = feedbackRequestInfo
										feedbackResult.apiResponse = {
											status: response.status,
											body: response.body,
										}
										proposalHasNewFeedback = true
										hasNewFeedback = true
									} catch (error) {
										feedbackResult.status = 'error'
										feedbackResult.error =
											error instanceof Error ? error.message : 'Unknown error'
										logger.error(
											'Failed to submit feedback to GPT Survey:',
											error,
										)
									}
								}

								result.feedbacks.push(feedbackResult)
							} catch (error) {
								feedbackResult.status = 'error'
								feedbackResult.error =
									error instanceof Error ? error.message : 'Unknown error'
								result.feedbacks.push(feedbackResult)
								logger.error('Failed to process feedback:', error)
							}
						}
					}

					// Generate and store summary if there are feedbacks and either force summary is true or new feedback was submitted
					if (
						proposal.deliberationCommunityVotes?.length > 0 &&
						(forceSummary || proposalHasNewFeedback)
					) {
						try {
							const summaryResponse = await this.client.summarizeFeedbacks(
								proposal.id.toString(),
							)

							if (summaryResponse.status === 201 && summaryResponse.body) {
								const summaryData = summaryResponse.body as {
									feedbackSummary?: string
								}
								if (summaryData.feedbackSummary) {
									await this.service.updateProposalSummary(
										proposal.id,
										summaryData.feedbackSummary,
									)
									result.summary = summaryData.feedbackSummary
									result.summaryUpdatedAt = new Date()
								}
							}
						} catch (error) {
							logger.error(
								'Failed to generate/store summary for proposal:',
								error,
							)
							result.error = `${result.error ? result.error + '. ' : ''}Failed to generate summary`
						}
					}

					results.push(result)
				} catch (error) {
					result.status = 'error'
					result.error =
						error instanceof Error ? error.message : 'Unknown error'
					logger.error('Failed to process proposal:', error)
					results.push(result)
				}
			}

			return results
		} catch (error) {
			logger.error('Failed to process funding round:', error)
			throw new AppError('Failed to process funding round', 500)
		}
	}
}
