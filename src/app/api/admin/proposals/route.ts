import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getOrCreateUserFromRequest } from '@/lib/auth'
import { AdminService } from '@/services/AdminService'
import { ApiResponse } from '@/lib/api-response'
import { AppError } from '@/lib/errors'
import { AuthErrors } from '@/constants/errors'
import { UserMetadata } from '@/services'

const adminService = new AdminService(prisma)

export async function GET(request: Request) {
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

		const proposals = await prisma.proposal.findMany({
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
			orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
		})

		// Transform the data for the frontend
		const transformedProposals = proposals.map(proposal => ({
			id: proposal.id,
			title: proposal.title,
			status: proposal.status,
			totalFundingRequired: proposal.totalFundingRequired,
			createdAt: proposal.createdAt,
			submitter:
				(proposal.user?.metadata as UserMetadata)?.username || 'Unknown',
			fundingRound: proposal.fundingRound?.name,
		}))

		return ApiResponse.success(transformedProposals)
	} catch (error) {
		return ApiResponse.error(error)
	}
}
