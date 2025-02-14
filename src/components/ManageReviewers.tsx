'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trash2, UserPlus, Users, ChevronDown } from 'lucide-react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface ReviewerGroup {
	id: string
	name: string
	description: string
	members: Array<{
		user: {
			id: string
			metadata: {
				username: string
			}
		}
	}>
}

export function ManageReviewersComponent() {
	const [groups, setGroups] = useState<ReviewerGroup[]>([])
	const { toast } = useToast()

	const fetchGroups = useCallback(async () => {
		try {
			const response = await fetch('/api/admin/reviewer-groups')
			if (!response.ok) throw new Error('Failed to fetch groups')
			const data = await response.json()
			setGroups(data)
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to load reviewer groups',
				variant: 'destructive',
			})
		}
	}, [toast])

	useEffect(() => {
		fetchGroups()
	}, [fetchGroups])

	// Flatten all members from all groups for display
	const allMembers = groups.flatMap(group =>
		group.members.map(member => ({
			...member.user,
			groupName: group.name,
		})),
	)

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			<div className="space-y-8">
				<div>
					<h1 className="mb-2 text-3xl font-bold">Manage Reviewers</h1>
					<p className="text-muted-foreground">
						Select a Reviewer to manage or add a new one.
					</p>
				</div>

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[250px]">NAME</TableHead>
								<TableHead>USERNAME</TableHead>
								<TableHead>EMAIL</TableHead>
								<TableHead>FUNDING ROUNDS</TableHead>
								<TableHead>REVIEWER GROUP</TableHead>
								<TableHead className="text-right">ACTIONS</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{allMembers.map(member => (
								<TableRow key={member.id}>
									<TableCell className="font-medium">
										<div className="flex items-center gap-2">
											<span>{member.metadata.username}</span>
										</div>
									</TableCell>
									<TableCell>{member.metadata.username}</TableCell>
									<TableCell>{member.metadata.username}@example.com</TableCell>
									<TableCell>
										<Badge variant="secondary">Pending Implementation</Badge>
									</TableCell>
									<TableCell>
										<Badge variant="outline">{member.groupName}</Badge>
									</TableCell>
									<TableCell className="text-right">
										<Button variant="ghost" size="sm" disabled>
											Edit Profile
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				<div className="flex flex-wrap gap-4">
					<Button variant="outline" className="gap-2" disabled>
						<UserPlus className="h-4 w-4" />
						Add Reviewer
					</Button>

					<Link href="/admin/reviewers/group/new">
						<Button variant="outline" className="gap-2">
							<Users className="h-4 w-4" />
							Add Group
						</Button>
					</Link>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="secondary" className="gap-2">
								Edit a Group
								<ChevronDown className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{groups.map(group => (
								<DropdownMenuItem key={group.id} asChild>
									<Link href={`/admin/reviewers/group/${group.id}`}>
										{group.name}
									</Link>
								</DropdownMenuItem>
							))}
							{groups.length === 0 && (
								<DropdownMenuItem disabled>
									No groups available
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
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
