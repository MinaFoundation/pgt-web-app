import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Funding Rounds',
}

export default function FundingRoundsLayout({
	children,
}: {
	children: ReactNode
}) {
	return (
		<div className="animate-fade-in mx-auto w-full max-w-7xl p-4 sm:px-6 lg:px-8">
			<div className="container">{children}</div>
		</div>
	)
}
