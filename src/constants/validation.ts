export class ProposalValidation {
	// Proposal field validation
	static readonly TITLE = {
		min: 5,
		max: 100,
		messages: {
			required: 'Title is required',
			min: 'Title must be at least 5 characters',
			max: 'Title cannot exceed 100 characters',
		},
	}

	static readonly PROPOSAL_SUMMARY = {
		min: 100,
		max: 1000,
		messages: {
			required: 'Proposal summary is required',
			min: 'Proposal summary must be at least 100 characters',
			max: 'Proposal summary cannot exceed 1000 characters',
		},
	}

	static readonly PROBLEM_STATEMENT = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Problem statement is required',
			min: 'Problem statement must be at least 100 characters',
			max: 'Problem statement cannot exceed 2000 characters',
		},
	}

	static readonly PROBLEM_IMPORTANCE = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Problem importance is required',
			min: 'Problem importance must be at least 100 characters',
			max: 'Problem importance cannot exceed 2000 characters',
		},
	}

	static readonly PROPOSED_SOLUTION = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Proposed solution is required',
			min: 'Proposed solution must be at least 100 characters',
			max: 'Proposed solution cannot exceed 2000 characters',
		},
	}

	static readonly IMPLEMENTATION_DETAILS = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Implementation details are required',
			min: 'Implementation details must be at least 100 characters',
			max: 'Implementation details cannot exceed 2000 characters',
		},
	}

	static readonly TOTAL_FUNDING_REQUIRED = {
		min: 1,
		max: 1000000,
		messages: {
			required: 'Total funding required is required',
			min: 'Total funding required must be at least 1',
			max: 'Total funding required cannot exceed 1,000,000',
			type: 'Total funding required must be a number',
		},
	}

	static readonly KEY_OBJECTIVES = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Key objectives are required',
			min: 'Key objectives must be at least 100 characters',
			max: 'Key objectives cannot exceed 2000 characters',
		},
	}

	static readonly COMMUNITY_BENEFITS = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Community benefits are required',
			min: 'Community benefits must be at least 100 characters',
			max: 'Community benefits cannot exceed 2000 characters',
		},
	}

	static readonly KPI = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Key performance indicators are required',
			min: 'Key performance indicators must be at least 100 characters',
			max: 'Key performance indicators cannot exceed 2000 characters',
		},
	}

	static readonly BUDGET_BREAKDOWN = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Budget breakdown is required',
			min: 'Budget breakdown must be at least 100 characters',
			max: 'Budget breakdown cannot exceed 2000 characters',
		},
	}

	static readonly ESTIMATED_COMPLETION_DATE = {
		messages: {
			required: 'Estimated completion date is required',
			type: 'Estimated completion date must be a valid date',
		},
	}

	static readonly MILESTONES = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Milestones are required',
			min: 'Milestones must be at least 100 characters',
			max: 'Milestones cannot exceed 2000 characters',
		},
	}

	static readonly TEAM_MEMBERS = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Team members information is required',
			min: 'Team members information must be at least 100 characters',
			max: 'Team members information cannot exceed 2000 characters',
		},
	}

	static readonly RELEVANT_EXPERIENCE = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Relevant experience is required',
			min: 'Relevant experience must be at least 100 characters',
			max: 'Relevant experience cannot exceed 2000 characters',
		},
	}

	static readonly POTENTIAL_RISKS = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Potential risks are required',
			min: 'Potential risks must be at least 100 characters',
			max: 'Potential risks cannot exceed 2000 characters',
		},
	}

	static readonly MITIGATION_PLANS = {
		min: 100,
		max: 2000,
		messages: {
			required: 'Mitigation plans are required',
			min: 'Mitigation plans must be at least 100 characters',
			max: 'Mitigation plans cannot exceed 2000 characters',
		},
	}

	static readonly DISCORD = {
		min: 3,
		max: 100,
		messages: {
			required: 'Discord handle is required',
			min: 'Discord handle must be at least 3 characters',
			max: 'Discord handle cannot exceed 100 characters',
		},
	}

	static readonly EMAIL = {
		max: 254,
		messages: {
			required: 'Email is required',
			email: 'Email must be a valid email address',
			max: 'Email cannot exceed 254 characters',
		},
	}

	static readonly WEBSITE = {
		max: 255,
		messages: {
			max: 'Website URL cannot exceed 255 characters',
			url: 'Website must be a valid URL',
		},
	}

	static readonly GITHUB_PROFILE = {
		max: 255,
		messages: {
			max: 'GitHub profile URL cannot exceed 255 characters',
			url: 'GitHub profile must be a valid URL',
		},
	}

	static readonly OTHER_LINKS = {
		max: 1000,
		messages: {
			max: 'Other links cannot exceed 1000 characters',
		},
	}
}
