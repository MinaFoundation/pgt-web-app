'use client'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/select'
import { Loader2Icon, X } from 'lucide-react'
import Link from 'next/link'
import { FC, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DiscussionTopicInput } from '@/schemas/discussion-topic'

interface ReviewerGroup {
	id: string
	name: string
}

interface Topic {
	id: string
	name: string
	description: string
	reviewerGroups: Array<{
		reviewerGroup: ReviewerGroup
	}>
}

export const reviewerGroupSchema = z.object({
	id: z.string(),
	name: z.string(),
})

export const reviewRequestSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().min(1, 'Description is required'),
	selectedGroups: z
		.array(reviewerGroupSchema)
		.min(1, 'At least one reviewer group is required'),
})

export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>

interface ReviewRequestFormProps {
	topicId?: string
}

export function AddEditDiscussionTopicComponent({
	topicId,
}: {
	topicId: string | null
}) {
	const { toast } = useToast()
	const router = useRouter()
	const [loading, setLoading] = useState(false)
	const [selectedGroups, setSelectedGroups] = useState<ReviewerGroup[]>([])

	const [availableGroups, setAvailableGroups] = useState<ReviewerGroup[]>([])
	const [dataLoading, setDataLoading] = useState(true)

	const form = useForm<ReviewRequestInput>({
		resolver: zodResolver(reviewRequestSchema),
		defaultValues: {
			name: '',
			description: '',
			selectedGroups: [],
		},
	})

	const handleAddGroup = (groupId: string) => {
		const groupToAdd = availableGroups.find(g => g.id === groupId)
		if (groupToAdd && !selectedGroups.some(g => g.id === groupId)) {
			setSelectedGroups(prev => [...prev, groupToAdd])
		}
	}

	const handleRemoveGroup = (groupId: string) => {
		setSelectedGroups(prev => prev.filter(group => group.id !== groupId))
	}

	const handleSave = async (values: DiscussionTopicInput) => {
		try {
			setLoading(true)
			const endpoint = topicId
				? `/api/admin/discussion-topics/${topicId}`
				: '/api/admin/discussion-topics'

			const method = topicId ? 'PUT' : 'POST'
			const submissionData = {
				...values,
				reviewerGroupIds: selectedGroups.map(g => g.id),
			}
			const response = await fetch(endpoint, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(submissionData),
			})

			if (!response.ok) throw new Error('Failed to save topic')

			toast({
				title: 'Success',
				description: `Topic ${topicId ? 'updated' : 'created'} successfully`,
			})

			router.push('/admin/discussions')
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to save topic',
				variant: 'destructive',
			})
		} finally {
			setLoading(false)
		}
	}
	const handleDelete = async () => {
		if (!topicId) return

		if (!confirm('Are you sure you want to delete this topic?')) return

		try {
			setLoading(true)
			const response = await fetch(`/api/admin/discussion-topics/${topicId}`, {
				method: 'DELETE',
			})

			if (!response.ok) throw new Error('Failed to delete topic')

			toast({
				title: 'Success',
				description: 'Topic deleted successfully',
			})

			router.push('/admin/discussions')
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to delete topic',
				variant: 'destructive',
			})
		} finally {
			setLoading(false)
		}
	}
	useEffect(() => {
		const fetchData = async () => {
			setDataLoading(true)
			try {
				// Fetch available reviewer groups
				const groupsResponse = await fetch('/api/admin/reviewer-groups')
				if (!groupsResponse.ok)
					throw new Error('Failed to fetch reviewer groups')
				const groups = await groupsResponse.json()
				setAvailableGroups(groups)

				// If editing, fetch topic data
				if (topicId && topicId !== 'new') {
					const topicResponse = await fetch(
						`/api/admin/discussion-topics/${topicId}`,
					)
					if (!topicResponse.ok) throw new Error('Failed to fetch topic')
					const topic: Topic = await topicResponse.json()
					form.reset({
						name: topic.name,
						description: topic.description,
						selectedGroups: topic.reviewerGroups.map(rg => rg.reviewerGroup),
					})
				}
			} catch (error) {
				toast({
					title: 'Error',
					description: 'Failed to load data',
					variant: 'destructive',
				})
			} finally {
				setDataLoading(false)
			}
		}

		fetchData()
	}, [topicId, toast])
	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Topic Name</FormLabel>
							<FormControl>
								<Input
									{...field}
									placeholder="Enter topic name"
									className="bg-muted"
									disabled={loading}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Topic Description</FormLabel>
							<FormControl>
								<Textarea
									{...field}
									placeholder="Enter topic description"
									className="min-h-[150px] bg-muted"
									disabled={loading}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="selectedGroups"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Reviewers Group</FormLabel>
							{dataLoading ? (
								<div className="flex items-center gap-2">
									<Loader2Icon className="h-4 w-4 animate-spin" />
									<span>Loading groups...</span>
								</div>
							) : (
								<Select
									onValueChange={value =>
										field.onChange([
											...field.value,
											availableGroups.find(g => g.id === value),
										])
									}
									disabled={loading}
								>
									<SelectTrigger className="bg-muted">
										<SelectValue placeholder="Select a group" />
									</SelectTrigger>
									<SelectContent>
										{availableGroups
											.filter(
												group => !field.value.some(g => g.id === group.id),
											)
											.map(group => (
												<SelectItem key={group.id} value={group.id}>
													{group.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="space-y-2">
					{form.watch('selectedGroups').map(group => (
						<div
							key={group.id}
							className="flex items-center justify-between rounded-md bg-muted p-3"
						>
							<span className="text-muted-foreground">{group.name}</span>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() =>
									form.setValue(
										'selectedGroups',
										form.watch('selectedGroups').filter(g => g.id !== group.id),
									)
								}
								disabled={loading}
							>
								<X className="h-4 w-4" />
								<span className="sr-only">Remove {group.name}</span>
							</Button>
						</div>
					))}
				</div>

				<div className="flex items-center justify-between pt-6">
					{topicId && topicId !== 'new' && (
						<Button
							type="button"
							variant="destructive"
							onClick={handleDelete}
							disabled={loading}
						>
							Remove Topic
						</Button>
					)}
					<div className="ml-auto flex gap-4">
						<Link href="/admin/discussions">
							<Button type="button" variant="outline" disabled={loading}>
								Cancel
							</Button>
						</Link>
						<Button type="submit" disabled={loading}>
							{loading ? 'Saving...' : 'Save Topic'}
						</Button>
					</div>
				</div>
			</form>
		</Form>
	)
}
