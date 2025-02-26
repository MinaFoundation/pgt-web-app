import { Metadata } from 'next'
import { FundingRound } from '@/types/funding-round'
import prisma from '@/lib/prisma'
import { FundingRoundService } from '@/services'
import { Button } from '@/components/ui/button'
import { ProcessVisualization } from '@/components/how-it-works/ProcessVisualization'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { ArrowRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FAQ } from '@/components/how-it-works/FAQ'
import { faqData } from '@/data/faq'
import Link from 'next/link'
import { HowItWorksPhasesContent } from '@/components/how-it-works/HowItWorksPhasesContent'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
	title: 'How it Works - MINA Ecosystem Funding',
	description:
		'Learn about the MINA Ecosystem Funding proposal process and get started with your proposal journey.',
}

const getLastFundingRound = async (): Promise<FundingRound | null> => {
	const fundingRoundService = new FundingRoundService(prisma)
	return await fundingRoundService.getLastPublicFundingRound()
}

export default function HowItWorksPage() {
	return (
		<div className="container mx-auto min-h-[calc(100vh-4rem)] max-w-5xl space-y-12 px-4 py-8">
			<Phases />
			<Suspense fallback={<ActionCardsSkeleton />}>
				<ActionCards />
			</Suspense>
			<Faq />
		</div>
	)
}

function Phases() {
	return (
		<article className="space-y-6">
			{/* Header Section */}
			<section className="space-y-4 border-b border-muted pb-6">
				<h1 className="text-3xl font-bold">How it works</h1>
				<p>
					MEF is a community-led funding process that empowers community members
					to collectively decide how resources are allocated. This inclusive and
					transparent approach ensures that funding reflects the community's
					priorities and values.
				</p>
				<p>
					The Mina foundation & funding rounds moderators will provide the
					rounds schedule. Once a round is open anyone can participate. The
					Funding round process follows these key Phases:
				</p>
			</section>

			{/* Phases Content */}
			<HowItWorksPhasesContent />

			{/* Process Visualization */}
			<div className="rounded-xl border bg-card p-8 shadow-sm">
				<ProcessVisualization />
			</div>
		</article>
	)
}

function Faq() {
	return (
		<div className="mt-16">
			<div className="mb-6 space-y-2">
				<h2 className="text-4xl font-bold tracking-tight">
					Frequently asked questions
				</h2>
				<p className="max-w-2xl text-lg text-muted-foreground">
					Quick answers to common questions about the proposal process.
				</p>
			</div>
			<FAQ sections={faqData} />
		</div>
	)
}

async function ActionCards() {
	const lastFundingRound = await getLastFundingRound()

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
			<Card className="transition-all duration-200 hover:shadow-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<span className="text-lg">📝</span> Create a Proposal
					</CardTitle>
					<CardDescription>
						Start your journey by creating a new proposal for the MINA ecosystem
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Link href="/proposals/create">
						<Button className="w-full">
							Create Proposal <ArrowRightIcon className="ml-2 h-4 w-4" />
						</Button>
					</Link>
				</CardContent>
			</Card>

			{lastFundingRound ? (
				<>
					<Card className={cn('transition-all duration-200 hover:shadow-md')}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<span className="text-lg">🔍</span> Check Proposals
							</CardTitle>
							<CardDescription>
								View and review submitted proposals in the current funding round
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href={`/funding-rounds/${lastFundingRound.id}`}>
								<Button variant="secondary" className="w-full">
									View Proposals <ArrowRightIcon className="ml-2 h-4 w-4" />
								</Button>
							</Link>
						</CardContent>
					</Card>

					<Card className="transition-all duration-200 hover:shadow-md">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<span className="text-lg">📊</span> Phase Summary
							</CardTitle>
							<CardDescription>
								Get a detailed overview of the current phase and its progress
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href={`/funding-rounds/${lastFundingRound.id}/summaries`}>
								<Button variant="outline" className="w-full">
									View Summary <ArrowRightIcon className="ml-2 h-4 w-4" />
								</Button>
							</Link>
						</CardContent>
					</Card>
				</>
			) : (
				<Card className="transition-all duration-200 hover:shadow-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<span className="text-lg">📊</span> Phases Summaries
						</CardTitle>
						<CardDescription>
							Get a detailed overview of the past funding rounds and their
							progress
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Link href="/funding-rounds?tab=summary">
							<Button variant="outline" className="w-full" disabled>
								Summaries
							</Button>
						</Link>
					</CardContent>
				</Card>
			)}
		</div>
	)
}

async function ActionCardsSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
			{new Array(3).fill(null).map((_, index) => (
				<Card className="animate-pulse" key={index}>
					<CardHeader>
						<CardTitle className="flex h-8 w-full items-center gap-2 rounded-md bg-muted" />
						<CardDescription className="h-10 w-full rounded-md bg-muted" />
					</CardHeader>
					<CardContent>
						<div className="h-10 w-full rounded-md bg-muted" />
					</CardContent>
				</Card>
			))}
		</div>
	)
}
