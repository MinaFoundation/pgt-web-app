export type AuthSourceType = 'discord' | 'telegram' | 'wallet'

export type AuthSource = {
	type: AuthSourceType
	id: string
	username: string
}

export type User = {
	id: string
	linkId: string
	createdAt: string
	metadata: {
		authSource: {
			type: AuthSourceType
			id: string
			username: string
		}
		username: string
		[key: string]: unknown
	}
}
