import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/jwt'
import { UserService } from '@/services/UserService'
import logger from '@/logging'
import { deriveUserId } from '@/lib/user/derive'
import { ApiResponse } from '@/lib/api-response'
import {
	JWSInvalid,
	JWSSignatureVerificationFailed,
	JWTClaimValidationFailed,
	JWTExpired,
	JWTInvalid,
} from 'jose/errors'

const userService = new UserService(prisma)

export async function GET() {
	try {
		const cookieStore = await cookies()
		const accessToken = cookieStore.get('access_token')?.value

		if (!accessToken) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		// Verify JWT and get payload
		const payload = await verifyToken(accessToken)

		// Get user ID
		const userId = deriveUserId(payload.authSource)

		// Create user if not exists
		await userService.findOrCreateUser(payload.authSource)

		// Get complete user info
		const userInfo = await userService.getUserInfo(userId)

		if (!userInfo) {
			return ApiResponse.notFound('User not found')
		}

		return ApiResponse.success(userInfo)
	} catch (error) {
		logger.error('User info error:', error)

		if (
			error instanceof JWTInvalid ||
			error instanceof JWTExpired ||
			error instanceof JWTClaimValidationFailed ||
			error instanceof JWSSignatureVerificationFailed ||
			error instanceof JWSInvalid
		) {
			return ApiResponse.unauthorized('Invalid or expired access token')
		}

		if (error instanceof Error && error.message === 'Invalid token') {
			return ApiResponse.unauthorized('Unauthorized')
		}

		return ApiResponse.error('Internal server error')
	}
}
