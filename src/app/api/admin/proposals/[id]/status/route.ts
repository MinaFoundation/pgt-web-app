import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import { AdminService } from '@/services/AdminService'
import { ApiResponse } from '@/lib/api-response'
import { AppError } from '@/lib/errors'
import { AuthErrors } from '@/constants/errors'
import { ProposalStatus } from '@prisma/client'
import { z } from 'zod'
import { UserMetadata } from '@/services'

const adminService = new AdminService(prisma)

// Validation schema for status update
const updateStatusSchema = z.object({
	status: z.nativeEnum(ProposalStatus),
})

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getOrCreateUserFromRequest(request)
		if (!user) {
			throw AppError.unauthorized(AuthErrors.UNAUTHORIZED)
		}

		// Check if user is admin
		const isAdmin = await adminService.checkAdminStatus(user.id, user.linkId)
		if (!isAdmin) {
			throw AppError.forbidden(AuthErrors.FORBIDDEN)
		}

		// Validate request body
		const body = await request.json()
		const { status } = updateStatusSchema.parse(body)

		// Update proposal status
		const updatedProposal = await prisma.proposal.update({
			where: { id: parseInt((await params).id) },
			data: { status },
			include: {
				user: {
					select: {
						metadata: true,
					},
				},
				fundingRound: {
					select: {
						name: true,
					},
				},
			},
		})

		return ApiResponse.success({
			id: updatedProposal.id,
			title: updatedProposal.title,
			status: updatedProposal.status,
			totalFundingRequired: updatedProposal.totalFundingRequired,
			createdAt: updatedProposal.createdAt,
			submitter:
				(updatedProposal.user?.metadata as UserMetadata)?.username || 'Unknown',
			fundingRound: updatedProposal.fundingRound?.name,
		})
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw AppError.badRequest('Invalid status value')
		}
		return ApiResponse.error(error)
	}
}
