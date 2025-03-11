import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function isTouchDevice(): boolean {
	if (typeof window === 'undefined') return false
	return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export function isWalletAddress(value: string): boolean {
	const minaAddressRegex = /^B62q[a-zA-Z0-9]{51}$/
	return minaAddressRegex.test(value)
}

export function truncateWallet(wallet: string, maxLength: number = 14): string {
	if (wallet.length <= maxLength) {
		return wallet
	}

	const start = Math.floor((maxLength - 3) / 2)
	const end = wallet.length - start
	return `${wallet.slice(0, start)}...${wallet.slice(end)}`
}

export const slugify = (str: string): string => {
	return str
		.normalize('NFD') // Normalize diacritics (accents).
		.replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents).
		.replace(/[_\.\s]+/g, '-') // Replace spaces, dots and underscores with dashes.
		.replace(/[^a-zA-Z0-9-]/g, '') // Ensure only alphanumeric characters and dashes.
		.replace(/-+$/g, '') // Remove trailing dashes.
		.slice(0, 80) // Limit the length of the slug.
		.toLowerCase() // Lowercase the slug.
}
