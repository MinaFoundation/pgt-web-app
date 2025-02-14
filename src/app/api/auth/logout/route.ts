import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import logger from '@/logging'

export async function POST() {
	try {
		const cookieStore = await cookies()

		// Clear auth cookies
		cookieStore.delete('access_token')
		cookieStore.delete('refresh_token')

		return NextResponse.json({ success: true })
	} catch (error) {
		logger.error('Logout error:', error)
		return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
	}
}
