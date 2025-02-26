import { FC } from 'react'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'

export interface FAQItem {
	question: string
	answer: string
}

export interface FAQSection {
	title: string
	items: FAQItem[]
}

interface FAQProps {
	sections: FAQSection[]
}

export const FAQ: FC<FAQProps> = ({ sections }) => {
	return (
		<Accordion type="single" collapsible className="w-full">
			{sections.map((section, sectionIndex) => (
				<AccordionItem key={sectionIndex} value={`item-${sectionIndex}`}>
					<AccordionTrigger className="text-left text-xl font-semibold text-dark hover:text-primary md:text-2xl">
						{section.title}
					</AccordionTrigger>
					<AccordionContent>
						<ul className="divide-y divide-muted text-dark">
							{section.items.map((item, itemIndex) => (
								<li key={itemIndex} className="list-disc p-4">
									<h4 className="text-lg font-semibold text-muted-foreground md:text-xl">
										{item.question}
									</h4>
									<p>{item.answer}</p>
								</li>
							))}
						</ul>
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	)
}
