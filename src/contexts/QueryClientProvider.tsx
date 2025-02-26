'use client'

import { ReactNode } from 'react'
import {
	MutationCache,
	QueryCache,
	QueryClient,
	QueryClientProvider as TanStackQueryClientProvider,
} from '@tanstack/react-query'
import { toast } from '@/hooks'

const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: error =>
			toast({
				title: 'Error',
				description: error.message,
				variant: 'destructive',
			}),
	}),
	mutationCache: new MutationCache({
		onError: error =>
			toast({
				title: 'Error',
				description: error.message,
				variant: 'destructive',
			}),
	}),
})

export function QueryClientProvider({ children }: { children: ReactNode }) {
	return (
		<TanStackQueryClientProvider client={queryClient}>
			{children}
		</TanStackQueryClientProvider>
	)
}
