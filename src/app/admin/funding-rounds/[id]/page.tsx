import { AddEditFundingRoundComponent } from '@/components/CreateEditFundingRound'
import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Manage Funding Round | MEF Admin',
	description: 'Create or edit funding round',
}

interface PageProps {
	params: Promise<{
		id: string
	}>
}

export default async function ManageFundingRoundPage({ params }: PageProps) {
	const { id } = await params

	return (
		<div className="mx-auto w-full max-w-5xl p-4 sm:px-6 lg:px-8">
			<AddEditFundingRoundComponent roundId={id === 'new' ? null : id} />
		</div>
	)
}
