import { ProposalService } from '@/services/ProposalService'
import prisma from '@/lib/prisma'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import logger from '@/logging'
import { ApiResponse } from '@/lib/api-response'
import { AppError } from '@/lib/errors'
import { uintSchema } from '@/schemas'

const proposalService = new ProposalService(prisma)

interface RouteContext {
	params: Promise<{
		id: string
	}>
}

export async function GET(request: Request, { params }: RouteContext) {
	try {
		const proposalId = uintSchema.parse(Number((await params).id))
		const proposal = await proposalService.getProposalById(proposalId)
		return ApiResponse.success(proposal)
	} catch (error) {
		logger.error('Failed to fetch proposal:', error)
		return ApiResponse.error(error)
	}
}

export async function DELETE(req: Request, { params }: RouteContext) {
	try {
		const proposalId = uintSchema.parse(Number((await params).id))
		const user = await getOrCreateUserFromRequest(req)
		if (!user) {
			throw AppError.unauthorized('Please log in to delete proposals')
		}

		await proposalService.deleteProposal(proposalId, user.id, user.linkId)

		return ApiResponse.success({ success: true })
	} catch (error) {
		return ApiResponse.error(error)
	}
}

export async function PUT(req: Request, { params }: RouteContext) {
	try {
		const proposalId = uintSchema.parse(Number((await params).id))

		const user = await getOrCreateUserFromRequest(req)
		if (!user) {
			return ApiResponse.unauthorized('Please log in to update proposals')
		}

		const data = await req.json()

		const canEdit = proposalService.checkEditPermission(proposalId, user)

		if (!canEdit) {
			return ApiResponse.unauthorized('You cannot edit this proposal')
		}

		await proposalService.updateProposal(proposalId, data)

		return ApiResponse.success({ success: true })
	} catch (error) {
		logger.error('Failed to update proposal:', error)
		return ApiResponse.error(error)
	}
}
