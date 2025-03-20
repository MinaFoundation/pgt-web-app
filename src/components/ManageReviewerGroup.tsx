'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'

interface User {
	id: string
	metadata: {
		username: string
	}
}

interface ReviewerGroup {
	id: string
	name: string
	description: string
	members: Array<{
		user: User
	}>
}

const groupSchema = z.object({
	name: z.string().min(1, 'Group name is required'),
	description: z.string().min(1, 'Description is required'),
	members: z.array(z.any()).min(1, 'At least one member is required'),
})

type GroupFormData = z.infer<typeof groupSchema>

export function ManageReviewerGroupComponent({
	groupId,
}: {
	groupId: string | null
}) {
	const router = useRouter()
	const { toast } = useToast()
	const [loading, setLoading] = useState(false)
	const [dataLoading, setDataLoading] = useState(true)
	const [availableUsers, setAvailableUsers] = useState<User[]>([])
	const [members, setMembers] = useState<User[]>([])

	const form = useForm<GroupFormData>({
		resolver: zodResolver(groupSchema),
		defaultValues: {
			name: '',
			description: '',
			members: [],
		},
	})

	// Fetch available users and group data if editing
	useEffect(() => {
		const fetchData = async () => {
			setDataLoading(true)
			try {
				// Fetch available users
				const usersResponse = await fetch('/api/admin/users')
				if (!usersResponse.ok) throw new Error('Failed to fetch users')
				const users = await usersResponse.json()
				setAvailableUsers(users)

				// If editing, fetch group data
				if (groupId && groupId !== 'new') {
					const groupResponse = await fetch(
						`/api/admin/reviewer-groups/${groupId}`,
					)
					if (!groupResponse.ok) throw new Error('Failed to fetch group')
					const group: ReviewerGroup = await groupResponse.json()
					form.reset({
						name: group.name,
						description: group.description,
						members: group.members.map(m => m.user),
					})
					setMembers(group.members.map(m => m.user))
				}
			} catch (error) {
				console.error('Data loading error:', error)
				toast({
					title: 'Error',
					description: 'Failed to load data. Please try again.',
					variant: 'destructive',
				})
			} finally {
				setDataLoading(false)
			}
		}

		fetchData()
	}, [groupId, toast, form])

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target
		form.setValue(name as keyof GroupFormData, value)
	}

	const handleAddMember = (userId: string) => {
		const userToAdd = availableUsers.find(u => u.id === userId)
		if (userToAdd && !members.some(m => m.id === userId)) {
			const newMembers = [...members, userToAdd]
			setMembers(newMembers)
			form.setValue('members', newMembers, {
				shouldValidate: true,
				shouldDirty: true,
			})
		}
	}

	const handleRemoveMember = (userId: string) => {
		const newMembers = members.filter(member => member.id !== userId)
		setMembers(newMembers)
		form.setValue('members', newMembers, {
			shouldValidate: true,
			shouldDirty: true,
		})
	}

	const handleSave = async (data: GroupFormData) => {
		try {
			setLoading(true)
			const endpoint = groupId
				? `/api/admin/reviewer-groups/${groupId}`
				: '/api/admin/reviewer-groups'

			const method = groupId ? 'PUT' : 'POST'
			const response = await fetch(endpoint, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...data,
					memberIds: members.map(m => m.id),
				}),
			})

			if (!response.ok) throw new Error('Failed to save group')

			toast({
				title: 'Success',
				description: `Group ${groupId ? 'updated' : 'created'} successfully`,
			})

			router.push('/admin/reviewers')
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to save group',
				variant: 'destructive',
			})
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async () => {
		if (!groupId) return

		if (!confirm('Are you sure you want to delete this group?')) return

		try {
			setLoading(true)
			const response = await fetch(`/api/admin/reviewer-groups/${groupId}`, {
				method: 'DELETE',
			})

			if (!response.ok) throw new Error('Failed to delete group')

			toast({
				title: 'Success',
				description: 'Group deleted successfully',
			})

			router.push('/admin/reviewers')
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to delete group',
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
						{groupId && groupId !== 'new'
							? 'Edit Reviewer Group'
							: 'Create Reviewer Group'}
					</h1>
				</div>

				{dataLoading ? (
					<div className="flex items-center justify-center p-8">
						<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
					</div>
				) : (
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleSave)}
							className="space-y-6"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel>Group name</FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder="Enter group name"
												className="bg-muted"
												disabled={loading}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="Enter group description"
												className="min-h-[100px] bg-muted"
												disabled={loading}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="members"
								render={({ fieldState }) => (
									<FormItem>
										<FormLabel>Members</FormLabel>
										<FormControl>
											<div className="space-y-4">
												<Select
													onValueChange={handleAddMember}
													disabled={loading}
												>
													<SelectTrigger className="bg-muted">
														<SelectValue placeholder="Add a member" />
													</SelectTrigger>
													<SelectContent>
														{availableUsers
															.filter(
																user => !members.some(m => m.id === user.id),
															)
															.map(user => (
																<SelectItem key={user.id} value={user.id}>
																	{user.metadata.username}
																</SelectItem>
															))}
													</SelectContent>
												</Select>

												<div className="space-y-2">
													{members.map(member => (
														<div
															key={member.id}
															className="flex items-center justify-between rounded-md bg-muted p-3"
														>
															<span>{member.metadata.username}</span>
															<Button
																type="button"
																variant="ghost"
																size="sm"
																onClick={() => handleRemoveMember(member.id)}
																disabled={loading}
															>
																<X className="h-4 w-4" />
																<span className="sr-only">
																	Remove {member.metadata.username}
																</span>
															</Button>
														</div>
													))}
												</div>
												{fieldState.invalid && (
													<p className="text-sm text-destructive">
														At least one member is required
													</p>
												)}
											</div>
										</FormControl>
									</FormItem>
								)}
							/>

							<div className="flex items-center justify-between pt-6">
								{groupId && (
									<Button
										type="button"
										variant="destructive"
										onClick={handleDelete}
										disabled={loading}
									>
										Delete Group
									</Button>
								)}
								<div className="ml-auto flex gap-4">
									<Link href="/admin/reviewers">
										<Button type="button" variant="outline" disabled={loading}>
											Cancel
										</Button>
									</Link>
									<Button type="submit" disabled={loading}>
										{loading ? 'Saving...' : 'Save Group'}
									</Button>
								</div>
							</div>
						</form>
					</Form>
				)}
			</div>
		</div>
	)
}
