'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { CreateProposal } from './CreateProposal'
import { useProposal } from '@/hooks/use-proposal'
import { ProposalService } from '@/services'
import { useAuth } from '@/contexts/AuthContext'

export function ProposalEditForm({ proposalId }: { proposalId: string }) {
	const router = useRouter()
	const { user } = useAuth()
	const { toast } = useToast()

	const { data: proposal, isLoading } = useProposal(proposalId)

	useEffect(() => {
		if (!proposal || !user) return

		const canEdit = ProposalService.hasEditPermission(user, proposal)

		if (!canEdit) {
			toast({
				title: 'Only your draft proposals can be edited',
				variant: 'destructive',
			})
			router.push('/proposals')
			return
		}
	}, [proposal, router, toast, user])

	if (isLoading || !user) {
		return <div className="py-8 text-center">Loading proposal...</div>
	}

	if (!proposal) {
		return <div className="py-8 text-center">Proposal not found</div>
	}

	return <CreateProposal mode="edit" proposalId={proposalId} />
}
