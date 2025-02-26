import dotenv from 'dotenv'
import path from 'path'
import readline from 'readline'
import {
	GptSurveyClient,
	type CreateProposalParams,
} from '@/lib/gpt-survey/client'
import logger from '@/logging'

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Create readline interface
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
})

// Promisified readline question
const question = (query: string): Promise<string> => {
	return new Promise(resolve => {
		rl.question(query, resolve)
	})
}

// Prompt user for action
async function promptForAction(): Promise<
	| 'create'
	| 'summarize'
	| 'getProposalSummary'
	| 'addFeedback'
	| 'summarizeFeedbacks'
	| 'getFeedbackSummary'
	| 'health'
	| 'exit'
> {
	console.log('\n📝 GPT Survey Interactive Options:')
	console.log('1) Create Proposal')
	console.log('2) Summarize Proposal')
	console.log('3) Get Proposal Summary')
	console.log('4) Add Feedback')
	console.log('5) Summarize Feedbacks')
	console.log('6) Get Feedback Summary')
	console.log('7) Health Check')
	console.log('8) Exit')
	const answer = await question('\nChoose an action [1-8]: ')
	switch (answer.trim()) {
		case '1':
			return 'create'
		case '2':
			return 'summarize'
		case '3':
			return 'getProposalSummary'
		case '4':
			return 'addFeedback'
		case '5':
			return 'summarizeFeedbacks'
		case '6':
			return 'getFeedbackSummary'
		case '7':
			return 'health'
		case '8':
			return 'exit'
		default:
			console.log('Invalid selection. Try again.')
			return promptForAction()
	}
}

// Handler to create a proposal
async function handleCreateProposal(client: GptSurveyClient): Promise<void> {
	const proposalId = await question('Enter Proposal ID: ')
	const title = await question('Enter Proposal Name: ')
	const proposalDescription = await question('Enter Proposal Description: ')
	const proposalAuthor = await question('Enter Proposal Author: ')
	const endTimeInput = await question('Enter End Time (YYYY-MM-DDTHH:MM:SSZ): ')
	const fundingRoundIdStr = await question(
		'Enter Funding Round ID (numeric mefId): ',
	)

	const endTime = new Date(endTimeInput)
	if (isNaN(endTime.getTime())) {
		console.log('Invalid end time format.')
		return
	}
	const fundingRoundId = Number(fundingRoundIdStr)
	if (isNaN(fundingRoundId)) {
		console.log('Invalid funding round ID.')
		return
	}

	const params: CreateProposalParams = {
		proposalId: proposalId.trim(),
		title: title.trim(),
		proposalDescription: proposalDescription.trim(),
		proposalAuthor: proposalAuthor.trim(),
		endTime,
		fundingRoundId,
	}

	try {
		const response = await client.createProposal(params)
		console.log('\n✨ Proposal creation response:', response)
	} catch (error) {
		console.error(
			'\n❌ Error creating proposal:',
			error instanceof Error ? error.message : error,
		)
	}
}

// Handler to summarize a proposal
async function handleSummarizeProposal(client: GptSurveyClient): Promise<void> {
	const proposalId = await question('Enter Proposal ID to summarize: ')
	try {
		const response = await client.summarizeProposal(proposalId.trim())
		console.log('\n✨ Proposal summarization response:', response)
	} catch (error) {
		console.error(
			'\n❌ Error summarizing proposal:',
			error instanceof Error ? error.message : error,
		)
	}
}

// Handler to get a proposal summary
async function handleGetProposalSummary(
	client: GptSurveyClient,
): Promise<void> {
	const proposalId = await question('Enter Proposal ID to get summary: ')
	try {
		const response = await client.getProposalSummary(proposalId.trim())
		console.log('\n✨ Proposal summary response:', response)
	} catch (error) {
		console.error(
			'\n❌ Error getting proposal summary:',
			error instanceof Error ? error.message : error,
		)
	}
}

// Handler to add feedback
async function handleAddFeedback(client: GptSurveyClient): Promise<void> {
	const proposalId = await question('Enter Proposal ID for feedback: ')
	const username = await question('Enter your username: ')
	const feedbackContent = await question('Enter your feedback: ')
	try {
		const response = await client.addFeedback(
			proposalId.trim(),
			username.trim(),
			feedbackContent.trim(),
		)
		console.log('\n✨ Add Feedback response:', response)
	} catch (error) {
		console.error(
			'\n❌ Error adding feedback:',
			error instanceof Error ? error.message : error,
		)
	}
}

// Handler to summarize feedbacks for a proposal
async function handleSummarizeFeedbacks(
	client: GptSurveyClient,
): Promise<void> {
	const proposalId = await question(
		'Enter Proposal ID to summarize feedbacks: ',
	)
	try {
		const response = await client.summarizeFeedbacks(proposalId.trim())
		console.log('\n✨ Summarize Feedbacks response:', response)
	} catch (error) {
		console.error(
			'\n❌ Error summarizing feedbacks:',
			error instanceof Error ? error.message : error,
		)
	}
}

// Handler to get feedback summary
async function handleGetFeedbackSummary(
	client: GptSurveyClient,
): Promise<void> {
	const proposalId = await question(
		'Enter Proposal ID to get feedback summary: ',
	)
	try {
		const response = await client.getFeedbackSummary(proposalId.trim())
		console.log('\n✨ Get Feedback Summary response:', response)
	} catch (error) {
		console.error(
			'\n❌ Error getting feedback summary:',
			error instanceof Error ? error.message : error,
		)
	}
}

// Handler for health check
async function handleHealthCheck(client: GptSurveyClient): Promise<void> {
	try {
		const response = await client.healthCheck()
		console.log('\n✨ Health check response:', response)
	} catch (error) {
		console.error(
			'\n❌ Error performing health check:',
			error instanceof Error ? error.message : error,
		)
	}
}

// Main interactive loop
async function main() {
	const baseUrl = process.env.PGT_GSS_API_URL
	const authSecret = process.env.PGT_GSS_API_TOKEN

	if (!baseUrl || !authSecret) {
		console.error(
			'Missing environment variables: PGT_GSS_API_URL or PGT_GSS_API_TOKEN',
		)
		process.exit(1)
	}

	const client = new GptSurveyClient({ baseUrl, authSecret })

	let action:
		| 'create'
		| 'summarize'
		| 'getProposalSummary'
		| 'addFeedback'
		| 'summarizeFeedbacks'
		| 'getFeedbackSummary'
		| 'health'
		| 'exit'
	do {
		action = await promptForAction()
		if (action === 'create') {
			await handleCreateProposal(client)
		} else if (action === 'summarize') {
			await handleSummarizeProposal(client)
		} else if (action === 'getProposalSummary') {
			await handleGetProposalSummary(client)
		} else if (action === 'addFeedback') {
			await handleAddFeedback(client)
		} else if (action === 'summarizeFeedbacks') {
			await handleSummarizeFeedbacks(client)
		} else if (action === 'getFeedbackSummary') {
			await handleGetFeedbackSummary(client)
		} else if (action === 'health') {
			await handleHealthCheck(client)
		}
	} while (action !== 'exit')

	rl.close()
	process.exit(0)
}

main().catch(error => {
	console.error('Fatal error:', error instanceof Error ? error.message : error)
	rl.close()
	process.exit(1)
})
