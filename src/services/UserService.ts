import { PrismaClient, User as PrismaUser } from '@prisma/client'
import { deriveUserId, generateLinkId } from '@/lib/user/derive'
import { AuthSource, AuthSourceType, User } from '@/types/user'

/**
 * Represents the factual structure of User.metadata in the database.
 */
export type UserMetadata = {
	/**
	 * Authentication source information
	 */
	authSource: {
		/** The type of authentication provider */
		type: 'discord' | 'telegram' | 'wallet'
		/** Unique identifier from the auth provider */
		id: string
		/** Username from the auth provider */
		username: string
	}
	/** Display username, defaults to authSource.username if not set */
	username: string
	/** ISO timestamp of when the user was created */
	createdAt: string
	/** Additional metadata fields can be added */
	[key: string]: unknown
}

interface LinkingRule {
	allowedTargets: AuthSourceType[]
	maxConnections: number
}

interface LinkingRules {
	[sourceType: string]: LinkingRule
}

// Linking rules configuration
const LINKING_RULES: LinkingRules = {
	wallet: {
		allowedTargets: ['discord'],
		maxConnections: 1, // Wallet can only link to one Discord user
	},
	discord: {
		allowedTargets: ['wallet'],
		maxConnections: Infinity, // Discord can link to unlimited wallet users
	},
	telegram: {
		allowedTargets: [],
		maxConnections: 0, // Telegram linking not supported yet
	},
} as const

// Helper function to make AuthSource serializable
function serializeAuthSource(authSource: AuthSource): Record<string, string> {
	return {
		type: authSource.type,
		id: authSource.id,
		username: authSource.username,
	}
}

// Add these types at the top of the file
interface LinkedUserInfo {
	id: string
	authSource: {
		type: AuthSourceType
		id: string
		username: string
	}
}

interface UserInfoResponse {
	user: User
	linkedAccounts: LinkedUserInfo[]
}

export class UserService {
	constructor(private prisma: PrismaClient) {}

	async findOrCreateUser(authSource: AuthSource): Promise<PrismaUser> {
		const userId = deriveUserId(authSource)

		const existingUser = await this.prisma.user.findUnique({
			where: { id: userId },
		})

		if (existingUser) {
			return existingUser
		}

		return this.prisma.user.create({
			data: {
				id: userId,
				linkId: generateLinkId(),
				metadata: {
					authSource: serializeAuthSource(authSource),
					username: authSource.username,
					createdAt: new Date().toISOString(),
				},
			},
		})
	}

	async getLinkedAccounts(userId: string): Promise<PrismaUser[]> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { linkId: true },
		})

		if (!user?.linkId) {
			return []
		}

		return this.prisma.user.findMany({
			where: {
				linkId: user.linkId,
				NOT: { id: userId },
			},
		})
	}

	async linkAccounts(userId: string, targetUserId: string): Promise<boolean> {
		// Start a transaction
		return this.prisma.$transaction(async tx => {
			// Get both users
			const [user1, user2] = await Promise.all([
				tx.user.findUnique({ where: { id: userId } }),
				tx.user.findUnique({ where: { id: targetUserId } }),
			])

			if (!user1 || !user2) {
				return false
			}

			// Generate new linkId if neither user has one
			const linkId = user1.linkId || user2.linkId || generateLinkId()

			// Update both users with the same linkId
			await Promise.all([
				tx.user.update({
					where: { id: userId },
					data: { linkId },
				}),
				tx.user.update({
					where: { id: targetUserId },
					data: { linkId },
				}),
			])

			return true
		})
	}

	private async getAuthSourceFromUser(
		userId: string,
	): Promise<AuthSource | null> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { metadata: true },
		})

		if (!user?.metadata || typeof user.metadata !== 'object') {
			return null
		}

		const metadata = user.metadata as { authSource?: Record<string, string> }
		const authSource = metadata.authSource

		if (!authSource || !('type' in authSource)) {
			return null
		}

		return {
			type: authSource.type as AuthSourceType,
			id: authSource.id,
			username: authSource.username,
		}
	}

	private async countExistingLinks(userId: string): Promise<number> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { linkId: true },
		})

		if (!user?.linkId) return 0

		const linkedUsers = await this.prisma.user.count({
			where: {
				linkId: user.linkId,
				NOT: { id: userId },
			},
		})

		return linkedUsers
	}

	async canLink(userId: string, targetUserId: string): Promise<boolean> {
		// Get auth sources for both users
		const [sourceAuth, targetAuth] = await Promise.all([
			this.getAuthSourceFromUser(userId),
			this.getAuthSourceFromUser(targetUserId),
		])

		// If we can't determine auth source for either user, they can't be linked
		if (!sourceAuth || !targetAuth) {
			return false
		}

		// Get linking rules for source user
		const sourceRules = LINKING_RULES[sourceAuth.type]
		const targetRules = LINKING_RULES[targetAuth.type]

		// Check if target type is allowed for source
		if (!sourceRules.allowedTargets.includes(targetAuth.type)) {
			return false
		}

		// Check if source type is allowed for target
		if (!targetRules.allowedTargets.includes(sourceAuth.type)) {
			return false
		}

		// Get existing link counts
		const [sourceLinks, targetLinks] = await Promise.all([
			this.countExistingLinks(userId),
			this.countExistingLinks(targetUserId),
		])

		// Check if either user has reached their max connections
		if (
			sourceLinks >= sourceRules.maxConnections ||
			targetLinks >= targetRules.maxConnections
		) {
			return false
		}

		// NOTE: No need to check if both users have different linkIds - by default, a new random linkId is generated for each user

		return true
	}

	async getUserInfo(userId: string): Promise<UserInfoResponse | null> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				linkId: true,
				createdAt: true,
				metadata: true,
			},
		})

		if (!user || !user.metadata || typeof user.metadata !== 'object') {
			return null
		}

		const metadata = user.metadata as {
			authSource?: Record<string, string>
			username?: string
			[key: string]: unknown
		}

		if (!metadata.authSource) {
			return null
		}

		// Get linked accounts
		const linkedAccounts = await this.prisma.user.findMany({
			where: {
				linkId: user.linkId,
				NOT: { id: userId },
			},
			select: {
				id: true,
				metadata: true,
			},
		})

		// Transform linked accounts into standardized format
		const transformedLinkedAccounts: LinkedUserInfo[] = linkedAccounts
			.map(account => {
				const accountMetadata = account.metadata as {
					authSource?: Record<string, string>
				}

				if (!accountMetadata?.authSource) return null

				return {
					id: account.id,
					authSource: {
						type: accountMetadata.authSource.type as AuthSourceType,
						id: accountMetadata.authSource.id,
						username: accountMetadata.authSource.username,
					},
				}
			})
			.filter((account): account is LinkedUserInfo => account !== null)

		return {
			user: {
				id: user.id,
				linkId: user.linkId,
				createdAt: user.createdAt.toISOString(),
				metadata: {
					...metadata,
					authSource: {
						type: metadata.authSource.type as AuthSourceType,
						id: metadata.authSource.id,
						username: metadata.authSource.username,
					},
					username: metadata.username || metadata.authSource.username,
				},
			},
			linkedAccounts: transformedLinkedAccounts,
		}
	}
}
