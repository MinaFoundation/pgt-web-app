'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

import { validatePhaseDates } from '@/lib/validation'
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
import DatePicker from '@/components/ui/date-picker'
import { FilePenIcon, FilePlus2Icon } from 'lucide-react'

interface ReviewerGroup {
	id: string
	name: string
}

interface Topic {
	id: string
	name: string
	reviewerGroups: Array<{
		reviewerGroup: ReviewerGroup
	}>
}

interface FundingRound {
	id: string
	name: string
	description: string
	topic: Topic
	totalBudget: number
	startDate: string
	endDate: string
	submissionPhase: {
		startDate: string
		endDate: string
	}
	considerationPhase: {
		startDate: string
		endDate: string
	}
	deliberationPhase: {
		startDate: string
		endDate: string
	}
	votingPhase: {
		startDate: string
		endDate: string
	}
}

type DatePhase = {
	key:
		| 'fundingRoundDates'
		| 'submissionDates'
		| 'considerationDates'
		| 'deliberationDates'
		| 'votingDates'
	label: string
}

const DATE_PHASES: DatePhase[] = [
	{ key: 'fundingRoundDates', label: 'Funding Round Period (UTC)' },
	{ key: 'submissionDates', label: 'Submission Phase (UTC)' },
	{ key: 'considerationDates', label: 'Consideration Phase (UTC)' },
	{ key: 'deliberationDates', label: 'Deliberation Phase (UTC)' },
	{ key: 'votingDates', label: 'Voting Phase (UTC)' },
]

// Format dates in UTC without local timezone conversion
function formatUTC(date: Date): string {
	const day = date.getUTCDate()
	const month = date.getUTCMonth() + 1
	const year = date.getUTCFullYear()
	const hours = date.getUTCHours()
	const minutes = date.getUTCMinutes()
	return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} UTC`
}

const fundingRoundSchema = z
	.object({
		name: z
			.string()
			.min(1, 'Name is required')
			.max(100, 'Name must be less than 100 characters'),
		description: z
			.string()
			.min(1, 'Description is required')
			.max(1000, 'Description must be less than 1000 characters'),
		totalBudget: z
			.string()
			.min(1, 'Total budget is required')
			.refine(val => !isNaN(Number(val)) && Number(val) > 0, {
				message: 'Total budget must be a positive number',
			}),
		selectedTopic: z
			.object({
				id: z.string(),
				name: z.string(),
			})
			.refine(val => val.id !== '' && val.name !== '', {
				message: 'Topic is required',
			}),
		fundingRoundDates: z.object({
			from: z.date(),
			to: z.date(),
		}).refine(val => val.id !== '' && val.name !== '', {
			message: 'Topic is required',
		}),,
		submissionDates: z.object({
			from: z.date({ required_error: 'Start date is required' }),
			to: z.date({ required_error: 'End date is required' }),
		}),
		considerationDates: z.object({
			from: z.date({ required_error: 'Start date is required' }),
			to: z.date({ required_error: 'End date is required' }),
		}),
		deliberationDates: z.object({
			from: z.date({ required_error: 'Start date is required' }),
			to: z.date({ required_error: 'End date is required' }),
		}),
		votingDates: z.object({
			from: z.date({ required_error: 'Start date is required' }),
			to: z.date({ required_error: 'End date is required' }),
		}),
	})
	.refine(
		data => {
			// Only run this check if all dates are present
			const allDatesPresent = [
				data.fundingRoundDates,
				data.submissionDates,
				data.considerationDates,
				data.deliberationDates,
				data.votingDates,
			].every(range => range.from && range.to)

			if (!allDatesPresent) return false

			// Now safe to call validatePhaseDates
			const datesValid = validatePhaseDates({
				fundingRound: data.fundingRoundDates,
				submission: data.submissionDates,
				consideration: data.considerationDates,
				deliberation: data.deliberationDates,
				voting: data.votingDates,
			})
			return datesValid.valid
		},
		{
			message:
				'Invalid phase dates. Please check that all phases are in sequence and within the funding round period.',
			path: ['fundingRoundDates'],
		},
	)

type FundingRoundFormData = z.infer<typeof fundingRoundSchema>

interface FormData extends FundingRoundFormData {
	applicationPeriod: { from?: Date; to?: Date } | undefined
	reviewPeriod: { from?: Date; to?: Date } | undefined
	decisionPeriod: { from?: Date; to?: Date } | undefined
	implementationPeriod: { from?: Date; to?: Date } | undefined
}

const defaultValues: Partial<FormData> = {
	// ... existing code ...
	applicationPeriod: undefined,
	reviewPeriod: undefined,
	decisionPeriod: undefined,
	implementationPeriod: undefined,
	// ... existing code ...
}

export function AddEditFundingRoundComponent({
	roundId,
}: {
	roundId: string | null
}) {
	const router = useRouter()
	const { toast } = useToast()
	const [loading, setLoading] = useState(false)
	const [dataLoading, setDataLoading] = useState(true)
	const [topics, setTopics] = useState<Topic[]>([])

	const form = useForm<FormData>({
		resolver: zodResolver(fundingRoundSchema),
		defaultValues: {
			name: '',
			description: '',
			totalBudget: '',
			selectedTopic: { id: '', name: '' },
			fundingRoundDates: undefined,
			submissionDates: undefined,
			considerationDates: undefined,
			deliberationDates: undefined,
			votingDates: undefined,
			applicationPeriod: undefined,
			reviewPeriod: undefined,
			decisionPeriod: undefined,
			implementationPeriod: undefined,
		},
	})

	useEffect(() => {
		const fetchData = async () => {
			setDataLoading(true)
			try {
				// Fetch available topics
				const topicsResponse = await fetch('/api/admin/discussion-topics')
				if (!topicsResponse.ok) throw new Error('Failed to fetch topics')
				const topicsData = await topicsResponse.json()
				setTopics(topicsData)

				// If editing, fetch funding round data
				if (roundId && roundId !== 'new') {
					const roundResponse = await fetch(
						`/api/admin/funding-rounds/${roundId}`,
					)
					if (!roundResponse.ok)
						throw new Error('Failed to fetch funding round')
					const round: FundingRound = await roundResponse.json()

					form.reset({
						name: round.name,
						description: round.description,
						totalBudget: round.totalBudget.toString(),
						selectedTopic: round.topic,
						fundingRoundDates: undefined,
						submissionDates: undefined,
						considerationDates: undefined,
						deliberationDates: undefined,
						votingDates: undefined,
						applicationPeriod: undefined,
						reviewPeriod: undefined,
						decisionPeriod: undefined,
						implementationPeriod: undefined,
					})
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
	}, [roundId, toast, form])

	const handleSave = async (data: FormData) => {
		try {
			setLoading(true)
			const endpoint = roundId
				? `/api/admin/funding-rounds/${roundId}`
				: '/api/admin/funding-rounds'

			const method = roundId ? 'PUT' : 'POST'

			// Validate phase dates before submitting
			const datesValid = validatePhaseDates({
				fundingRound: data.fundingRoundDates,
				submission: data.submissionDates,
				consideration: data.considerationDates,
				deliberation: data.deliberationDates,
				voting: data.votingDates,
			})

			if (!datesValid.valid) {
				toast({
					title: 'Error',
					description: datesValid.error || 'Invalid phase dates',
					variant: 'destructive',
				})
				return
			}

			const response = await fetch(endpoint, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: data.name,
					description: data.description,
					totalBudget: Number(data.totalBudget),
					topicId: data.selectedTopic.id,
					startDate: data.fundingRoundDates?.from?.toISOString(),
					endDate: data.fundingRoundDates?.to?.toISOString(),
					submissionPhase: {
						startDate: data.submissionDates?.from?.toISOString(),
						endDate: data.submissionDates?.to?.toISOString(),
					},
					considerationPhase: {
						startDate: data.considerationDates?.from?.toISOString(),
						endDate: data.considerationDates?.to?.toISOString(),
					},
					deliberationPhase: {
						startDate: data.deliberationDates?.from?.toISOString(),
						endDate: data.deliberationDates?.to?.toISOString(),
					},
					votingPhase: {
						startDate: data.votingDates?.from?.toISOString(),
						endDate: data.votingDates?.to?.toISOString(),
					},
					applicationPeriod: {
						from: data.applicationPeriod?.from?.toISOString(),
						to: data.applicationPeriod?.to?.toISOString(),
					},
					reviewPeriod: {
						from: data.reviewPeriod?.from?.toISOString(),
						to: data.reviewPeriod?.to?.toISOString(),
					},
					decisionPeriod: {
						from: data.decisionPeriod?.from?.toISOString(),
						to: data.decisionPeriod?.to?.toISOString(),
					},
					implementationPeriod: {
						from: data.implementationPeriod?.from?.toISOString(),
						to: data.implementationPeriod?.to?.toISOString(),
					},
				}),
			})

			if (!response.ok) throw new Error('Failed to save funding round')

			toast({
				title: 'Success',
				description: `Funding round ${roundId ? 'updated' : 'created'} successfully`,
			})

			router.push('/admin/funding-rounds')
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to save funding round',
				variant: 'destructive',
			})
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async () => {
		if (!roundId) return

		if (!confirm('Are you sure you want to delete this funding round?')) return

		try {
			setLoading(true)
			const response = await fetch(`/api/admin/funding-rounds/${roundId}`, {
				method: 'DELETE',
			})

			if (!response.ok) throw new Error('Failed to delete funding round')

			toast({
				title: 'Success',
				description: 'Funding round deleted successfully',
			})

			router.push('/admin/funding-rounds')
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to delete funding round',
				variant: 'destructive',
			})
		} finally {
			setLoading(false)
		}
	}

	if (dataLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
			</div>
		)
	}

	return (
		<div className="w-full">
			<h1 className="mb-6 flex items-center gap-2 text-3xl font-bold">
				{roundId ? (
					<>
						<FilePenIcon className="h-6 w-6" />
						Edit Funding Round
					</>
				) : (
					<>
						<FilePlus2Icon className="h-6 w-6" />
						Create Funding Round
					</>
				)}
			</h1>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input
										{...field}
										placeholder="Enter funding round name"
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
								<FormLabel>Description</FormLabel>
								<FormControl>
									<Textarea
										{...field}
										placeholder="Enter funding round description"
										className="min-h-[100px] bg-muted"
										disabled={loading}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="totalBudget"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Total Budget (MINA)</FormLabel>
								<FormControl>
									<Input
										{...field}
										type="number"
										placeholder="Enter total budget"
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
						name="selectedTopic"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Topic</FormLabel>
								<FormControl>
									<Select
										value={field.value?.id}
										onValueChange={value => {
											const topic = topics.find(t => t.id === value)
											field.onChange(topic)
										}}
										disabled={loading}
									>
										<SelectTrigger className="bg-muted">
											<SelectValue placeholder="Select a topic" />
										</SelectTrigger>
										<SelectContent>
											{topics.map(topic => (
												<SelectItem key={topic.id} value={topic.id}>
													{topic.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{DATE_PHASES.map(phase => (
						<FormField
							key={phase.key}
							control={form.control}
							name={phase.key}
							render={({ field }) => (
								<FormItem>
									<FormLabel>{phase.label}</FormLabel>
									<FormControl>
										<DatePicker
											date={field.value}
											setDate={(
												date: { from?: Date; to?: Date } | undefined,
											) => {
												if (date?.from && date?.to) {
													field.onChange({ from: date.from, to: date.to })
												}
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					))}

					<FormField
						control={form.control}
						name="applicationPeriod"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Application Period</FormLabel>
								<FormControl>
									<DatePicker
										date={field.value}
										setDate={(date: { from?: Date; to?: Date } | undefined) => {
											field.onChange(date)
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="reviewPeriod"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Review Period</FormLabel>
								<FormControl>
									<DatePicker
										date={field.value}
										setDate={(date: { from?: Date; to?: Date } | undefined) => {
											field.onChange(date)
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="decisionPeriod"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Decision Period</FormLabel>
								<FormControl>
									<DatePicker
										date={field.value}
										setDate={(date: { from?: Date; to?: Date } | undefined) => {
											field.onChange(date)
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="implementationPeriod"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Implementation Period</FormLabel>
								<FormControl>
									<DatePicker
										date={field.value}
										setDate={(date: { from?: Date; to?: Date } | undefined) => {
											field.onChange(date)
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="flex justify-end gap-4">
						<Link href="/admin/funding-rounds">
							<Button type="button" variant="outline" disabled={loading}>
								Cancel
							</Button>
						</Link>
						{roundId && roundId !== 'new' && (
							<Button
								type="button"
								variant="destructive"
								onClick={handleDelete}
								disabled={loading}
							>
								Delete
							</Button>
						)}
						<Button type="submit" disabled={loading}>
							{loading ? 'Saving...' : 'Save'}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	)
}
