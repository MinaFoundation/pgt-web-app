'use client'

import {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
	useCallback,
} from 'react'
import { useToast } from '@/hooks/use-toast'
import type {
	AuroWallet,
	WalletContextType,
	WalletProvider,
	WalletState,
	NetworkID,
	WalletEventType,
	NetworkInfo,
} from '@/types/wallet'
import { WalletAuthDialog } from '@/components/web3/WalletAuthDialog'

// Define target network - can be toggled between 'mainnet', 'devnet' and 'testnet'
export const TARGET_NETWORK: NetworkID = 'devnet'

const initialState: WalletState = {
	status: 'disconnected',
	wallet: null,
	error: null,
	lastConnected: null,
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Define type for window.mina
declare global {
	interface Window {
		mina?: AuroWallet
	}
}

export function WalletProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<WalletState>(initialState)
	const [showAuthDialog, setShowAuthDialog] = useState(false)
	const { toast } = useToast()

	// Add network switching functionality
	const switchNetwork = useCallback(
		async (targetNetwork: NetworkID) => {
			if (!window.mina?.switchChain) {
				throw new Error('Network switching not supported')
			}

			try {
				// First check current network
				const currentNetwork = await window.mina.requestNetwork?.()
				if (currentNetwork?.networkID === `mina:${targetNetwork}`) {
					// Already on correct network, no need to switch
					return true
				}

				// Need to switch networks
				const result = await window.mina.switchChain({
					networkID: `mina:${targetNetwork}`,
				})

				// Only show toast if we actually switched networks
				toast({
					title: '🔄 Network Switched',
					description: `Successfully switched to ${targetNetwork}`,
				})
				return true
			} catch (error) {
				console.error('Network switch error:', error)
				const errorMessage =
					error instanceof Error ? error.message : 'Failed to switch network'
				toast({
					title: '❌ Network Switch Failed',
					description: errorMessage,
					variant: 'destructive',
				})
				return false
			}
		},
		[toast],
	)

	// Check and enforce target network
	const enforceTargetNetwork = useCallback(async () => {
		if (!window.mina?.requestNetwork || !state.wallet) return false

		try {
			const network = await window.mina.requestNetwork()
			if (network.networkID !== TARGET_NETWORK) {
				return await switchNetwork(TARGET_NETWORK)
			}
			return true // Already on correct network
		} catch (error) {
			console.error('Network check error:', error)
			return false
		}
	}, [state.wallet, switchNetwork])

	const connect = async (provider: WalletProvider) => {
		try {
			setState(prev => ({ ...prev, status: 'connecting' }))

			if (provider === 'auro') {
				if (!window.mina) {
					throw new Error('Auro wallet is not installed')
				}

				const accounts = await window.mina.requestAccounts()

				if (!accounts[0]) {
					throw new Error('No accounts found')
				}

				const network = await window.mina.requestNetwork?.().catch(() => null)

				// Check if we need to switch networks
				if (network?.networkID !== TARGET_NETWORK) {
					await switchNetwork(TARGET_NETWORK)
				}

				setState({
					status: 'connected',
					wallet: {
						address: accounts[0],
						provider: 'auro',
						publicKey: accounts[0],
						network: network?.networkID || null,
					},
					error: null,
					lastConnected: new Date(),
				})

				toast({
					title: '✅ Wallet Connected',
					description: `Successfully connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
				})

				// Trigger auth dialog only on successful fresh connections
				setShowAuthDialog(true)
			} else {
				throw new Error('Provider not supported yet')
			}
		} catch (error) {
			console.error('Wallet connection error:', error)

			let errorMessage = 'Failed to connect wallet'
			if (error && typeof error === 'object' && 'code' in error) {
				switch ((error as { code: number }).code) {
					case 1002:
						errorMessage = 'Connection request was rejected'
						break
					case 20001:
						errorMessage = 'No account found in wallet'
						break
					case 23001:
						errorMessage = 'Origin mismatch - security error'
						break
					default:
						errorMessage =
							error instanceof Error
								? error.message
								: 'Failed to connect wallet'
				}
			}

			setState(prev => ({
				...prev,
				status: 'error',
				error: errorMessage,
			}))

			toast({
				title: '❌ Connection Failed',
				description: errorMessage,
				variant: 'destructive',
			})
		}
	}

	const disconnect = useCallback(async () => {
		try {
			// Clear the connection in Auro wallet
			if (window.mina?.getAccounts) {
				// Remove the dApp from connected sites
				const accounts = await window.mina.getAccounts()
				if (accounts && accounts.length > 0) {
					// Trigger a disconnect event by updating state
					setState(initialState)

					// Force a refresh of the accounts
					if (window.mina.on) {
						window.mina.on('accountsChanged', () => {})
					}
				}
			}

			// Reset local state
			setState(initialState)

			toast({
				title: '👋 Wallet Disconnected',
				description:
					'To make your wallet disconnection permanent, please disconnect directly from the wallet extension.',
			})
		} catch (error) {
			console.error('Disconnect error:', error)
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to disconnect wallet'
			toast({
				title: '❌ Disconnect Failed',
				description: errorMessage,
				variant: 'destructive',
			})
		}
	}, [toast])

	useEffect(() => {
		const checkConnection = async () => {
			if (window.mina) {
				try {
					const accounts = (await window.mina.getAccounts?.()) || []
					if (accounts[0]) {
						const network = await window.mina
							.requestNetwork?.()
							.catch(() => null)
						setState({
							status: 'connected',
							wallet: {
								address: accounts[0],
								provider: 'auro',
								publicKey: accounts[0],
								network: network?.networkID || null,
							},
							error: null,
							lastConnected: new Date(),
						})
					}
				} catch (error) {
					console.error('Failed to restore wallet connection:', error)
				}
			}
		}

		checkConnection()
	}, [])

	useEffect(() => {
		const mina = window.mina
		if (!mina) return

		const handleAccountsChanged = (accounts: string[]) => {
			if (!accounts[0]) {
				disconnect()
			} else if (state.wallet?.address !== accounts[0]) {
				setState(prev => ({
					...prev,
					wallet: prev.wallet
						? {
								...prev.wallet,
								address: accounts[0],
								publicKey: accounts[0],
							}
						: null,
				}))
			}
		}

		if (mina.on) {
			mina.on('accountsChanged', handleAccountsChanged)
		}

		return () => {
			if (mina.removeListener) {
				mina.removeListener('accountsChanged', handleAccountsChanged)
			}
		}
	}, [state.wallet?.address, disconnect])

	// Monitor network changes
	useEffect(() => {
		const mina = window.mina
		if (!mina?.on) return

		const handleNetworkChange = (networkInfo: NetworkInfo) => {
			const networkId = networkInfo.networkID

			// Update state with new network
			setState(prev => ({
				...prev,
				wallet: prev.wallet
					? {
							...prev.wallet,
							network: networkId,
						}
					: null,
			}))

			// If network changed to something other than target, switch back
			if (networkId !== TARGET_NETWORK) {
				void enforceTargetNetwork()
			}
		}

		mina.on('chainChanged', handleNetworkChange)

		return () => {
			if (mina.removeListener) {
				mina.removeListener('chainChanged', handleNetworkChange)
			}
		}
	}, [enforceTargetNetwork])

	return (
		<WalletContext.Provider
			value={{
				state,
				connect,
				disconnect,
				isConnected: state.status === 'connected',
				switchNetwork, // Export the network switching functionality
				enforceTargetNetwork, // Export network enforcement
			}}
		>
			{children}
			<WalletAuthDialog
				open={showAuthDialog}
				onOpenChange={setShowAuthDialog}
				onSuccess={undefined}
			/>
		</WalletContext.Provider>
	)
}

export function useWallet() {
	const context = useContext(WalletContext)
	if (context === undefined) {
		throw new Error('useWallet must be used within a WalletProvider')
	}
	return context
}
