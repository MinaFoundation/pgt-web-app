import logger from '@/logging'
import prisma from '@/lib/prisma'

interface OCVVote {
	account: string
	hash: string
	memo: string
	height: number
	status: string
	timestamp: number
	nonce: number
}

export interface OCVVoteResponse {
	proposal_id: number
	total_community_votes: number
	total_positive_community_votes: number
	total_negative_community_votes: number
	total_stake_weight: string
	positive_stake_weight: string
	negative_stake_weight: string
	vote_status: string
	elegible: boolean
	votes: OCVVote[]
}

export interface OCVRankedVoteResponse {
	round_id: number
	total_votes: number
	winners: number[]
	stats: {
		[key: string]: {
			count: number
			percentage: number
		}
	}
	votes: {
		account: string
		proposals: number[]
		hash: string
		memo: string
		height: number
		status: string
		timestamp: number
		nonce: number
	}[]
}

export class OCVApiService {
	private static readonly FALLBACK_OCV_API_BASE_URL =
		'https://on-chain-voting-staging-devnet.minaprotocol.network/'
	private baseUrl: string | undefined
	constructor() {
		const envUrl = process.env.NEXT_PUBLIC_OCV_API_BASE_URL
		this.baseUrl = envUrl ?? OCVApiService.FALLBACK_OCV_API_BASE_URL

		if (!envUrl) {
			logger.warn(
				'[OCVApiService] NEXT_PUBLIC_OCV_API_BASE_URL not set, using fallback URL:',
				this.baseUrl,
			)
		}
	}

	async getConsiderationVotes(
		proposalId: number,
		mefId: number,
		startTime: number,
		endTime: number,
	): Promise<OCVVoteResponse> {
		const url = `${this.baseUrl}/api/mef_proposal_consideration/${mefId}/${proposalId}/${startTime}/${endTime}?ledger_hash`

		try {
			const response = await fetch(url, {
				headers: {
					Accept: 'application/json',
				},
				signal: AbortSignal.timeout(10000),
			})

			if (!response.ok) {
				throw new Error(`[OCVApiService] OCV API error: ${response.statusText}`)
			}

			const data = await response.json()
			logger.debug(
				`[OCVApiService] OCV vote data for proposal ${proposalId}:`,
				data,
			)

			return data
		} catch (error) {
			logger.error(
				`[OCVApiService] Failed to fetch OCV votes for proposal ${proposalId}:`,
				error,
			)
			throw error
		}
	}

	async getRankedVotes(
		roundId: number,
		startTime?: number,
		endTime?: number,
	): Promise<OCVRankedVoteResponse> {
		if (startTime === undefined || endTime === undefined) {
			const fundingRound = await prisma.fundingRound.findUnique({
				where: { mefId: roundId },
				include: { votingPhase: true },
			})

			if (!fundingRound || !fundingRound.votingPhase) {
				throw new Error(
					`[OCVApiService] Funding round or voting phase not found for roundId: ${roundId}`,
				)
			}

			startTime = Math.floor(fundingRound.votingPhase.startDate.getTime())
			endTime = Math.floor(fundingRound.votingPhase.endDate.getTime())
		}

		const url = `${this.baseUrl}/api/mef_ranked_vote/${roundId}/${startTime}/${endTime}`

		try {
			const response = await fetch(url, {
				headers: {
					Accept: 'application/json',
				},
				signal: AbortSignal.timeout(10000),
			})

			if (!response.ok) {
				throw new Error(`[OCVApiService] OCV API error: ${response.statusText}`)
			}

			const data = await response.json()
			logger.debug(
				`[OCVApiService] OCV ranked vote data for round ${roundId}:`,
				data,
			)

			return data
		} catch (error) {
			logger.error(
				`[OCVApiService] Failed to fetch ranked votes for round ${roundId}:`,
				error,
			)
			throw error
		}
	}
}
