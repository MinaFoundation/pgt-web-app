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
import { Calendar as CalendarIcon } from 'lucide-react'
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

const proposalSchema = z.object({
	title: z
		.string()
		.min(PV.TITLE.min, PV.TITLE.messages.min)
		.max(PV.TITLE.max, PV.TITLE.messages.max),

	proposalSummary: z
		.string()
		.min(PV.PROPOSAL_SUMMARY.min, PV.PROPOSAL_SUMMARY.messages.min)
		.max(PV.PROPOSAL_SUMMARY.max, PV.PROPOSAL_SUMMARY.messages.max),

	keyObjectives: z
		.string()
		.min(PV.KEY_OBJECTIVES.min, PV.KEY_OBJECTIVES.messages.min)
		.max(PV.KEY_OBJECTIVES.max, PV.KEY_OBJECTIVES.messages.max),

	problemStatement: z
		.string()
		.min(PV.PROBLEM_STATEMENT.min, PV.PROBLEM_STATEMENT.messages.min)
		.max(PV.PROBLEM_STATEMENT.max, PV.PROBLEM_STATEMENT.messages.max),

	problemImportance: z
		.string()
		.min(PV.PROBLEM_IMPORTANCE.min, PV.PROBLEM_IMPORTANCE.messages.min)
		.max(PV.PROBLEM_IMPORTANCE.max, PV.PROBLEM_IMPORTANCE.messages.max),

	proposedSolution: z
		.string()
		.min(PV.PROPOSED_SOLUTION.min, PV.PROPOSED_SOLUTION.messages.min)
		.max(PV.PROPOSED_SOLUTION.max, PV.PROPOSED_SOLUTION.messages.max),

	implementationDetails: z
		.string()
		.min(PV.IMPLEMENTATION_DETAILS.min, PV.IMPLEMENTATION_DETAILS.messages.min)
		.max(PV.IMPLEMENTATION_DETAILS.max, PV.IMPLEMENTATION_DETAILS.messages.max),

	communityBenefits: z
		.string()
		.min(PV.COMMUNITY_BENEFITS.min, PV.COMMUNITY_BENEFITS.messages.min)
		.max(PV.COMMUNITY_BENEFITS.max, PV.COMMUNITY_BENEFITS.messages.max),

	keyPerformanceIndicators: z
		.string()
		.min(PV.KPI.min, PV.KPI.messages.min)
		.max(PV.KPI.max, PV.KPI.messages.max),

	totalFundingRequired: z
		.string()
		.regex(/^\d+(\.\d{1,2})?$/, PV.TOTAL_FUNDING_REQUIRED.messages.type)
		.refine(
			(val: string) => parseFloat(val) <= PV.TOTAL_FUNDING_REQUIRED.max,
			PV.TOTAL_FUNDING_REQUIRED.messages.max,
		),

	budgetBreakdown: z
		.string()
		.min(PV.BUDGET_BREAKDOWN.min, PV.BUDGET_BREAKDOWN.messages.min)
		.max(PV.BUDGET_BREAKDOWN.max, PV.BUDGET_BREAKDOWN.messages.max),

	estimatedCompletionDate: z.date(),

	milestones: z
		.string()
		.min(PV.MILESTONES.min, PV.MILESTONES.messages.min)
		.max(PV.MILESTONES.max, PV.MILESTONES.messages.max),

	teamMembers: z
		.string()
		.min(PV.TEAM_MEMBERS.min, PV.TEAM_MEMBERS.messages.min)
		.max(PV.TEAM_MEMBERS.max, PV.TEAM_MEMBERS.messages.max),

	relevantExperience: z
		.string()
		.min(PV.RELEVANT_EXPERIENCE.min, PV.RELEVANT_EXPERIENCE.messages.min)
		.max(PV.RELEVANT_EXPERIENCE.max, PV.RELEVANT_EXPERIENCE.messages.max),

	potentialRisks: z
		.string()
		.min(PV.POTENTIAL_RISKS.min, PV.POTENTIAL_RISKS.messages.min)
		.max(PV.POTENTIAL_RISKS.max, PV.POTENTIAL_RISKS.messages.max),

	mitigationPlans: z
		.string()
		.min(PV.MITIGATION_PLANS.min, PV.MITIGATION_PLANS.messages.min)
		.max(PV.MITIGATION_PLANS.max, PV.MITIGATION_PLANS.messages.max),

	email: z
		.string()
		.email(PV.EMAIL.messages.email)
		.max(PV.EMAIL.max, PV.EMAIL.messages.max),

	discordHandle: z
		.string()
		.min(PV.DISCORD.min)
		.max(PV.DISCORD.max, PV.DISCORD.messages.max),

	website: z
		.string()
		.url()
		.max(PV.WEBSITE.max, PV.WEBSITE.messages.max)
		.optional()
		.or(z.literal('')),

	githubProfile: z
		.string()
		.url()
		.max(PV.GITHUB_PROFILE.max, PV.GITHUB_PROFILE.messages.max)
		.optional()
		.or(z.literal('')),

	otherLinks: z.string().max(PV.OTHER_LINKS.max, PV.OTHER_LINKS.messages.max),
})

// Define form data type from zod schema
type ProposalFormValues = z.infer<typeof proposalSchema>

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
		resolver: zodResolver(proposalSchema),
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
			estimatedCompletionDate: new Date(),
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
						? new Date(data.estimatedCompletionDate)
						: new Date(),
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
				estimatedCompletionDate: values.estimatedCompletionDate.toISOString(),
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
			<h1 className="mb-6 text-3xl font-bold">
				{mode === 'create' ? 'Create New Proposal' : 'Edit Proposal'}
			</h1>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
					{/* Section 1: Proposal Title */}
					<div className="mb-8">
						<h2 className="mb-4 text-xl font-semibold">1. Proposal Title</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Title</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('title') - field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Section 2: Overview */}
					<div className="mb-8">
						<h2 className="mb-4 text-xl font-semibold">2. Overview</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="proposalSummary"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Proposal Summary</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('proposalSummary') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="keyObjectives"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Key Objectives</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('keyObjectives') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Section 3: Problem Statement */}
					<div className="mb-8">
						<h2 className="mb-4 text-xl font-semibold">3. Problem Statement</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="problemStatement"
								render={({ field }) => (
									<FormItem>
										<FormLabel>What is the problem?</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('problemStatement') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="problemImportance"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Why does it matter?</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('problemImportance') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Section 4: Proposed Solution */}
					<div className="mb-8">
						<h2 className="mb-4 text-xl font-semibold">4. Proposed Solution</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="proposedSolution"
								render={({ field }) => (
									<FormItem>
										<FormLabel>What will you do?</FormLabel>
										<FormControl>
											<Textarea className="min-h-[150px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('proposedSolution') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="implementationDetails"
								render={({ field }) => (
									<FormItem>
										<FormLabel>How will it work?</FormLabel>
										<FormControl>
											<Textarea className="min-h-[150px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('implementationDetails') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Section 5: Expected Impact */}
					<div className="mb-8">
						<h2 className="mb-4 text-xl font-semibold">5. Expected Impact</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="communityBenefits"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Community Benefits</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('communityBenefits') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="keyPerformanceIndicators"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Key Performance Indicators (KPIs)</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('keyPerformanceIndicators') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Section 6: Budget Request */}
					<div className="mb-8">
						<h2 className="mb-4 text-xl font-semibold">6. Budget Request</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="totalFundingRequired"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Total Funding Required (MINA)</FormLabel>
										<FormControl>
											<Input type="text" {...field} />
										</FormControl>
										<FormDescription>
											Enter amount in MINA (e.g., 10000)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="budgetBreakdown"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Breakdown of Costs</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('budgetBreakdown') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Section 7: Milestones and Timeline */}
					<div className="mb-8">
						<h2 className="mb-4 text-xl font-semibold">
							7. Milestones and Timeline
						</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="milestones"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Key Milestones</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('milestones') - field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="estimatedCompletionDate"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>Estimated Completion Date</FormLabel>
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
													selected={field.value}
													onSelect={field.onChange}
													disabled={date => date < new Date()}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Section 8: Team Information */}
					<div className="mb-8">
						<h2 className="mb-4 text-xl font-semibold">8. Team Information</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="teamMembers"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Team Members</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('teamMembers') - field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="relevantExperience"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Relevant Experience</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('relevantExperience') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Section 9: Risks and Mitigation */}
					<div className="mb-8">
						<h2 className="mb-4 text-xl font-semibold">
							9. Risks and Mitigation
						</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="potentialRisks"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Potential Risks</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('potentialRisks') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="mitigationPlans"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Mitigation Plans</FormLabel>
										<FormControl>
											<Textarea className="min-h-[100px]" {...field} />
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('mitigationPlans') -
												field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Section 10: Contact Information */}
					<div className="mb-8">
						<h2 className="mb-4 text-xl font-semibold">
							10. About the Submitter
						</h2>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input type="email" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="discordHandle"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Discord Handle</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="website"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Website (Optional)</FormLabel>
										<FormControl>
											<Input placeholder="https://example.com" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="githubProfile"
								render={({ field }) => (
									<FormItem>
										<FormLabel>GitHub Profile (Optional)</FormLabel>
										<FormControl>
											<Input
												placeholder="https://github.com/username"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="otherLinks"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Other Relevant Links (Optional)</FormLabel>
										<FormControl>
											<Input
												placeholder="Separate links with commas"
												{...field}
											/>
										</FormControl>
										<FormDescription>
											{getMaxLengthForField('otherLinks') - field.value.length}{' '}
											characters remaining
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

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
				</form>
			</Form>
		</div>
	)
}
