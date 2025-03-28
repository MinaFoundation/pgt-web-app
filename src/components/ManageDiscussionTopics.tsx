'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trash2, Plus, Loader2Icon } from 'lucide-react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface Topic {
	id: string
	name: string
	description: string
	reviewerGroups: Array<{
		reviewerGroup: {
			id: string
			name: string
		}
	}>
	fundingRounds: Array<{
		id: string
		name: string
	}>
}

export function ManageDiscussionTopicsComponent() {
	const [topics, setTopics] = useState<Topic[]>([])
	const [loading, setLoading] = useState(true)
	const [loadingButton, setLoadingButton] = useState(false)
	const { toast } = useToast()
	const router = useRouter()

	const fetchTopics = useCallback(async () => {
		try {
			const response = await fetch('/api/admin/discussion-topics')
			if (!response.ok) throw new Error('Failed to fetch topics')
			const data = await response.json()
			setTopics(data)
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to load discussion topics',
				variant: 'destructive',
			})
		} finally {
			setLoading(false)
		}
	}, [toast])

	useEffect(() => {
		fetchTopics()
	}, [fetchTopics])

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this topic?')) return

		try {
			const response = await fetch(`/api/admin/discussion-topics/${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) throw new Error('Failed to delete topic')

			toast({
				title: 'Success',
				description: 'Topic deleted successfully',
			})

			// Refresh topics list
			fetchTopics()
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to delete topic',
				variant: 'destructive',
			})
		}
	}

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			<div className="space-y-8">
				<div>
					<h1 className="mb-2 text-3xl font-bold">Manage Discussion Topics</h1>
					<p className="text-muted-foreground">
						Select a Topic to manage or add a new one.
					</p>
				</div>

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[300px]">TOPIC NAME</TableHead>
								<TableHead>REVIEWER GROUP</TableHead>
								<TableHead>FUNDING ROUNDS</TableHead>
								<TableHead className="text-right">ACTIONS</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={6} className="py-4 text-center">
										Loading discussion topics...
									</TableCell>
								</TableRow>
							) : (
								topics.map(topic => (
									<TableRow key={topic.id}>
										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8"
													onClick={() => handleDelete(topic.id)}
												>
													<Trash2 className="h-4 w-4" />
													<span className="sr-only">Delete topic</span>
												</Button>
												<span>{topic.name}</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{topic.reviewerGroups.map(rg => (
													<Badge key={rg.reviewerGroup.id} variant="outline">
														{rg.reviewerGroup.name}
													</Badge>
												))}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{topic.fundingRounds.map(round => (
													<Badge key={round.id} variant="secondary">
														{round.name}
													</Badge>
												))}
											</div>
										</TableCell>
										<TableCell className="text-right">
											<Link href={`/admin/discussions/topic/${topic.id}`}>
												<Button variant="ghost" size="sm">
													Edit
												</Button>
											</Link>
										</TableCell>
									</TableRow>
								))
							)}
							{!loading && topics.length === 0 && (
								<TableRow>
									<TableCell colSpan={4} className="py-6 text-center">
										No topics found. Create your first topic.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				<div className="flex flex-wrap gap-4">
					<Link
						href="/admin/discussions/topic/new"
						onClick={() => setLoadingButton(true)}
					>
						<Button
							variant="outline"
							className="gap-2"
							disabled={loadingButton}
						>
							{loadingButton ? (
								<Loader2Icon className="h-4 w-4 animate-spin" />
							) : (
								<Plus className="h-4 w-4" />
							)}
							Add Topic
						</Button>
					</Link>
				</div>

				<div>
					<Link href="/admin">
						<Button variant="secondary">Back to Dashboard</Button>
					</Link>
				</div>
			</div>
		</div>
	)
}
