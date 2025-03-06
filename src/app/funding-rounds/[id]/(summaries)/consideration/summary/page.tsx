import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ConsiderationPhaseSummary } from '@/components/phase-summary/ConsiderationPhaseSummary'
import { type Metadata } from 'next'
import { ConsiderationVotingService } from '@/services/ConsiderationVotingService'

type MetadataProps = {
	params: Promise<{
		id: string
	}>
}

export async function generateMetadata({
	params,
}: MetadataProps): Promise<Metadata> {
	await params // We don't need the id for this metadata, but we still need to await the promise
	return {
		title: 'Consideration Phase Summary',
		description: 'Summary of the consideration phase for this funding round.',
	}
}

type Props = {
	params: Promise<{
		id: string
	}>
}

const ConsiderationPhaseSummaryPage = async ({ params }: Props) => {
	const { id } = await params
	const considerationVotingService = new ConsiderationVotingService(prisma)
	const summary =
		await considerationVotingService.getConsiderationPhaseSummary(id)

	if (!summary) {
		notFound()
	}

	return (
		<div className="container mx-auto max-w-7xl py-6">
			<ConsiderationPhaseSummary summary={summary} fundingRoundId={id} />
		</div>
	)
}

export default ConsiderationPhaseSummaryPage
