import { notFound } from 'next/navigation'
import { VotingService } from '@/services/VotingService'
import { prisma } from '@/lib/prisma'
import { VotingPhaseRankedSummary } from '@/components/phase-summary/VotingPhaseRankedSummary'

type Props = {
	params: Promise<{
		id: string
	}>
}

const VotingPhaseRankedSummaryPage = async ({ params }: Props) => {
	const { id } = await params
	const votingService = new VotingService(prisma)

	try {
		const summary = await votingService.getVotingPhaseRankedSummary(id)

		return (
			<div className="container mx-auto max-w-7xl py-6">
				<VotingPhaseRankedSummary summary={summary} fundingRoundId={id} />
			</div>
		)
	} catch (error) {
		return notFound()
	}
}

export default VotingPhaseRankedSummaryPage
