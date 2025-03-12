import { z } from 'zod'

export const getDeliberationProposalsOptionsSchema = z.object({
	query: z.string().optional().nullable(),
	filterBy: z
		.enum(['all', 'recommended', 'not-recommended', 'pending'])
		.optional()
		.nullable(),
	sortBy: z.enum(['createdAt', 'status']).optional().nullable(),
	sortOrder: z.enum(['asc', 'desc']).optional().nullable(),
})

export type GetDeliberationProposalsOptions = z.infer<
	typeof getDeliberationProposalsOptionsSchema
>
