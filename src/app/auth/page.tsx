'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
	ExternalLinkIcon,
	DiscordLogoIcon,
	ChatBubbleIcon,
} from '@radix-ui/react-icons'
import { Wallet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { WalletConnectorDialog } from '@/components/web3/WalletConnectorDialog'
import { WalletAuthDialog } from '@/components/web3/WalletAuthDialog'
import { useWallet } from '@/contexts/WalletContext'

function DiscordAuthDialog({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Authenticate with Discord</DialogTitle>
					<DialogDescription>
						To authenticate with Discord, please follow these steps:
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<ol className="list-inside list-decimal space-y-2">
						<li>Join our Discord server if you haven&rsquo;t already</li>
						<li>Navigate to the authentication channel</li>
						<li>
							Click the &ldquo;🔐 Login To MEF&rdquo; button in the login
							dashboard
						</li>
					</ol>
					<Button
						className="w-full"
						onClick={() =>
							window.open(
								'https://discord.com/channels/1229012241710448640/1311367879085785161/1311367879085785161',
								'_blank',
							)
						}
					>
						<ExternalLinkIcon className="mr-2 h-4 w-4" />
						Open Discord Login Dashboard
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function AuthenticationOptions() {
	const [showDiscordDialog, setShowDiscordDialog] = useState(false)
	const [showWalletDialog, setShowWalletDialog] = useState(false)
	const { state } = useWallet()
	const router = useRouter()
	const [walletAuthSuccess, setWalletAuthSuccess] = useState(false)

	const handleWalletAuth = () => {
		if (state.wallet) {
			// If wallet is already connected, show auth dialog directly
			setShowWalletDialog(true)
		} else {
			// If no wallet connected, show connector dialog first
			setShowWalletConnector(true)
		}
	}

	const [showWalletConnector, setShowWalletConnector] = useState(false)

	// Watch for wallet connection state changes
	useEffect(() => {
		if (state.wallet && showWalletConnector) {
			// When wallet gets connected, close connector and show auth dialog
			setShowWalletConnector(false)
			setShowWalletDialog(true)
		}
	}, [state.wallet, showWalletConnector])

	// Add effect to redirect after successful wallet authentication
	useEffect(() => {
		if (walletAuthSuccess) {
			const timer = setTimeout(() => {
				router.push('/')
			}, 2500)

			return () => clearTimeout(timer)
		}
	}, [walletAuthSuccess, router])

	// Handler for when wallet auth is successful
	const handleWalletAuthSuccess = useCallback(() => {
		setShowWalletDialog(false)
		setWalletAuthSuccess(true)
	}, [])

	if (walletAuthSuccess) {
		return (
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Authentication Successful</CardTitle>
					<CardDescription>
						Redirecting you to your destination...
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert
						variant="default"
						className="border-green-200 bg-green-50 text-green-800"
					>
						<CheckCircle2 className="h-4 w-4 text-green-600" />
						<AlertTitle>Success!</AlertTitle>
						<AlertDescription className="text-green-700">
							Authentication with wallet completed successfully.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>Welcome to MEF</CardTitle>
				<CardDescription>
					Choose how you&rsquo;d like to authenticate to continue
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4">
					<Button
						variant="outline"
						className="h-auto w-full justify-start py-4"
						onClick={() => setShowDiscordDialog(true)}
					>
						<DiscordLogoIcon className="mr-2 h-5 w-5 text-[#5865F2]" />
						<div className="flex flex-col items-start">
							<span>Authenticate with Discord</span>
							<span className="text-xs text-muted-foreground">
								Connect using your Discord account
							</span>
						</div>
					</Button>

					<Button
						variant="outline"
						className="h-auto w-full justify-start py-4"
						onClick={handleWalletAuth}
					>
						<Wallet className="mr-2 h-5 w-5 text-orange-500" />
						<div className="flex flex-col items-start">
							<span>Authenticate with Wallet</span>
							<span className="text-xs text-muted-foreground">
								{state.wallet
									? `Connected: ${state.wallet.address.slice(0, 6)}...${state.wallet.address.slice(-4)}`
									: 'Connect using your Mina wallet'}
							</span>
						</div>
					</Button>

					<Button
						variant="outline"
						className="h-auto w-full justify-start py-4"
						disabled
					>
						<ChatBubbleIcon className="mr-2 h-5 w-5 text-[#0088cc]" />
						<div className="flex flex-col items-start">
							<span>Authenticate with Telegram</span>
							<span className="text-xs text-muted-foreground">Coming soon</span>
						</div>
					</Button>
				</div>

				<Alert>
					<AlertDescription>
						Choose your preferred authentication method. You&rsquo;ll be able to
						link multiple methods later.
					</AlertDescription>
				</Alert>

				<DiscordAuthDialog
					open={showDiscordDialog}
					onOpenChange={setShowDiscordDialog}
				/>

				<WalletConnectorDialog
					open={showWalletConnector}
					onOpenChange={setShowWalletConnector}
				/>

				<WalletAuthDialog
					open={showWalletDialog}
					onOpenChange={setShowWalletDialog}
					onSuccess={handleWalletAuthSuccess}
				/>
			</CardContent>
		</Card>
	)
}

function TokenAuthContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { refresh } = useAuth()
	const token = searchParams?.get('token')
	const from = searchParams?.get('from') || '/'
	const message = searchParams?.get('message')
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<boolean>(false)
	const [isLoading, setIsLoading] = useState(false)

	useEffect(() => {
		if (!token) {
			if (message) {
				setError(message)
			}
			return
		}

		async function authenticate() {
			setIsLoading(true)
			setError(null)
			try {
				const res = await fetch('/api/auth/exchange', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ initialToken: token }),
					credentials: 'include',
				})

				if (!res.ok) {
					const data = await res.json()
					throw new Error(data.error || 'Authentication failed')
				}

				await refresh()

				setSuccess(true)
				// Small delay to show success message
				setTimeout(() => {
					router.push(from)
				}, 1000)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Authentication failed')
			} finally {
				setIsLoading(false)
			}
		}

		authenticate()
	}, [token, from, router, message, refresh])

	if (isLoading) {
		return (
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Authentication</CardTitle>
					<CardDescription>
						Please wait while we authenticate your session...
					</CardDescription>
				</CardHeader>
				<CardContent className="flex justify-center p-4">
					<Loader2 className="h-6 w-6 animate-spin" />
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Authentication Error</CardTitle>
					<CardDescription>Unable to complete authentication</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		)
	}

	if (success) {
		return (
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Authentication Successful</CardTitle>
					<CardDescription>
						Redirecting you to your destination...
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert
						variant="default"
						className="border-green-200 bg-green-50 text-green-800"
					>
						<CheckCircle2 className="h-4 w-4 text-green-600" />
						<AlertTitle>Success!</AlertTitle>
						<AlertDescription className="text-green-700">
							Authentication completed successfully.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		)
	}

	return null
}

export default function AuthPage() {
	const { user, isLoading } = useAuth()
	const router = useRouter()
	const searchParams = useSearchParams()
	const token = searchParams?.get('token')

	useEffect(() => {
		let mounted = true

		const redirect = () => {
			if (mounted && !isLoading && user && !token) {
				router.push('/')
			}
		}

		redirect()

		return () => {
			mounted = false
		}
	}, [user, isLoading, router, token])

	if (isLoading) {
		return (
			<div className="flex min-h-[calc(100vh-56px)] items-center justify-center py-8">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Loading...</CardTitle>
						<CardDescription>Please wait</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center p-4">
						<Loader2 className="h-6 w-6 animate-spin" />
					</CardContent>
				</Card>
			</div>
		)
	}

	if (user && !token) {
		return null // Will redirect in useEffect
	}

	return (
		<div className="flex min-h-[calc(100vh-56px)] items-center justify-center py-8">
			{token ? <TokenAuthContent /> : <AuthenticationOptions />}
		</div>
	)
}
