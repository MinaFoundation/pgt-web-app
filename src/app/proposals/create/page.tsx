import CreateProposalComponent from '@/components/CreateProposal'
import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Create Proposal | MEF',
}

export default function CreateProposalPage() {
	return (
		<div className="mx-auto w-full max-w-5xl p-4 sm:px-6 lg:px-8">
			<CreateProposalComponent />
		</div>
	)
}
