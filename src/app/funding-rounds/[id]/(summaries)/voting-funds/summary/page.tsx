import { notFound } from 'next/navigation'
import { VotingService } from '@/services/VotingService'
import { prisma } from '@/lib/prisma'
import { VotingPhaseFundsDistributionSummary } from '@/components/phase-summary/VotingPhaseFundsDistributionSummary'

type Props = {
	params: Promise<{
		id: string
	}>
}

const VotingPhaseFundsDistributionSummaryPage = async ({ params }: Props) => {
	const { id } = await params
	const votingService = new VotingService(prisma)

	try {
		const summary =
			await votingService.getVotingPhaseFundsDistributionSummary(id)
		console.log(summary)

		return (
			<div className="container mx-auto max-w-7xl py-6">
				<VotingPhaseFundsDistributionSummary
					summary={summary}
					fundingRoundId={id}
				/>
			</div>
		)
	} catch (error) {
		return notFound()
	}
}

export default VotingPhaseFundsDistributionSummaryPage
