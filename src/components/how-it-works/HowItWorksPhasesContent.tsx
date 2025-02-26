import React from 'react'

export function HowItWorksPhasesContent() {
	return (
		<div className="mx-auto divide-y divide-muted">
			<Section title="1. Proposal Submission">
				<p className="mb-2">
					Community members propose projects they believe deserve funding by
					submitting detailed proposals that outline their impact and
					requirements. Submissions should present a well-developed idea, backed
					by a capable team ready to execute it effectively. Proposals should
					focus on projects and teams delivering ongoing services that support
					and enhance the Mina ecosystem.
				</p>
				<h3 className="mt-4 text-lg font-semibold">
					A great proposal should have:
				</h3>
				<ul className="mt-2 list-inside list-disc space-y-1">
					<li>
						Proposal Summary: Provide a concise description of the project, its
						goals, and its importance (2-3 sentences).
					</li>
					<li>Key Objectives: List the specific goals you aim to achieve.</li>
					<li>Problem Statement: What is the problem / Why does it matters.</li>
					<li>Proposed Solution: What will you do / How will it works.</li>
					<li>Expected Impact: Community benefits / KPI's.</li>
					<li>Budget Request: Total funding required / Costs breakdown.</li>
					<li>
						Milestones and Timeline: Key Milestones / Estimated completion date.
					</li>
					<li>Team Information: Team members and Relevant experience.</li>
					<li>Risks and Mitigation: Potentatial risks and mitiation plans.</li>
					<li>
						About the Submitter: Contact info and relevant links about previous
						projects.
					</li>
				</ul>
				<p className="mt-2">
					Once a proposal draft is finalized, it can be submitted to an open
					funding round. The submitter is responsible for promoting their
					proposal within the Mina ecosystem to garner support and visibility.
				</p>
			</Section>

			<Section title="2. Proposal Consideration">
				<p>
					During this phase, all submitted proposals will undergo evaluation by
					two decision-making groups. To ensure a fair and thorough assessment,
					dedicated reviewer roles will be randomly assigned, focusing on
					identifying potential risks and benefits. However, if the community
					disagrees with a reviewer’s decision, they have the power to override
					it through an on-chain vote.
				</p>
				<p>
					<span className="mt-4 font-semibold">Reviewers: </span>
					Responsible for evaluating proposals and determining whether they
					should be approved or rejected based on a comprehensive review.
				</p>
				<p>
					<span className="mt-4 font-semibold">Community Members: </span>
					Empowered to advance proposals rejected by reviewers through an
					on-chain vote, ensuring community-driven decision-making.
				</p>
				<p>
					Proposals rejected in this phase will be removed from the funding
					round.
				</p>
			</Section>

			<Section title="3. Proposal Deliberation">
				<p>
					During this phase, reviewers and community members will engage in open
					dialogue to evaluate each proposal, discussing its merits, potential
					risks, and benefits. This collaborative exchange ensures that diverse
					perspectives are thoroughly considered.
				</p>
				<p>
					Reviewers will provide a recommendation for each proposal. To enhance
					clarity and organization, ChatGPT will be used to summarize and
					categorize the community deliberations, resulting in a comprehensive
					final report for each proposal.
				</p>
			</Section>

			<Section title="4. Proposal Voting">
				<p>
					During this phase, all community members are invited to vote for their
					preferred proposals. The voting will follow a ranked-choice system,
					allowing participants to support multiple proposals (up to 8) in order
					of preference with a single transaction.
				</p>
			</Section>

			<Section title="5. Funds Allocation">
				<p>
					In this final phase, funds will be automatically distributed to the
					top-ranked proposals based on the available budget. If the
					highest-ranked proposals exceed the available funds, they will be
					placed on hold until additional funding becomes available.
				</p>
			</Section>
		</div>
	)
}

function Section({
	title,
	children,
}: {
	title: string
	children: React.ReactNode
}) {
	return (
		<div className="space-y-4 py-6 first:pt-0">
			<h2 className="mb-2 text-2xl font-semibold">{title}</h2>
			{children}
		</div>
	)
}
