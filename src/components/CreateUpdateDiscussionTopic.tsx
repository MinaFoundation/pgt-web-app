'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2Icon, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

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

export function AddEditDiscussionTopicComponent({
	topicId,
}: {
	topicId: string | null
}) {
	const router = useRouter()
	const { toast } = useToast()
	const [loading, setLoading] = useState(false)
	const [dataLoading, setDataLoading] = useState(true)
	const [availableGroups, setAvailableGroups] = useState<ReviewerGroup[]>([])
	const [topicData, setTopicData] = useState({
		name: '',
		description: '',
	})
	const [selectedGroups, setSelectedGroups] = useState<ReviewerGroup[]>([])

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
					setTopicData({
						name: topic.name,
						description: topic.description,
					})
					setSelectedGroups(topic.reviewerGroups.map(rg => rg.reviewerGroup))
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

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target
		setTopicData(prev => ({ ...prev, [name]: value }))
	}

	const handleAddGroup = (groupId: string) => {
		const groupToAdd = availableGroups.find(g => g.id === groupId)
		if (groupToAdd && !selectedGroups.some(g => g.id === groupId)) {
			setSelectedGroups(prev => [...prev, groupToAdd])
		}
	}

	const handleRemoveGroup = (groupId: string) => {
		setSelectedGroups(prev => prev.filter(group => group.id !== groupId))
	}

	const handleSave = async () => {
		try {
			setLoading(true)
			const endpoint = topicId
				? `/api/admin/discussion-topics/${topicId}`
				: '/api/admin/discussion-topics'

			const method = topicId ? 'PUT' : 'POST'
			const response = await fetch(endpoint, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...topicData,
					reviewerGroupIds: selectedGroups.map(g => g.id),
				}),
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

	return (
		<div className="container mx-auto max-w-3xl px-4 py-8">
			<div className="space-y-8">
				<div>
					<h1 className="text-3xl font-bold">
						{topicId && topicId !== 'new'
							? 'Edit Discussion Topic'
							: 'Create Discussion Topic'}
					</h1>
				</div>

				<form onSubmit={e => e.preventDefault()} className="space-y-6">
					<div className="space-y-4">
						<Label htmlFor="name">Topic Name</Label>
						<Input
							id="name"
							name="name"
							value={topicData.name}
							onChange={handleInputChange}
							placeholder="Enter topic name"
							className="bg-muted"
							disabled={loading}
						/>
					</div>

					<div className="space-y-4">
						<Label htmlFor="description">Topic Description</Label>
						<Textarea
							id="description"
							name="description"
							value={topicData.description}
							onChange={handleInputChange}
							placeholder="Enter topic description"
							className="min-h-[150px] bg-muted"
							disabled={loading}
						/>
					</div>

					<div className="space-y-4">
						<Label>Reviewers Group</Label>
						{dataLoading ? (
							<div className="flex items-center gap-2">
								<Loader2Icon className="h-4 w-4 animate-spin" />
								<span>Loading groups...</span>
							</div>
						) : (
							<Select onValueChange={handleAddGroup} disabled={loading}>
								<SelectTrigger className="bg-muted">
									<SelectValue placeholder="Select a group" />
								</SelectTrigger>
								<SelectContent>
									{availableGroups
										.filter(
											group => !selectedGroups.some(g => g.id === group.id),
										)
										.map(group => (
											<SelectItem key={group.id} value={group.id}>
												{group.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						)}

						<div className="space-y-2">
							{selectedGroups.map(group => (
								<div
									key={group.id}
									className="flex items-center justify-between rounded-md bg-muted p-3"
								>
									<span className="text-muted-foreground">{group.name}</span>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => handleRemoveGroup(group.id)}
										disabled={loading}
									>
										<X className="h-4 w-4" />
										<span className="sr-only">Remove {group.name}</span>
									</Button>
								</div>
							))}
						</div>
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
							<Button type="button" onClick={handleSave} disabled={loading}>
								{loading ? 'Saving...' : 'Save Topic'}
							</Button>
						</div>
					</div>
				</form>

				<div>
					<Link href="/admin/discussions">
						<Button variant="secondary">
							Back to Manage Discussion Topics
						</Button>
					</Link>
				</div>
			</div>
		</div>
	)
}
