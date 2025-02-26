import { NextRequest } from 'next/server'
import { ApiResponse } from '@/lib/api-response'
import { AppError } from '@/lib/errors'
import { GptSurveyService } from '@/services/GptSurveyService'
import logger from '@/logging'
import { ProcessingResult } from '@/lib/gpt-survey/runner'
import prisma from '@/lib/prisma'
import { WorkerStatus } from '@prisma/client'

interface UserMetadata {
	username: string
	[key: string]: unknown
}

export async function GET(request: NextRequest) {
	try {
		const roundId = request.nextUrl.searchParams.get('roundId')
		const service = new GptSurveyService()

		// Get the most recent job execution
		const lastJob = await prisma.workerHeartbeat.findFirst({
			where: {
				name: 'gpt-survey-processor',
			},
			orderBy: {
				lastHeartbeat: 'desc',
			},
		})

		// Check if there's a currently running job
		const runningJob = await prisma.workerHeartbeat.findFirst({
			where: {
				name: 'gpt-survey-processor',
				status: WorkerStatus.RUNNING,
			},
		})

		// If roundId is provided, fetch proposal details
		let results: ProcessingResult[] = []
		if (roundId) {
			const fundingRound = await service.getFundingRound(roundId)
			if (!fundingRound?.deliberationPhase) {
				throw new AppError(
					'Funding round not found or missing deliberation phase',
					404,
				)
			}

			const { deliberationPhase } = fundingRound
			const proposals = await service.getProposalsByFundingRound(roundId)

			results = proposals.map(proposal => ({
				proposalId: proposal.id,
				title: `${proposal.id}. ${proposal.title}`,
				proposalAuthor: proposal.email || undefined,
				proposalDescription: proposal.proposalSummary || undefined,
				endTime: deliberationPhase.endDate,
				status: proposal.GptSurveySummarizerProposal ? 'created' : 'exists',
				submittedAt: proposal.GptSurveySummarizerProposal?.createdAt,
				summary: proposal.GptSurveySummarizerProposal?.summary || undefined,
				summaryUpdatedAt:
					proposal.GptSurveySummarizerProposal?.summary_updated_at || undefined,
				feedbacks:
					proposal.deliberationCommunityVotes?.map(vote => ({
						voteId: vote.id,
						username:
							(vote.user?.metadata as UserMetadata | undefined)?.username ||
							'anonymous',
						feedbackContent: vote.feedback || '',
						status: vote.GptSurveySummarizerFeedback ? 'submitted' : 'exists',
						submittedAt: vote.GptSurveySummarizerFeedback?.createdAt,
					})) || [],
			}))
		}

		return ApiResponse.success({
			results,
			lastExecution: lastJob
				? {
						status: lastJob.status,
						timestamp: lastJob.lastHeartbeat,
						metadata: lastJob.metadata,
					}
				: null,
			isRunning: runningJob ? true : false,
		})
	} catch (error) {
		logger.error('Error fetching GPT Survey status:', error)
		return ApiResponse.error(error)
	}
}
