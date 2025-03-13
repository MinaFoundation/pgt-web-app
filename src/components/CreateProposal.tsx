'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ProposalValidation as PV } from '@/constants/validation'
import { useRouter } from 'next/navigation'
import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import {
	Calendar as CalendarIcon,
	FilePenIcon,
	FilePlus2Icon,
	InfoIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { proposalCreateSchema } from '@/services'

// Define form data type from zod schema
type ProposalFormValues = z.infer<typeof proposalCreateSchema>

interface Props {
	mode?: 'create' | 'edit'
	proposalId?: string
}

export function CreateProposal({ mode = 'create', proposalId }: Props) {
	const { toast } = useToast()
	const router = useRouter()
	const [isSaving, setIsSaving] = useState<boolean>(false)

	// Initialize form with default values
	const form = useForm<ProposalFormValues>({
		resolver: zodResolver(proposalCreateSchema),
		defaultValues: {
			title: '',
			proposalSummary: '',
			keyObjectives: '',
			problemStatement: '',
			problemImportance: '',
			proposedSolution: '',
			implementationDetails: '',
			communityBenefits: '',
			keyPerformanceIndicators: '',
			totalFundingRequired: '',
			budgetBreakdown: '',
			estimatedCompletionDate: new Date().toISOString(),
			milestones: '',
			teamMembers: '',
			relevantExperience: '',
			potentialRisks: '',
			mitigationPlans: '',
			email: '',
			discordHandle: '',
			website: '',
			githubProfile: '',
			otherLinks: '',
		},
	})

	// Helper function to get max length for a field
	const getMaxLengthForField = (
		fieldName: keyof ProposalFormValues,
	): number => {
		switch (fieldName) {
			case 'title':
				return PV.TITLE.max
			case 'proposalSummary':
				return PV.PROPOSAL_SUMMARY.max
			case 'keyObjectives':
				return PV.KEY_OBJECTIVES.max
			case 'problemStatement':
				return PV.PROBLEM_STATEMENT.max
			case 'problemImportance':
				return PV.PROBLEM_IMPORTANCE.max
			case 'proposedSolution':
				return PV.PROPOSED_SOLUTION.max
			case 'implementationDetails':
				return PV.IMPLEMENTATION_DETAILS.max
			case 'communityBenefits':
				return PV.COMMUNITY_BENEFITS.max
			case 'keyPerformanceIndicators':
				return PV.KPI.max
			case 'budgetBreakdown':
				return PV.BUDGET_BREAKDOWN.max
			case 'milestones':
				return PV.MILESTONES.max
			case 'teamMembers':
				return PV.TEAM_MEMBERS.max
			case 'relevantExperience':
				return PV.RELEVANT_EXPERIENCE.max
			case 'potentialRisks':
				return PV.POTENTIAL_RISKS.max
			case 'mitigationPlans':
				return PV.MITIGATION_PLANS.max
			case 'email':
				return PV.EMAIL.max
			case 'discordHandle':
				return PV.DISCORD.max
			case 'website':
				return PV.WEBSITE.max
			case 'githubProfile':
				return PV.GITHUB_PROFILE.max
			case 'otherLinks':
				return PV.OTHER_LINKS.max
			default:
				return 100
		}
	}

	// Fetch proposal data if in edit mode
	useEffect(() => {
		const fetchProposal = async () => {
			try {
				const response = await fetch(`/api/proposals/${proposalId}`)
				if (!response.ok) throw new Error('Failed to fetch proposal')
				const data = await response.json()

				// Map old field names to new ones if data has old field structure
				const mappedData = {
					title: data.title || data.title || '',
					proposalSummary: data.proposalSummary || data.abstract || '',
					keyObjectives: data.keyObjectives || '',
					problemStatement: data.problemStatement || data.motivation || '',
					problemImportance: data.problemImportance || data.rationale || '',
					proposedSolution:
						data.proposedSolution || data.deliveryRequirements || '',
					implementationDetails:
						data.implementationDetails || data.securityAndPerformance || '',
					communityBenefits: data.communityBenefits || '',
					keyPerformanceIndicators: data.keyPerformanceIndicators || '',
					totalFundingRequired:
						data.totalFundingRequired?.toString() ||
						data.totalFundingRequired?.toString() ||
						'',
					budgetBreakdown: data.budgetBreakdown || '',
					estimatedCompletionDate: data.estimatedCompletionDate
						? new Date(data.estimatedCompletionDate).toISOString()
						: new Date().toISOString(),
					milestones: data.milestones || '',
					teamMembers: data.teamMembers || '',
					relevantExperience: data.relevantExperience || '',
					potentialRisks: data.potentialRisks || '',
					mitigationPlans: data.mitigationPlans || '',
					email: data.email || '',
					discordHandle: data.discordHandle || '',
					website: data.website || '',
					githubProfile: data.githubProfile || '',
					otherLinks: data.otherLinks || '',
				}

				// Reset form with fetched data
				form.reset(mappedData)
			} catch (error) {
				toast({
					title: 'Error',
					description: 'Failed to load proposal',
					variant: 'destructive',
				})
				router.push('/proposals')
			}
		}
		if (mode === 'edit' && proposalId) {
			fetchProposal()
		}
	}, [mode, proposalId, router, toast, form])

	// Form submission handler
	const onSubmit = async (values: ProposalFormValues) => {
		setIsSaving(true)

		try {
			// Format the data for submission
			const submissionData = {
				...values,
				estimatedCompletionDate: values.estimatedCompletionDate,
			}

			// Submit the proposal
			const response = await fetch(
				mode === 'create' ? '/api/proposals' : `/api/proposals/${proposalId}`,
				{
					method: mode === 'create' ? 'POST' : 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(submissionData),
				},
			)

			if (!response.ok) throw new Error('Failed to save proposal')

			toast({
				title: 'Success',
				description:
					mode === 'create'
						? 'Proposal draft created successfully'
						: 'Proposal updated successfully',
			})

			// Redirect to proposals list
			router.push('/proposals')
		} catch (error) {
			toast({
				title: 'Error',
				description:
					mode === 'create'
						? 'Failed to create proposal draft'
						: 'Failed to update proposal',
				variant: 'destructive',
			})
		}
		setIsSaving(false)
	}

	return (
		<div className="w-full">
			<h1 className="mb-6 flex items-center gap-2 text-3xl font-bold">
				{mode === 'create' ? (
					<>
						<FilePlus2Icon className="h-6 w-6" />
						Create New Proposal
					</>
				) : (
					<>
						<FilePenIcon className="h-6 w-6" />
						Edit Proposal
					</>
				)}
			</h1>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					{/* Section 1: Proposal Title */}
					<section className="rounded-lg border border-gray-200 bg-card/50 p-4 md:p-8">
						<h2 className="mb-4 text-xl font-semibold">1. Proposal Title</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="title"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">Title</FormLabel>
										<FormControl>
											<Input
												className="bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('title') - field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>
						</div>
					</section>

					{/* Section 2: Overview */}
					<section className="rounded-lg border border-gray-200 bg-card/50 p-4 md:p-8">
						<h2 className="mb-4 text-xl font-semibold">2. Overview</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="proposalSummary"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Proposal Summary
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('proposalSummary') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="keyObjectives"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Key Objectives
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('keyObjectives') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>
						</div>
					</section>

					{/* Section 3: Problem Statement */}
					<section className="rounded-lg border border-gray-200 bg-card/50 p-4 md:p-8">
						<h2 className="mb-4 text-xl font-semibold">3. Problem Statement</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="problemStatement"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											What is the problem?
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('problemStatement') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="problemImportance"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Why does it matter?
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('problemImportance') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>
						</div>
					</section>

					{/* Section 4: Proposed Solution */}
					<section className="rounded-lg border border-gray-200 bg-card/50 p-4 md:p-8">
						<h2 className="mb-4 text-xl font-semibold">4. Proposed Solution</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="proposedSolution"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											What will you do?
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[150px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('proposedSolution') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="implementationDetails"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											How will it work?
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[150px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('implementationDetails') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>
						</div>
					</section>

					{/* Section 5: Expected Impact */}
					<section className="rounded-lg border border-gray-200 bg-card/50 p-4 md:p-8">
						<h2 className="mb-4 text-xl font-semibold">5. Expected Impact</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="communityBenefits"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Community Benefits
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('communityBenefits') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="keyPerformanceIndicators"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Key Performance Indicators (KPIs)
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('keyPerformanceIndicators') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>
						</div>
					</section>

					{/* Section 6: Budget Request */}
					<section className="rounded-lg border border-gray-200 bg-card/50 p-4 md:p-8">
						<h2 className="mb-4 text-xl font-semibold">6. Budget Request</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="totalFundingRequired"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Total Funding Required (MINA)
										</FormLabel>
										<FormControl>
											<Input
												className="bg-white"
												type="text"
												{...field}
												value={formatNumberWithCommas(field.value)}
												onChange={e =>
													field.onChange(parseNumber(e.target.value))
												}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												Enter amount in MINA (e.g., 10,000)
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="budgetBreakdown"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Breakdown of Costs
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('budgetBreakdown') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>
						</div>
					</section>

					{/* Section 7: Milestones and Timeline */}
					<section className="rounded-lg border border-gray-200 bg-card/50 p-4 md:p-8">
						<h2 className="mb-4 text-xl font-semibold">
							7. Milestones and Timeline
						</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="milestones"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Key Milestones
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('milestones') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="estimatedCompletionDate"
								render={({ field, fieldState }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="text-lg font-medium">
											Estimated Completion Date
										</FormLabel>
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={cn(
															'w-full justify-start text-left font-normal',
															!field.value && 'text-muted-foreground',
														)}
													>
														<CalendarIcon className="mr-2 h-4 w-4" />
														{field.value ? (
															format(field.value, 'PPP')
														) : (
															<span>Pick a date</span>
														)}
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="start">
												<Calendar
													mode="single"
													selected={new Date(field.value)}
													onSelect={date => field.onChange(date?.toISOString())}
													disabled={date => date < new Date()}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
										</FormDescription>
									</FormItem>
								)}
							/>
						</div>
					</section>

					{/* Section 8: Team Information */}
					<section className="rounded-lg border border-gray-200 bg-card/50 p-4 md:p-8">
						<h2 className="mb-4 text-xl font-semibold">8. Team Information</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="teamMembers"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Team Members
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('teamMembers') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="relevantExperience"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Relevant Experience
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('relevantExperience') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>
						</div>
					</section>

					{/* Section 9: Risks and Mitigation */}
					<section className="rounded-lg border border-gray-200 bg-card/50 p-4 md:p-8">
						<h2 className="mb-4 text-xl font-semibold">
							9. Risks and Mitigation
						</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="potentialRisks"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Potential Risks
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('potentialRisks') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="mitigationPlans"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Mitigation Plans
										</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[100px] bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('mitigationPlans') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>
						</div>
					</section>

					{/* Section 10: Contact Information */}
					<section className="rounded-lg border border-gray-200 bg-card/50 p-4 md:p-8">
						<h2 className="mb-4 text-xl font-semibold">
							10. About the Submitter
						</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="email"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">Email</FormLabel>
										<FormControl>
											<Input
												className="bg-white"
												type="email"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="discordHandle"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Discord Handle
										</FormLabel>
										<FormControl>
											<Input
												className="bg-white"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="website"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Website (Optional)
										</FormLabel>
										<FormControl>
											<Input
												className="bg-white"
												placeholder="https://example.com"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="githubProfile"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											GitHub Profile (Optional)
										</FormLabel>
										<FormControl>
											<Input
												className="bg-white"
												placeholder="https://github.com/username"
												{...field}
												invalid={fieldState.invalid}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
										</FormDescription>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="otherLinks"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="text-lg font-medium">
											Other Relevant Links (Optional)
										</FormLabel>
										<FormControl>
											<Input
												className="bg-white"
												placeholder="Separate links with commas"
												{...field}
											/>
										</FormControl>
										<FormDescription className="flex flex-col md:flex-row md:justify-between">
											<FormMessage />
											<div className="flex flex-1 justify-end">
												{getMaxLengthForField('otherLinks') -
													field.value.length}{' '}
												characters remaining
											</div>
										</FormDescription>
									</FormItem>
								)}
							/>
						</div>
					</section>

					<div className="flex justify-end space-x-4">
						<Link href="/proposals">
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</Link>
						<Button className="button-3d" type="submit" disabled={isSaving}>
							{isSaving ? (
								<>Loading...</>
							) : mode === 'create' ? (
								'Create Draft'
							) : (
								'Save Changes'
							)}
						</Button>
					</div>
					<div className="flex justify-end">
						<p className="text-sm text-gray-600">
							<InfoIcon className="mr-1 inline h-4 w-3" />
							After drafting your proposal, you can submit it for an active
							funding round.
						</p>
					</div>
				</form>
			</Form>
		</div>
	)
}

// Function to format number with commas
const formatNumberWithCommas = (value: number | string) => {
	// Remove non-numeric characters except for the decimal point
	const numericValue = value.toString().replace(/[^0-9.]/g, '')
	const parts = numericValue.split('.')
	// Add commas to the integer part
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
	// Join back with decimal part if it exists
	return parts.join('.')
}

// Function to parse formatted number back to raw value
const parseNumber = (value: string) => {
	return value.replace(/,/g, '') // Remove commas for raw numeric value
}
