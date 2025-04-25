import { z } from 'zod'

export const reviewerGroupSchema = z.object({
	id: z.string(),
	name: z.string(),
})

export const discussionTopicSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().min(1, 'Description is required'),
	selectedGroups: z
		.array(reviewerGroupSchema)
		.min(1, 'At least one reviewer group is required'),
})

export type ReviewerGroup = z.infer<typeof reviewerGroupSchema>
export type DiscussionTopicInput = z.infer<typeof discussionTopicSchema>
