import { z } from 'zod'

export const getConsiderationProposalsOptionsSchema = z.object({
	query: z.string().optional().nullable(),
	filterBy: z
		.enum(['all', 'approved', 'rejected', 'pending'])
		.optional()
		.nullable(),
	sortBy: z.enum(['createdAt', 'status']).optional().nullable(),
	sortOrder: z.enum(['asc', 'desc']).optional().nullable(),
})

export type GetConsiderationProposalsOptions = z.infer<
	typeof getConsiderationProposalsOptionsSchema
>
