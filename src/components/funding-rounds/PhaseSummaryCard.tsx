'use client'
import { type PhaseStatus } from '@/types/phase-summary'
import { useState, type FC } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Icons } from '../icons'

interface PhaseInfo {
	title: string
	description: string
	icon: React.ReactNode
	status: PhaseStatus
	startDate: Date
	endDate: Date
	href: string
}

export const PhaseSummaryCard: FC<PhaseInfo> = ({
	title,
	description,
	icon,
	status,
	startDate,
	endDate,
	href,
}) => {
	const isAccessible = status !== 'not-started'
	const CardWrapper = isAccessible ? Link : 'div'
	const [isLoading, setIsLoading] = useState(false)

	const handleClick = () => {
		setIsLoading(true)
	}

	return (
		<CardWrapper
			href={href}
			onClick={handleClick}
			className={cn(
				'relative block transition-all duration-200',
				isAccessible && 'hover:shadow-md',
				isLoading && 'pointer-events-none', // Prevents multiple clicks
			)}
		>
			<Card
				className={cn(
					'relative overflow-hidden',
					!isAccessible && 'opacity-75',
				)}
			>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{icon}
							<CardTitle className="text-lg">{title}</CardTitle>
						</div>
						<Badge
							variant={
								status === 'ended'
									? 'default'
									: status === 'ongoing'
										? 'secondary'
										: 'outline'
							}
							className={cn(
								status === 'not-started' && 'bg-muted text-muted-foreground',
							)}
						>
							{status === 'ended'
								? 'Completed'
								: status === 'ongoing'
									? 'In Progress'
									: 'Not Started'}
						</Badge>
					</div>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<CalendarIcon className="h-4 w-4" />
						<span>
							{format(startDate, 'MMM dd, yyyy')} -{' '}
							{format(endDate, 'MMM dd, yyyy')}
						</span>
					</div>
					{!isAccessible && (
						<div className="mt-4 text-sm text-muted-foreground">
							Summary will be available when the phase starts
						</div>
					)}
				</CardContent>

				{/* Loading Overlay */}
				{isLoading && (
					<div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
						<Icons.spinner className="h-6 w-6 animate-spin text-gray-600" />
					</div>
				)}
			</Card>
		</CardWrapper>
	)
}
