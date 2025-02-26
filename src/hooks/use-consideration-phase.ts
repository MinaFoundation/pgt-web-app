'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { ConsiderationProposal } from '@/types/consideration'
import type { Dispatch, SetStateAction } from 'react'
import { GET_JSON_RESPONSE } from '@/app/api/funding-rounds/[id]/consideration-proposals/route'

interface UseConsiderationPhaseResult {
	proposals: GET_JSON_RESPONSE
	loading: boolean
	error: string | null
	setProposals: Dispatch<SetStateAction<GET_JSON_RESPONSE>>
}

export function useConsiderationPhase(
	fundingRoundId: string,
): UseConsiderationPhaseResult {
	const [proposals, setProposals] = useState<GET_JSON_RESPONSE>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const { toast } = useToast()

	useEffect(() => {
		async function fetchProposals() {
			try {
				const response = await fetch(
					`/api/funding-rounds/${fundingRoundId}/consideration-proposals`,
				)

				if (!response.ok) {
					throw new Error('Failed to fetch proposals')
				}

				const data: GET_JSON_RESPONSE = await response.json()
				setProposals(data)
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Failed to fetch proposals'
				setError(message)
				toast({
					title: 'Error',
					description: message,
					variant: 'destructive',
				})
			} finally {
				setLoading(false)
			}
		}

		fetchProposals()
	}, [fundingRoundId, toast])

	return {
		proposals,
		loading,
		error,
		setProposals,
	}
}
