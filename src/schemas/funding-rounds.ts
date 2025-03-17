import { z } from 'zod'

export const phaseDateSchema = z
	.object({
		from: z.date().or(z.string().date()),
		to: z.date().or(z.string().date()),
	})
	.refine(d => d.from < d.to, {
		message: 'from must be before to',
	})

export type PhaseDate = z.infer<typeof phaseDateSchema>

export const phaseDatesSchema = z.object({
	fundingRoundDates: phaseDateSchema,
	submissionDates: phaseDateSchema,
	considerationDates: phaseDateSchema,
	deliberationDates: phaseDateSchema,
	votingDates: phaseDateSchema,
})

export type PhaseDates = z.infer<typeof phaseDatesSchema>

export const fundingRoundCreateSchema = phaseDatesSchema.merge(
	z.object({
		name: z.string().min(1).max(100),
		description: z.string().min(1),
		topicId: z.string().uuid(),
		totalBudget: z.number().positive(),
		createdById: z.string().uuid(),
	}),
)

export type FundingRoundCreate = z.infer<typeof fundingRoundCreateSchema>
