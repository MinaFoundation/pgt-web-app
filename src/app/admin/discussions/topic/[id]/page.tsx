import { AddEditDiscussionTopicComponent } from '@/components/CreateUpdateDiscussionTopic'
import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Manage Discussion Topic | MEF Admin',
	description: 'Create or edit discussion topics',
}

interface PageProps {
	params: Promise<{
		id: string
	}>
}

export default async function ManageDiscussionTopicPage({ params }: PageProps) {
	return (
		<div className="mx-auto w-full max-w-5xl p-4 sm:px-6 lg:px-8">
			<AddEditDiscussionTopicComponent
				topicId={(await params).id === 'new' ? null : (await params).id}
			/>
		</div>
	)
}
