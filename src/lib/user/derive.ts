import { AuthSource } from '@/types/user'
import { v5 as uuidv5, v4 as uuidv4 } from 'uuid'

// UUID namespace for GovBot user IDs (generated once with v4)
const GOVBOT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

export function deriveUserId(authSource: AuthSource): string {
	// Create deterministic string from auth source
	const preImage = `${authSource.type}:${authSource.id}`

	// Generate deterministic UUID using v5 with our namespace
	return uuidv5(preImage, GOVBOT_NAMESPACE)
}

export function generateLinkId(): string {
	// Generate random UUID for linking
	return uuidv4()
}
