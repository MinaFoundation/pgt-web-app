import Image from 'next/image'
import MinaFoundationImage from '@/images/mina-foundation-1564x1043.jpg'
import { Button } from '@/components/ui/button'
import { MoveRightIcon } from 'lucide-react'
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'About Us | MEF',
	description: 'About Mina Protocol and Mina Ecosystem Fund',
}

const blogPosts: {
	title: string
	description: string
	author: string
	tag: string
	date: string
	link: string
}[] = [
	{
		title: 'Results and learnings from the first MEF tests',
		description:
			'The first MEF tests have been completed and we have some results and learnings to share with the community.',
		tag: 'ANNOUNCEMENT',
		author: 'MINA PROTOCOL GOVERNANCE',
		date: '2021-09-01',
		link: 'https://minaprotocol.com/blog/results-and-learnings-from-the-first-mef-tests',
	},
	{
		title: 'A new funding process for Mina’s ecosystem',
		description:
			'This blogpost explores MEF process to support longer-term, decentralized and sustainable funding for teams providing ongoing services to Mina Protocol.',
		tag: 'COMMUNITY',
		author: 'MINA PROTOCOL GOVERNANCE',
		date: '2021-08-31',
		link: 'https://blog.minaprotocol.com/a-new-funding-process-for-minas-ecosystem',
	},
]

export default function AboutUsPage() {
	return (
		<div className="container mx-auto min-h-[calc(100vh-4rem)] max-w-5xl space-y-16 px-4 py-8">
			<AboutUsSection />

			<MinaFoundationSection />

			<BlogSection />
		</div>
	)
}

function AboutUsSection() {
	return (
		<section className="space-y-4">
			<h1 className="text-4xl font-bold">About Us</h1>
			<p>
				Mina Protocol has a wide set of public goods contributors, including
				Mina Foundation and o1labs, as well as an increasing number of other
				contributors. MEF aims to ensure that there will be sustainable
				development for these teams producing public goods for the protocol, to
				ensure the protocol can continue to fund its maintenance and growth.
				Mina Foundation will initially fund MEF.
			</p>
		</section>
	)
}

function MinaFoundationSection() {
	return (
		<section>
			<div className="space-y-4">
				<h2 className="text-3xl font-bold">Mina Foundation</h2>
				<div className="flex flex-col justify-between gap-6 lg:flex-row">
					<div className="space-y-4">
						<p>
							Mina Foundation, a Switzerland-based nonprofit foundation
							(Stiftung), champions a future powered by participants via
							accessible, secure, and decentralized blockchain infrastructure
							that will underpin our future online interactions. We strive to
							create the conditions for Mina Protocol to thrive by empowering
							the use of zero-knowledge proofs, while also monitoring network
							health, administering grants for community contributions, and
							fostering ecosystem growth and awareness through ongoing
							innovation.
						</p>
						<p>
							To know more about Mina Foundation visit:{' '}
							<a
								href="https://www.minafoundation.com/#about-us"
								target="_blank"
								className="text-dark underline"
							>
								https://www.minafoundation.com/#about-us
							</a>
						</p>
					</div>
					<Image
						src={MinaFoundationImage}
						width={1564}
						height={1043}
						alt="Mina Foundation"
						quality={100}
						className="mx-auto h-auto w-[460px] rounded-lg"
					/>
				</div>
			</div>
		</section>
	)
}

function BlogSection() {
	return (
		<section className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold">Blog</h2>
				<p>
					To know more about how MEF started please check the Mina Protocol Blog
					section
				</p>
			</div>
			<div className="grid grid-cols-1 gap-y-8 lg:grid-cols-2 lg:gap-x-16">
				{blogPosts.map(post => (
					<Card
						key={post.title}
						className="flex flex-col justify-between rounded-lg rounded-t-none border border-x-0 border-b-0 border-t border-dark bg-white shadow-none"
					>
						<CardHeader className="p-2">
							<p className="text-xs font-semibold text-muted-foreground">
								{post.tag} / {post.date} / {post.author}
							</p>
							<CardTitle className="text-3xl font-bold">{post.title}</CardTitle>
							<CardDescription className="text-base">
								{post.description}
							</CardDescription>
						</CardHeader>
						<CardFooter className="flex justify-end p-2">
							<a href={post.link} target="_blank" className="text-blue-500">
								<Button className="button-3d bg-dark hover:bg-dark/90">
									Read More <MoveRightIcon className="h-5 w-5" />
								</Button>
							</a>
						</CardFooter>
					</Card>
				))}
			</div>
		</section>
	)
}
