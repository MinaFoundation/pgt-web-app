import { z } from 'zod'

export const considerationOptionsSchema = z.object({
	query: z.string().optional().nullable(),
	filterBy: z
		.enum(['all', 'approved', 'rejected', 'pending'])
		.optional()
		.nullable(),
	sortBy: z.enum(['createdAt', 'status']).optional().nullable(),
	sortOrder: z.enum(['asc', 'desc']).optional().nullable(),
})

export type ConsiderationOptionsSchema = z.infer<
	typeof considerationOptionsSchema
>
