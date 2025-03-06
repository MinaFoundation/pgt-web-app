import { notFound } from 'next/navigation'
import { DeliberationService } from '@/services/DeliberationService'
import { prisma } from '@/lib/prisma'
import { DeliberationPhaseSummary } from '@/components/funding-rounds/DeliberationPhaseSummary'

type Props = {
	params: Promise<{
		id: string
	}>
}

const DeliberationPhaseSummaryPage = async ({ params }: Props) => {
	const { id } = await params
	const deliberationService = new DeliberationService(prisma)

	try {
		const summary = await deliberationService.getDeliberationPhaseSummary(id)

		return (
			<div className="container mx-auto max-w-7xl py-6">
				<DeliberationPhaseSummary summary={summary} />
			</div>
		)
	} catch (error) {
		return notFound()
	}
}

export default DeliberationPhaseSummaryPage
