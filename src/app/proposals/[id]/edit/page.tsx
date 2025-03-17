import { ProposalEditForm } from '@/components/ProposalEditForm'
import type { Metadata } from 'next'
import { use } from 'react'

export const metadata: Metadata = {
	title: 'Edit Proposal | MEF',
	description: 'Edit your proposal',
}

export default function EditProposalPage({
	params,
}: {
	params: Promise<{
		id: string
	}>
}) {
	const { id } = use(params)

	return (
		<div className="mx-auto w-full max-w-5xl p-4 sm:px-6 lg:px-8">
			<ProposalEditForm proposalId={id} />
		</div>
	)
}
