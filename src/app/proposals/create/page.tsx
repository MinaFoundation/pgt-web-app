import CreateProposalComponent from '@/components/CreateProposal'
import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Create Proposal | MEF',
}

export default function CreateProposalPage() {
	return <CreateProposalComponent />
}
