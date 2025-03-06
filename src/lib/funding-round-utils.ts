import { FundingRoundPhase, FundingRoundPhases } from '@/types/funding-round'

export const formatDate = (date: Date) => {
	return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()}`
}

export const formatDateDiff = (diff: number): string => {
	// Calculate days, hours, minutes
	const days = Math.floor(diff / (1000 * 60 * 60 * 24))
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

	if (days > 0) {
		return `${days}d ${hours}h`
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m`
	}
	return `${minutes}m`
}

export const getTimeRemaining = (date: Date): string => {
	const now = Date.now()
	const diff = date.getTime() - now

	// Time already passed
	if (diff < 0) {
		return 'Ended'
	}

	return formatDateDiff(diff)
}

export const getTimeSince = (date: Date): string => {
	const now = Date.now()
	const diff = now - date.getTime()

	return formatDateDiff(diff)
}

export const getPreviousAndNextForBetweenPhase = (
	phases: FundingRoundPhases,
): {
	nextPhase: {
		name: FundingRoundPhase
		startDate: string
		endDate: string
	} | null
	previousPhase: {
		name: FundingRoundPhase
		startDate: string
		endDate: string
	} | null
} => {
	const now = new Date()

	const destructuredPhases = Object.entries(phases).map(
		([name, { startDate, endDate }], index) => ({
			index,
			name,
			startDate,
			endDate,
		}),
	)

	const nextPhase = destructuredPhases.find(
		({ startDate }) => new Date(startDate) > now,
	)

	const previousPhase = destructuredPhases.find(
		({ endDate }) => new Date(endDate) < now,
	)

	return {
		nextPhase: nextPhase
			? {
					name: nextPhase.name as FundingRoundPhase,
					startDate: nextPhase.startDate,
					endDate: nextPhase.endDate,
				}
			: null,
		previousPhase: previousPhase
			? {
					name: previousPhase.name as FundingRoundPhase,
					startDate: previousPhase.startDate,
					endDate: previousPhase.endDate,
				}
			: null,
	}
}
