import {
	useState,
	type ForwardRefExoticComponent,
	type RefAttributes,
} from 'react'
import {
	CheckCircledIcon,
	CheckIcon,
	CountdownTimerIcon,
	Cross2Icon,
	CrossCircledIcon,
} from '@radix-ui/react-icons'
import type { IconProps } from '@radix-ui/react-icons/dist/types'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../ui/table'
import { Vote, VoteStatus } from '@/types/phase-summary'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

interface Props {
	votes: Vote[]
	title: string
	noVotesMessage: string
}

interface VotesTableStatus {
	value: VoteStatus
	icon: ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>
}

export const votesTableStatuses = [
	{
		value: 'Pending',
		icon: CountdownTimerIcon,
	},
	{
		value: 'Orphaned',
		icon: CrossCircledIcon,
	},
	{
		value: 'Canonical',
		icon: CheckCircledIcon,
	},
] satisfies VotesTableStatus[]

export const VotesTable = ({ votes, title, noVotesMessage }: Props) => {
	return (
		<Card>
			<CardHeader className="py-3">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
			</CardHeader>
			<CardContent className="p-3">
				{votes.length > 0 ? (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Height</TableHead>
								<TableHead>Timestamp</TableHead>
								<TableHead>Account</TableHead>
								<TableHead>Hash</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{votes.map(vote => (
								<TableRow key={vote.hash}>
									<TableCell className="font-medium">{vote.height}</TableCell>
									<TableCell className="font-medium">
										{vote.timestamp}
									</TableCell>
									<TableCell className="font-medium">{vote.account}</TableCell>
									<TableCell className="font-medium">
										<a
											href={`https://minascan.io/devnet/tx/${vote.hash}/txInfo`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs text-blue-600 underline transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
										>
											{vote.hash.slice(0, 12) + '...' + vote.hash.slice(-6)}
										</a>
									</TableCell>
									<TableCell className="font-medium">{vote.status}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				) : (
					<div className="flex items-center justify-center py-6 text-sm text-gray-500 dark:text-gray-400">
						{noVotesMessage}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
