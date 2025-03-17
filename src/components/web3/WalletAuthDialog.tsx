'use client'

import { useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/contexts/WalletContext'
import { useToast } from '@/hooks/use-toast'
import {
	WALLET_MESSAGE_VERSIONS,
	LATEST_WALLET_MESSAGE_VERSION,
} from '@/constants/wallet-messages'
import { Icons } from '@/components/icons'
import { ApiResponse } from '@/lib/api-response'
import { AppError } from '@/lib/errors'
import { HTTPStatus } from '@/constants/errors'
import { useAuth } from '@/contexts/AuthContext'

interface WalletAuthDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

interface LinkingDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	walletToken: string
	existingToken: string
	onConfirm: () => void
	onCancel: () => void
}

function LinkingDialog({
	open,
	onOpenChange,
	walletToken,
	existingToken,
	onConfirm,
	onCancel,
}: LinkingDialogProps) {
	const [isLinking, setIsLinking] = useState(false)
	const { toast } = useToast()
	const { refresh } = useAuth()

	const handleConfirm = async () => {
		setIsLinking(true)
		try {
			const response = await fetch('/api/auth/wallet/link', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					walletToken,
					existingToken,
				}),
			})

			if (!response.ok) {
				const errorMessage = ApiResponse.Response.errorMessageFromResponse(
					await response.json(),
					'Failed to link accounts',
				)
				throw new AppError(errorMessage, HTTPStatus.BAD_REQUEST)
			}

			onConfirm()
		} catch (error: unknown) {
			const errorMessage = ApiResponse.Response.errorMessageFromError(
				error,
				'Failed to link accounts',
			)
			toast({
				title: 'Failed to link accounts',
				description: errorMessage,
				variant: 'destructive',
			})
		} finally {
			setIsLinking(false)
			onOpenChange(false)
			await refresh()
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Link Your Accounts</DialogTitle>
					<DialogDescription>
						Would you like to link your wallet account with your existing
						account? This will allow you to use both authentication methods.
					</DialogDescription>
				</DialogHeader>
				<div className="flex justify-end space-x-2">
					<Button variant="outline" onClick={onCancel} disabled={isLinking}>
						No, Keep Separate
					</Button>
					<Button onClick={handleConfirm} disabled={isLinking}>
						{isLinking ? (
							<>
								<Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
								Linking...
							</>
						) : (
							'Yes, Link Accounts'
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}

export function WalletAuthDialog({
	open,
	onOpenChange,
}: WalletAuthDialogProps) {
	const { state } = useWallet()
	const { toast } = useToast()
	const { refresh } = useAuth()
	const [isAuthenticating, setIsAuthenticating] = useState(false)
	const [showLinkingDialog, setShowLinkingDialog] = useState(false)
	const [authTokens, setAuthTokens] = useState<{
		walletToken: string
		existingToken: string
	} | null>(null)

	const handleAuthenticate = async () => {
		if (!state.wallet?.address || !window.mina) {
			toast({
				title: 'Error',
				description: 'Wallet not connected',
				variant: 'destructive',
			})
			return
		}

		try {
			setIsAuthenticating(true)

			// 1. Generate message
			const timestamp = new Date().toISOString()
			const message = WALLET_MESSAGE_VERSIONS[
				LATEST_WALLET_MESSAGE_VERSION
			].generateMessage(state.wallet.address, timestamp)

			// 2. Request signature using signMessage
			const signatureResponse = await window.mina.signMessage({
				message: message,
			})

			// 3. Send to server
			const response = await fetch('/api/auth/wallet', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message,
					signature: signatureResponse.signature,
					publicKey: signatureResponse.publicKey,
					timestamp,
					version: LATEST_WALLET_MESSAGE_VERSION,
				}),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || 'Authentication failed')
			}

			// Handle account linking if possible
			if (data.canLink && data.accessToken && data.existingToken) {
				setAuthTokens({
					walletToken: data.accessToken,
					existingToken: data.existingToken,
				})
				setShowLinkingDialog(true)
			} else {
				toast({
					title: 'Successfully authenticated',
					description:
						'You are now logged in with your wallet. Redirecting you to your destination...',
				})
				onOpenChange(false)
			}
		} catch (error) {
			toast({
				title: 'Authentication failed',
				description:
					error instanceof Error ? error.message : 'Please try again',
				variant: 'destructive',
			})
		} finally {
			setIsAuthenticating(false)
			await refresh()
		}
	}

	return (
		<>
			<Dialog open={open && !showLinkingDialog} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Authenticate with Wallet</DialogTitle>
						<DialogDescription>
							Would you like to authenticate with your connected wallet? This
							will allow you to interact with the platform.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end space-x-2">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isAuthenticating}
						>
							Cancel
						</Button>
						<Button onClick={handleAuthenticate} disabled={isAuthenticating}>
							{isAuthenticating ? (
								<>
									<Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
									Authenticating...
								</>
							) : (
								'Continue'
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{authTokens && (
				<LinkingDialog
					open={showLinkingDialog}
					onOpenChange={setShowLinkingDialog}
					walletToken={authTokens.walletToken}
					existingToken={authTokens.existingToken}
					onConfirm={async () => {
						toast({
							title: 'Accounts linked',
							description: 'Your accounts have been successfully linked',
						})
						onOpenChange(false)
					}}
					onCancel={() => {
						setShowLinkingDialog(false)
						onOpenChange(false)
					}}
				/>
			)}
		</>
	)
}
