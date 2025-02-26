import { AppError } from '../errors'
import logger from '@/logging'

export interface GptSurveyClientConfig {
	baseUrl: string
	authSecret: string
	dryRun?: boolean
}

export interface CreateProposalParams {
	proposalId: string
	title: string
	proposalDescription: string
	proposalAuthor: string
	endTime: Date
	fundingRoundId: number
}

export interface GptSurveyResponse {
	status: number
	body: unknown
}

export interface ApiRequestInfo {
	method: 'GET' | 'POST'
	endpoint: string
	body?: unknown
	headers?: Record<string, string>
}

export class GptSurveyClient {
	private baseUrl: string
	private authSecret: string
	private dryRun: boolean

	constructor(config: GptSurveyClientConfig) {
		this.baseUrl = config.baseUrl.endsWith('/')
			? config.baseUrl.slice(0, -1)
			: config.baseUrl
		this.authSecret = config.authSecret
		this.dryRun = config.dryRun ?? false

		if (!this.baseUrl) {
			throw new AppError('PGT_GSS_API_URL environment variable is not set', 500)
		}
	}

	static buildCreateProposalRequest(
		params: CreateProposalParams,
	): ApiRequestInfo {
		return {
			method: 'POST',
			endpoint: '/api/govbot/proposals',
			body: {
				proposalId: params.proposalId,
				title: params.title,
				proposalDescription: params.proposalDescription,
				proposalAuthor: params.proposalAuthor,
				endTime: params.endTime.toISOString(),
				fundingRoundId: params.fundingRoundId,
			},
			headers: {
				'Content-Type': 'application/json',
			},
		}
	}

	private async makeRequest(
		requestInfo: ApiRequestInfo,
	): Promise<GptSurveyResponse> {
		if (this.dryRun) {
			logger.info('Dry run - would make request:', requestInfo)
			return {
				status: 200,
				body: { message: 'Dry run - no actual request made' },
			}
		}

		const response = await fetch(`${this.baseUrl}${requestInfo.endpoint}`, {
			method: requestInfo.method,
			headers: {
				...requestInfo.headers,
				Authorization: `Bearer ${this.authSecret}`,
			},
			body: requestInfo.body ? JSON.stringify(requestInfo.body) : undefined,
		})
		logger.info('Request:', requestInfo)
		logger.info('Response:', response)
		const data = await response.json()

		return {
			status: response.status,
			body: data,
		}
	}

	async createProposal(
		params: CreateProposalParams,
	): Promise<GptSurveyResponse> {
		try {
			const requestInfo = GptSurveyClient.buildCreateProposalRequest(params)
			return await this.makeRequest(requestInfo)
		} catch (error) {
			logger.error('Failed to create proposal in GPT Survey:', error)
			throw new AppError('Failed to create proposal in GPT Survey', 500)
		}
	}

	async healthCheck(): Promise<GptSurveyResponse> {
		return this.makeRequest({
			method: 'GET',
			endpoint: '/api/govbot',
			headers: {
				'Content-Type': 'application/json',
			},
		})
	}

	async summarizeProposal(proposalId: string): Promise<GptSurveyResponse> {
		try {
			return await this.makeRequest({
				method: 'POST',
				endpoint: `/api/govbot/proposals/${proposalId}/summarize`,
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error) {
			logger.error('Failed to summarize proposal:', error)
			throw new AppError('Failed to summarize proposal', 500)
		}
	}

	async getProposalSummary(proposalId: string): Promise<GptSurveyResponse> {
		try {
			return await this.makeRequest({
				method: 'GET',
				endpoint: `/api/govbot/proposals/${proposalId}/summary`,
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error) {
			logger.error('Failed to get proposal summary:', error)
			throw new AppError('Failed to get proposal summary', 500)
		}
	}

	// New method: Add Feedback
	async addFeedback(
		proposalId: string,
		username: string,
		feedbackContent: string,
	): Promise<GptSurveyResponse> {
		try {
			return await this.makeRequest({
				method: 'POST',
				endpoint: `/api/govbot/proposals/${proposalId}/feedbacks`,
				body: { username, feedbackContent },
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error) {
			logger.error('Failed to add feedback:', error)
			throw new AppError('Failed to add feedback', 500)
		}
	}

	// New method: Summarize Feedbacks for Proposal
	async summarizeFeedbacks(proposalId: string): Promise<GptSurveyResponse> {
		try {
			return await this.makeRequest({
				method: 'POST',
				endpoint: `/api/govbot/proposals/${proposalId}/feedbacks/summary`,
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error) {
			logger.error('Failed to summarize feedbacks:', error)
			throw new AppError('Failed to summarize feedbacks', 500)
		}
	}

	// New method: Get Feedback Summary
	async getFeedbackSummary(proposalId: string): Promise<GptSurveyResponse> {
		try {
			return await this.makeRequest({
				method: 'GET',
				endpoint: `/api/govbot/proposals/${proposalId}/feedbacks/summary`,
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error) {
			logger.error('Failed to get feedback summary:', error)
			throw new AppError('Failed to get feedback summary', 500)
		}
	}
}
