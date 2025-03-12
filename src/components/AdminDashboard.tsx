'use client'

import { Icons } from '@/components/ui/icons'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { useState } from 'react'
import { Loader2 } from 'lucide-react' // Import a spinner icon

interface AdminOption {
	title: string
	description: string
	icon: keyof typeof Icons
	href: string
	color?: string
}

const adminOptions: AdminOption[] = [
	{
		title: 'Manage Reviewers',
		description: 'Manage Reviewers and Users',
		icon: 'users',
		href: '/admin/reviewers',
		color: 'bg-blue-500/10 text-blue-500',
	},
	{
		title: 'Manage Discussion Topics',
		description: 'Manage Discussion Topics and Committees',
		icon: 'messageSquare',
		href: '/admin/discussions',
		color: 'bg-purple-500/10 text-purple-500',
	},
	{
		title: 'Manage Funding Rounds',
		description: 'Manage Funding Rounds and Phases',
		icon: 'link',
		href: '/admin/funding-rounds',
		color: 'bg-green-500/10 text-green-500',
	},
	{
		title: 'Manage Proposal Status',
		description: 'Set/Override Proposal Status',
		icon: 'fileText',
		href: '/admin/proposals',
		color: 'bg-orange-500/10 text-orange-500',
	},
	{
		title: 'Count Votes',
		description: 'Count Votes for a Funding Round',
		icon: 'barChart',
		href: '/admin/votes',
		color: 'bg-yellow-500/10 text-yellow-500',
	},
	{
		title: 'Worker Heartbeats',
		description: 'Monitor background job statuses',
		icon: 'activity',
		href: '/admin/worker-heartbeats',
		color: 'bg-red-500/10 text-red-500',
	},
	{
		title: 'Consideration OCV Votes',
		description: 'Monitor OCV consideration votes',
		icon: 'barChart2',
		href: '/admin/ocv-votes',
		color: 'bg-indigo-500/10 text-indigo-500',
	},
	{
		title: 'User Feedback',
		description: 'View and manage user feedback submissions',
		icon: 'messageCircle',
		href: '/admin/feedback',
		color: 'bg-pink-500/10 text-pink-500',
	},
	{
		title: 'GPT Survey Processing',
		description: 'Process community feedback with GPT Survey',
		icon: 'messageSquare',
		href: '/admin/gpt-survey',
		color: 'bg-teal-500/10 text-teal-500',
	},
]

export function AdminDashboardComponent() {
	const [loadingHref, setLoadingHref] = useState<string | null>(null)

	const handleClick = (href: string) => {
		setLoadingHref(href) // Set loading state for clicked card
	}

	return (
		<div className="container mx-auto max-w-7xl space-y-8 p-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
				<p className="text-muted-foreground">
					Welcome to the Admin Dashboard. Please select a category to manage.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{adminOptions.map(option => {
					const Icon = Icons[option.icon]
					const isLoading = loadingHref === option.href

					return (
						<Link
							key={option.href}
							href={option.href}
							onClick={() => handleClick(option.href)}
						>
							<Card
								className={`relative h-full cursor-pointer p-6 transition-all hover:scale-[1.02] hover:shadow-md ${
									isLoading ? 'pointer-events-none opacity-70' : ''
								}`}
							>
								<div className="flex h-full flex-col space-y-4">
									<div className="flex items-center gap-4">
										<div className={`rounded-lg p-2 ${option.color}`}>
											{isLoading ? (
												<Loader2 className="h-5 w-5 animate-spin" />
											) : (
												<Icon className="h-5 w-5" />
											)}
										</div>
										<div className="space-y-1">
											<h2 className="text-xl font-semibold tracking-tight">
												{option.title}
											</h2>
											<p className="text-sm text-muted-foreground">
												{option.description}
											</p>
										</div>
									</div>
								</div>
							</Card>
						</Link>
					)
				})}
			</div>
		</div>
	)
}
