'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { z } from 'zod'
import { ProposalValidation as PV } from '@/constants/validation'
import { useRouter } from 'next/navigation'
import { useFormFeedback } from '@/hooks/use-form-feedback'
import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Define the valid field names
type ProposalField = keyof typeof proposalSchema.shape

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

type ValidationErrors = {
	[key in ProposalField]?: string
}

interface Props {
	mode?: 'create' | 'edit'
	proposalId?: string
}

export default function CreateProposal({ mode = 'create', proposalId }: Props) {
	const { toast } = useToast()
	const router = useRouter()
	const [formData, setFormData] = useState({
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
	})
	const [errors, setErrors] = useState<ValidationErrors>({})
	const [isSaving, setIsSaving] = useState<boolean>(false)

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

				setFormData(mappedData)
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
	}, [mode, proposalId, router, toast])

	const validateField = (name: ProposalField, value: string | Date) => {
		try {
			if (name === 'estimatedCompletionDate' && value instanceof Date) {
				// Skip validation for date fields
				setErrors(prev => {
					const newErrors = { ...prev }
					delete newErrors[name]
					return newErrors
				})
				return
			}

			proposalSchema.shape[name].parse(value)
			setErrors(prev => {
				const newErrors = { ...prev }
				delete newErrors[name]
				return newErrors
			})
		} catch (error) {
			if (error instanceof z.ZodError) {
				setErrors(prev => ({
					...prev,
					[name]: error.errors[0].message,
				}))
			}
		}
	}

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
		validateField(name as ProposalField, value)
	}

	const handleDateChange = (date: Date | undefined) => {
		if (date) {
			setFormData(prev => ({ ...prev, estimatedCompletionDate: date }))
			validateField('estimatedCompletionDate', date)
		}
	}

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSaving(true)
		// Validate all fields before submission
		let hasErrors = false
		Object.entries(formData).forEach(([key, value]) => {
			if (key === 'estimatedCompletionDate') return // Skip date validation

			try {
				proposalSchema.shape[key as ProposalField].parse(value)
			} catch (error) {
				if (error instanceof z.ZodError) {
					setErrors(prev => ({
						...prev,
						[key]: error.errors[0].message,
					}))
					hasErrors = true
				}
			}
		})

		if (hasErrors) {
			toast({
				title: 'Validation Error',
				description: 'Please fix the errors before submitting.',
				variant: 'destructive',
			})
			setIsSaving(false)
			return
		}

		try {
			// Format the data for submission
			const submissionData = {
				...formData,
				estimatedCompletionDate: formData.estimatedCompletionDate.toISOString(),
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

	const getRemainingChars = (field: string, maxLength: number) => {
		const fieldValue = formData[field as keyof typeof formData]
		if (typeof fieldValue === 'string') {
			return maxLength - fieldValue.length
		}
		return maxLength
	}

	// Get the feedback label for text fields
	const getFeedbackLabel = (fieldName: string) => {
		const remaining = getRemainingChars(
			fieldName,
			getMaxLengthForField(fieldName),
		)
		return (
			<p className="mt-1 text-sm text-gray-500">
				{remaining} characters remaining
			</p>
		)
	}

	// Helper function to get max length for a field
	const getMaxLengthForField = (fieldName: string): number => {
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

	return (
		<div className="mx-auto w-full max-w-6xl rounded-lg bg-white p-6 shadow-md">
			<h1 className="mb-6 text-2xl font-bold">
				{mode === 'create' ? 'Create New Proposal' : 'Edit Proposal'}
			</h1>

			<form onSubmit={onSubmit}>
				{/* Section 1: Proposal Title */}
				<div className="mb-8">
					<h2 className="mb-4 text-xl font-semibold">1. Proposal Title</h2>
					<div className="space-y-4">
						<div>
							<Label htmlFor="title">Title</Label>
							<Input
								id="title"
								name="title"
								value={formData.title}
								onChange={handleInputChange}
								className={errors.title ? 'border-red-500' : ''}
							/>
							{errors.title ? (
								<p className="mt-1 text-sm text-red-500">{errors.title}</p>
							) : (
								getFeedbackLabel('title')
							)}
						</div>
					</div>
				</div>

				{/* Section 2: Overview */}
				<div className="mb-8">
					<h2 className="mb-4 text-xl font-semibold">2. Overview</h2>
					<div className="space-y-4">
						<div>
							<Label htmlFor="proposalSummary">Proposal Summary</Label>
							<Textarea
								id="proposalSummary"
								name="proposalSummary"
								value={formData.proposalSummary}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.proposalSummary ? 'border-red-500' : ''
								}`}
							/>
							{errors.proposalSummary ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.proposalSummary}
								</p>
							) : (
								getFeedbackLabel('proposalSummary')
							)}
						</div>

						<div>
							<Label htmlFor="keyObjectives">Key Objectives</Label>
							<Textarea
								id="keyObjectives"
								name="keyObjectives"
								value={formData.keyObjectives}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.keyObjectives ? 'border-red-500' : ''
								}`}
							/>
							{errors.keyObjectives ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.keyObjectives}
								</p>
							) : (
								getFeedbackLabel('keyObjectives')
							)}
						</div>
					</div>
				</div>

				{/* Section 3: Problem Statement */}
				<div className="mb-8">
					<h2 className="mb-4 text-xl font-semibold">3. Problem Statement</h2>
					<div className="space-y-4">
						<div>
							<Label htmlFor="problemStatement">What is the problem?</Label>
							<Textarea
								id="problemStatement"
								name="problemStatement"
								value={formData.problemStatement}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.problemStatement ? 'border-red-500' : ''
								}`}
							/>
							{errors.problemStatement ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.problemStatement}
								</p>
							) : (
								getFeedbackLabel('problemStatement')
							)}
						</div>

						<div>
							<Label htmlFor="problemImportance">Why does it matter?</Label>
							<Textarea
								id="problemImportance"
								name="problemImportance"
								value={formData.problemImportance}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.problemImportance ? 'border-red-500' : ''
								}`}
							/>
							{errors.problemImportance ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.problemImportance}
								</p>
							) : (
								getFeedbackLabel('problemImportance')
							)}
						</div>
					</div>
				</div>

				{/* Section 4: Proposed Solution */}
				<div className="mb-8">
					<h2 className="mb-4 text-xl font-semibold">4. Proposed Solution</h2>
					<div className="space-y-4">
						<div>
							<Label htmlFor="proposedSolution">What will you do?</Label>
							<Textarea
								id="proposedSolution"
								name="proposedSolution"
								value={formData.proposedSolution}
								onChange={handleInputChange}
								className={`min-h-[150px] ${
									errors.proposedSolution ? 'border-red-500' : ''
								}`}
							/>
							{errors.proposedSolution ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.proposedSolution}
								</p>
							) : (
								getFeedbackLabel('proposedSolution')
							)}
						</div>

						<div>
							<Label htmlFor="implementationDetails">How will it work?</Label>
							<Textarea
								id="implementationDetails"
								name="implementationDetails"
								value={formData.implementationDetails}
								onChange={handleInputChange}
								className={`min-h-[150px] ${
									errors.implementationDetails ? 'border-red-500' : ''
								}`}
							/>
							{errors.implementationDetails ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.implementationDetails}
								</p>
							) : (
								getFeedbackLabel('implementationDetails')
							)}
						</div>
					</div>
				</div>

				{/* Section 5: Expected Impact */}
				<div className="mb-8">
					<h2 className="mb-4 text-xl font-semibold">5. Expected Impact</h2>
					<div className="space-y-4">
						<div>
							<Label htmlFor="communityBenefits">Community Benefits</Label>
							<Textarea
								id="communityBenefits"
								name="communityBenefits"
								value={formData.communityBenefits}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.communityBenefits ? 'border-red-500' : ''
								}`}
							/>
							{errors.communityBenefits ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.communityBenefits}
								</p>
							) : (
								getFeedbackLabel('communityBenefits')
							)}
						</div>

						<div>
							<Label htmlFor="keyPerformanceIndicators">
								Key Performance Indicators (KPIs)
							</Label>
							<Textarea
								id="keyPerformanceIndicators"
								name="keyPerformanceIndicators"
								value={formData.keyPerformanceIndicators}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.keyPerformanceIndicators ? 'border-red-500' : ''
								}`}
							/>
							{errors.keyPerformanceIndicators ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.keyPerformanceIndicators}
								</p>
							) : (
								getFeedbackLabel('keyPerformanceIndicators')
							)}
						</div>
					</div>
				</div>

				{/* Section 6: Budget Request */}
				<div className="mb-8">
					<h2 className="mb-4 text-xl font-semibold">6. Budget Request</h2>
					<div className="space-y-4">
						<div>
							<Label htmlFor="totalFundingRequired">
								Total Funding Required (MINA)
							</Label>
							<Input
								id="totalFundingRequired"
								name="totalFundingRequired"
								type="text"
								value={formData.totalFundingRequired}
								onChange={handleInputChange}
								className={errors.totalFundingRequired ? 'border-red-500' : ''}
							/>
							{errors.totalFundingRequired ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.totalFundingRequired}
								</p>
							) : (
								<p className="mt-1 text-sm text-gray-500">
									Enter amount in MINA (e.g., 10000)
								</p>
							)}
						</div>

						<div>
							<Label htmlFor="budgetBreakdown">Breakdown of Costs</Label>
							<Textarea
								id="budgetBreakdown"
								name="budgetBreakdown"
								value={formData.budgetBreakdown}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.budgetBreakdown ? 'border-red-500' : ''
								}`}
							/>
							{errors.budgetBreakdown ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.budgetBreakdown}
								</p>
							) : (
								getFeedbackLabel('budgetBreakdown')
							)}
						</div>
					</div>
				</div>

				{/* Section 7: Milestones and Timeline */}
				<div className="mb-8">
					<h2 className="mb-4 text-xl font-semibold">
						7. Milestones and Timeline
					</h2>
					<div className="space-y-4">
						<div>
							<Label htmlFor="milestones">Key Milestones</Label>
							<Textarea
								id="milestones"
								name="milestones"
								value={formData.milestones}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.milestones ? 'border-red-500' : ''
								}`}
							/>
							{errors.milestones ? (
								<p className="mt-1 text-sm text-red-500">{errors.milestones}</p>
							) : (
								getFeedbackLabel('milestones')
							)}
						</div>

						<div>
							<Label htmlFor="estimatedCompletionDate">
								Estimated Completion Date
							</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										id="estimatedCompletionDate"
										variant="outline"
										className={cn(
											'w-full justify-start text-left font-normal',
											!formData.estimatedCompletionDate &&
												'text-muted-foreground',
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{formData.estimatedCompletionDate ? (
											format(formData.estimatedCompletionDate, 'PPP')
										) : (
											<span>Pick a date</span>
										)}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={formData.estimatedCompletionDate}
										onSelect={handleDateChange}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
					</div>
				</div>

				{/* Section 8: Team Information */}
				<div className="mb-8">
					<h2 className="mb-4 text-xl font-semibold">8. Team Information</h2>
					<div className="space-y-4">
						<div>
							<Label htmlFor="teamMembers">Team Members</Label>
							<Textarea
								id="teamMembers"
								name="teamMembers"
								value={formData.teamMembers}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.teamMembers ? 'border-red-500' : ''
								}`}
							/>
							{errors.teamMembers ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.teamMembers}
								</p>
							) : (
								getFeedbackLabel('teamMembers')
							)}
						</div>

						<div>
							<Label htmlFor="relevantExperience">Relevant Experience</Label>
							<Textarea
								id="relevantExperience"
								name="relevantExperience"
								value={formData.relevantExperience}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.relevantExperience ? 'border-red-500' : ''
								}`}
							/>
							{errors.relevantExperience ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.relevantExperience}
								</p>
							) : (
								getFeedbackLabel('relevantExperience')
							)}
						</div>
					</div>
				</div>

				{/* Section 9: Risks and Mitigation */}
				<div className="mb-8">
					<h2 className="mb-4 text-xl font-semibold">
						9. Risks and Mitigation
					</h2>
					<div className="space-y-4">
						<div>
							<Label htmlFor="potentialRisks">Potential Risks</Label>
							<Textarea
								id="potentialRisks"
								name="potentialRisks"
								value={formData.potentialRisks}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.potentialRisks ? 'border-red-500' : ''
								}`}
							/>
							{errors.potentialRisks ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.potentialRisks}
								</p>
							) : (
								getFeedbackLabel('potentialRisks')
							)}
						</div>

						<div>
							<Label htmlFor="mitigationPlans">Mitigation Plans</Label>
							<Textarea
								id="mitigationPlans"
								name="mitigationPlans"
								value={formData.mitigationPlans}
								onChange={handleInputChange}
								className={`min-h-[100px] ${
									errors.mitigationPlans ? 'border-red-500' : ''
								}`}
							/>
							{errors.mitigationPlans ? (
								<p className="mt-1 text-sm text-red-500">
									{errors.mitigationPlans}
								</p>
							) : (
								getFeedbackLabel('mitigationPlans')
							)}
						</div>
					</div>
				</div>

				{/* Section 10: Contact Information */}
				<div className="mb-8">
					<h2 className="mb-4 text-xl font-semibold">
						10. About the Submitter
					</h2>
					<div className="space-y-4">
						<div>
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								value={formData.email}
								onChange={handleInputChange}
								className={errors.email ? 'border-red-500' : ''}
							/>
							{errors.email && (
								<p className="mt-1 text-sm text-red-500">{errors.email}</p>
							)}
						</div>

						<div>
							<Label htmlFor="discordHandle">Discord Handle</Label>
							<Input
								id="discordHandle"
								name="discordHandle"
								value={formData.discordHandle}
								onChange={handleInputChange}
								className={errors.discordHandle ? 'border-red-500' : ''}
							/>
							{errors.discordHandle && (
								<p className="mt-1 text-sm text-red-500">
									{errors.discordHandle}
								</p>
							)}
						</div>

						<div>
							<Label htmlFor="website">Website (Optional)</Label>
							<Input
								id="website"
								name="website"
								value={formData.website}
								onChange={handleInputChange}
								className={errors.website ? 'border-red-500' : ''}
								placeholder="https://example.com"
							/>
							{errors.website && (
								<p className="mt-1 text-sm text-red-500">{errors.website}</p>
							)}
						</div>

						<div>
							<Label htmlFor="githubProfile">GitHub Profile (Optional)</Label>
							<Input
								id="githubProfile"
								name="githubProfile"
								value={formData.githubProfile}
								onChange={handleInputChange}
								className={errors.githubProfile ? 'border-red-500' : ''}
								placeholder="https://github.com/username"
							/>
							{errors.githubProfile && (
								<p className="mt-1 text-sm text-red-500">
									{errors.githubProfile}
								</p>
							)}
						</div>

						<div>
							<Label htmlFor="otherLinks">
								Other Relevant Links (Optional)
							</Label>
							<Input
								id="otherLinks"
								name="otherLinks"
								value={formData.otherLinks}
								onChange={handleInputChange}
								className={errors.otherLinks ? 'border-red-500' : ''}
								placeholder="Separate links with commas"
							/>
							{errors.otherLinks ? (
								<p className="mt-1 text-sm text-red-500">{errors.otherLinks}</p>
							) : (
								getFeedbackLabel('otherLinks')
							)}
						</div>
					</div>
				</div>

				<div className="flex justify-end space-x-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push('/proposals')}
					>
						Cancel
					</Button>
					<Button type="submit" loading={isSaving}>
						{mode === 'create' ? 'Create Draft' : 'Save Changes'}
					</Button>
				</div>
			</form>
		</div>
	)
}

// Change the export to named export
export { CreateProposal }
