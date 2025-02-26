import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth/jwt'
import { AppError } from './lib/errors'
import logger from './logging'
import { JWTPayload } from 'jose'
import { cookies } from 'next/headers'

const getBaseUrl = () => process.env.NEXT_APP_URL

// Configuration
export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|public|wallets).*)'],
}

// Route definitions
const PUBLIC_PATHS = ['/', '/auth', '/how-it-works', '/about-us'] as const
const AUTH_PATHS = [
	'/api/auth/exchange',
	'/api/auth/refresh',
	'/api/admin/check',
	'/api/auth/wallet',
	'/api/me/info',
] as const

// Type helpers
type PublicPath = (typeof PUBLIC_PATHS)[number]
type AuthPath = (typeof AUTH_PATHS)[number]

// Path checking helpers
function isPublicPath(path: string): path is PublicPath {
	return (PUBLIC_PATHS as readonly string[]).includes(path)
}

function isAuthPath(path: string): path is AuthPath {
	return (AUTH_PATHS as readonly string[]).includes(path)
}

// Route type determination
type RouteType = 'api' | 'web' | 'admin' | 'admin-api'

function getRouteType(path: string): RouteType {
	if (path.startsWith('/api/admin')) return 'admin-api'
	if (path.startsWith('/admin')) return 'admin'
	if (path.startsWith('/api')) return 'api'
	return 'web'
}

/**
 * Manages cookie operations for authentication tokens
 */
class CookieManager {
	private response: NextResponse
	private request: NextRequest

	constructor(request: NextRequest, response: NextResponse) {
		this.request = request
		this.response = response
	}

	/**
	 * Gets authentication tokens from request cookies
	 */
	getRequestTokens() {
		return {
			accessToken: this.request.cookies.get('access_token')?.value ?? null,
			refreshToken: this.request.cookies.get('refresh_token')?.value ?? null,
		}
	}

	/**
	 * Gets authentication tokens from response cookies
	 */
	getResponseTokens() {
		return {
			accessToken: this.response.cookies.get('access_token')?.value ?? null,
			refreshToken: this.response.cookies.get('refresh_token')?.value ?? null,
		}
	}

	/**
	 * Sets authentication tokens in response cookies
	 */
	setTokens(accessToken: string | null, refreshToken: string | null) {
		if (accessToken) {
			this.response.cookies.set('access_token', accessToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				path: '/',
			})
		}

		if (refreshToken) {
			this.response.cookies.set('refresh_token', refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				path: '/',
			})
		}
	}

	/**
	 * Clears authentication tokens from response cookies
	 */
	clearTokens() {
		this.response.cookies.delete('access_token')
		this.response.cookies.delete('refresh_token')
	}
}

// Update the checkAdminAccess function to accept an access token
async function checkAdminAccess(accessToken: string): Promise<boolean> {
	try {
		const baseUrl = getBaseUrl()
		const response = await fetch(`${baseUrl}/api/admin/check`, {
			headers: {
				Cookie: `access_token=${accessToken}`,
			},
		})

		if (!response.ok) return false
		const data = await response.json()
		return data.isAdmin
	} catch (error) {
		logger.error('[Middleware] Admin check failed:', error)
		return false
	}
}

async function handleTokenRefresh(
	refreshToken: string,
	cookieManager: CookieManager,
): Promise<boolean> {
	try {
		const baseUrl = getBaseUrl()
		const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
			method: 'POST',
			headers: {
				Cookie: `refresh_token=${refreshToken}`,
			},
		})

		if (!refreshResponse.ok) {
			return false
		}

		// Get all Set-Cookie headers
		const cookies = refreshResponse.headers.getSetCookie()

		// Parse the cookies to get the new tokens
		const newAccessToken = cookies
			.find(cookie => cookie.startsWith('access_token='))
			?.split(';')[0]
			.split('=')[1]

		const newRefreshToken = cookies
			.find(cookie => cookie.startsWith('refresh_token='))
			?.split(';')[0]
			.split('=')[1]

		// Set the new tokens using the cookie manager
		cookieManager.setTokens(newAccessToken ?? null, newRefreshToken ?? null)

		return true
	} catch (error) {
		logger.error('[Middleware] Token refresh failed:', error)
		return false
	}
}

// Update authenticateRequest to use CookieManager
async function authenticateRequest(
	cookieManager: CookieManager,
	request: NextRequest,
): Promise<AuthResult> {
	const { accessToken, refreshToken } = cookieManager.getRequestTokens()

	// No tokens available
	if (!accessToken && !refreshToken) {
		return { isAuthenticated: false, error: 'No authentication tokens' }
	}

	// Try access token
	if (accessToken) {
		try {
			await verifyToken(accessToken)
			const isAdmin = await checkAdminAccess(accessToken)

			return {
				isAuthenticated: true,
				isAdmin,
			}
		} catch (error) {
			logger.debug('[Middleware] Access token invalid, will attempt refresh')
		}
	}

	// Try refresh token
	if (refreshToken) {
		try {
			const refreshSuccessful = await handleTokenRefresh(
				refreshToken,
				cookieManager,
			)
			if (refreshSuccessful) {
				const { accessToken: newAccessToken } =
					cookieManager.getResponseTokens()
				if (newAccessToken) {
					// We don't need to set the cookie on the request anymore since it's handled by cookieManager
					// and will be propagated through the response
					const cookieStore = await cookies()

					const isAdmin = await checkAdminAccess(newAccessToken)
					return {
						isAuthenticated: true,
						isAdmin,
					}
				}
			}
		} catch (error) {
			logger.error('[Middleware] Refresh failed:', error)
		}
	}

	return { isAuthenticated: false, error: 'Authentication failed' }
}

// Update middleware function to validate tokens first
export async function middleware(request: NextRequest) {
	const path = request.nextUrl.pathname
	const routeType = getRouteType(path)

	logger.debug('[Middleware] Processing request:', { path, routeType })

	// Skip token validation for public and auth paths
	if (isPublicPath(path)) {
		return NextResponse.next()
	}

	if (isAuthPath(path)) {
		return NextResponse.next()
	}

	// Get tokens from request
	const accessToken = request.cookies.get('access_token')?.value
	const refreshToken = request.cookies.get('refresh_token')?.value

	// No tokens available
	if (!accessToken && !refreshToken) {
		return generateUnauthorizedResponse(routeType, request)
	}

	// Try to validate access token
	if (accessToken) {
		try {
			await verifyToken(accessToken)

			// Token is valid, create response and proceed
			const response = NextResponse.next()

			// For admin routes, check permissions
			if (routeType === 'admin' || routeType === 'admin-api') {
				const isAdmin = await checkAdminAccess(accessToken)
				if (!isAdmin) {
					return generateAdminUnauthorizedResponse(routeType, request)
				}
			}

			return response
		} catch (error) {
			logger.debug('[Middleware] Access token invalid, will attempt refresh')
			// Continue to refresh token logic
		}
	}

	// Try refresh token if access token is invalid or missing
	if (refreshToken) {
		try {
			const baseUrl = getBaseUrl()
			const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
				method: 'POST',
				headers: {
					Cookie: `refresh_token=${refreshToken}`,
				},
			})

			if (!refreshResponse.ok) {
				return generateUnauthorizedResponse(routeType, request)
			}

			// Get the new tokens from the refresh response
			const cookies = refreshResponse.headers.getSetCookie()
			const newAccessToken = cookies
				.find(cookie => cookie.startsWith('access_token='))
				?.split(';')[0]
				.split('=')[1]

			if (!newAccessToken) {
				return generateUnauthorizedResponse(routeType, request)
			}

			const requestHeaders = new Headers(request.headers)
			const requestCookies = requestHeaders.get('Cookie') || ''
			const cookieArray = requestCookies.split('; ')
			const updatedCookies = cookieArray.filter(
				cookie => !cookie.startsWith('access_token='),
			)
			updatedCookies.push(`access_token=${newAccessToken}`)

			requestHeaders.set('Cookie', updatedCookies.join('; '))

			const modifiedRequest = new NextRequest(request, {
				headers: requestHeaders,
			})

			// Create response with the new tokens
			const response = NextResponse.next({ request: modifiedRequest })

			// Set each cookie as a separate Set-Cookie header as per HTTP/1.1 spec
			cookies.forEach(cookie => {
				response.headers.append('Set-Cookie', cookie)
			})

			// For admin routes, check permissions
			if (routeType === 'admin' || routeType === 'admin-api') {
				// Verify admin status with new token
				const isAdmin = await checkAdminAccess(newAccessToken)
				if (!isAdmin) {
					return generateAdminUnauthorizedResponse(routeType, request)
				}
			}

			return response
		} catch (error) {
			logger.error('[Middleware] Refresh failed:', error)
			return generateUnauthorizedResponse(routeType, request)
		}
	}

	return generateUnauthorizedResponse(routeType, request)
}

/**
 * First layer ensuring API access only to authenticated users.
 * @param routeType
 * @param request
 * @returns
 */
function generateUnauthorizedResponse(
	routeType: RouteType,
	request: NextRequest,
): NextResponse {
	// All calls under /api/ must be authenticated. This is a first-layer guard, but individual
	// routes must implement the check as well
	if (routeType === 'api') {
		return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	const url = new URL('/auth', request.url)
	url.searchParams.set('from', request.nextUrl.pathname)
	return NextResponse.redirect(url)
}

function generateAdminUnauthorizedResponse(
	routeType: RouteType,
	request: NextRequest,
): NextResponse {
	if (routeType === 'admin-api') {
		return new NextResponse(
			JSON.stringify({ error: 'Admin access required' }),
			{ status: 403, headers: { 'Content-Type': 'application/json' } },
		)
	}

	// For web routes, redirect to forbidden page
	const url = new URL('/forbidden', request.url)
	return NextResponse.redirect(url)
}

/**
 * Authentication result with payload and permissions
 */
interface AuthResult {
	isAuthenticated: boolean
	isAdmin?: boolean
	error?: string
}

/**
 * Handles the response based on route type and auth result
 */
function handleAuthResponse(
	request: NextRequest,
	routeType: RouteType,
	authResult: AuthResult,
	response: NextResponse,
): NextResponse {
	// Authentication failed
	if (!authResult.isAuthenticated) {
		return generateUnauthorizedResponse(routeType, request)
	}

	// Admin route but not admin
	if (
		(routeType === 'admin' || routeType === 'admin-api') &&
		!authResult.isAdmin
	) {
		return generateAdminUnauthorizedResponse(routeType, request)
	}

	// Authentication successful and permissions valid
	return response
}
