import { z } from 'zod'
import { ProposalValidation as PV } from '@/constants/validation'

export const proposalCreateSchema = z.object({
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

	estimatedCompletionDate: z.string().datetime(),

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

export type CreateProposalInput = z.infer<typeof proposalCreateSchema>
