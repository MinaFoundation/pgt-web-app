import { ProposalService } from '@/services/ProposalService'
import prisma from '@/lib/prisma'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import { z } from 'zod'
import logger from '@/logging'
import { ApiResponse } from '@/lib/api-response'
import { AppError } from '@/lib/errors'

const proposalService = new ProposalService(prisma)
const userService = new UserService(prisma)

interface RouteContext {
	params: Promise<{
		id: string
	}>
}

export async function GET(request: Request, context: RouteContext) {
	try {
		const user = await getOrCreateUserFromRequest(request)
		if (!user) {
			return ApiResponse.unauthorized('Please log in to view proposals')
		}

		const proposal = await prisma.proposal.findUnique({
			where: { id: parseInt((await context.params).id) },
			include: {
				user: {
					select: {
						id: true,
						linkId: true,
						metadata: true,
					},
				},
				fundingRound: {
					include: {
						considerationPhase: true,
						deliberationPhase: true,
						votingPhase: true,
					},
				},
			},
		})

		if (!proposal) {
			return ApiResponse.notFound('Proposal not found')
		}

		// Get user info including linked accounts
		const userInfo = await userService.getUserInfo(proposal.user.id)
		if (!userInfo) {
			throw new AppError(
				'Failed to fetch user information',
				HTTPStatus.INTERNAL_ERROR,
			)
		}

		// Check if user is owner or linked user
		const isOwner =
			proposal.userId === user.id || proposal.user.linkId === user.linkId

		// Combine proposal data with user info
		const response = {
			...proposal,
			isOwner,
			user: {
				...proposal.user,
				metadata: userInfo.user.metadata,
				linkedAccounts: userInfo.linkedAccounts,
			},
		}

		return ApiResponse.success(response)
	} catch (error) {
		logger.error('Failed to fetch proposal:', error)
		return ApiResponse.error(error)
	}
}

export async function DELETE(req: Request, { params }: RouteContext) {
	try {
		const user = await getOrCreateUserFromRequest(req)
		if (!user) {
			throw AppError.unauthorized('Please log in to delete proposals')
		}

		await proposalService.deleteProposal(
			parseInt((await params).id),
			user.id,
			user.linkId,
		)

		return ApiResponse.success({ success: true })
	} catch (error) {
		return ApiResponse.error(error)
	}
}

export async function PUT(req: Request, { params }: RouteContext) {
	try {
		const proposalId = z.number().parse((await params).id)

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
