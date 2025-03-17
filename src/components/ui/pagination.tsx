import * as React from 'react'
import { cn } from '@/lib/utils'
import { ButtonProps, buttonVariants } from '@/components/ui/button'
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	DotsHorizontalIcon,
} from '@radix-ui/react-icons'

const Pagination = ({
	totalPages,
	currentPage,
	onPageChange,
	className,
	...props
}: {
	totalPages: number
	currentPage: number
	onPageChange: (page: number) => void
} & React.ComponentProps<'nav'>) => {
	const getPaginationItems = () => {
		const pages = []
		const maxVisiblePages = 5

		if (totalPages <= maxVisiblePages) {
			return Array.from({ length: totalPages }, (_, i) => i + 1)
		}

		pages.push(1)
		if (currentPage > 3) {
			pages.push('...')
		}

		const start = Math.max(2, currentPage - 1)
		const end = Math.min(totalPages - 1, currentPage + 1)
		for (let i = start; i <= end; i++) {
			pages.push(i)
		}

		if (currentPage < totalPages - 2) {
			pages.push('...')
		}

		pages.push(totalPages)
		return pages
	}

	return (
		<nav
			role="navigation"
			aria-label="pagination"
			className={cn('mx-auto flex w-full justify-center', className)}
			{...props}
		>
			<ul className="flex flex-row items-center gap-1">
				<li>
					<PaginationPrevious
						onClick={() => onPageChange(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
					/>
				</li>
				{getPaginationItems().map((page, index) => (
					<li key={index}>
						{page === '...' ? (
							<PaginationEllipsis />
						) : (
							<PaginationLink
								onClick={() => onPageChange(page as number)}
								isActive={currentPage === page}
							>
								{page}
							</PaginationLink>
						)}
					</li>
				))}
				<li>
					<PaginationNext
						onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
					/>
				</li>
			</ul>
		</nav>
	)
}
Pagination.displayName = 'Pagination'

const PaginationContent = React.forwardRef<
	HTMLUListElement,
	React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => (
	<ul
		ref={ref}
		className={cn('flex flex-row items-center gap-1', className)}
		{...props}
	/>
))
PaginationContent.displayName = 'PaginationContent'

const PaginationItem = React.forwardRef<
	HTMLLIElement,
	React.ComponentProps<'li'>
>(({ className, ...props }, ref) => (
	<li ref={ref} className={cn('', className)} {...props} />
))
PaginationItem.displayName = 'PaginationItem'

type PaginationLinkProps = {
	isActive?: boolean
} & Pick<ButtonProps, 'size'> &
	React.ComponentProps<'a'>

const PaginationLink = ({
	className,
	isActive,
	size = 'icon',
	...props
}: {
	isActive?: boolean
} & Pick<ButtonProps, 'size'> &
	React.ComponentProps<'a'>) => (
	<a
		aria-current={isActive ? 'page' : undefined}
		className={cn(
			buttonVariants({
				variant: isActive ? 'outline' : 'ghost',
				size,
			}),
			className,
		)}
		{...props}
	/>
)
PaginationLink.displayName = 'PaginationLink'

const PaginationPrevious = ({
	className,
	disabled,
	...props
}: React.ComponentProps<typeof PaginationLink> & { disabled?: boolean }) => (
	<PaginationLink
		aria-label="Go to previous page"
		size="default"
		className={cn(
			'gap-1 pl-2.5',
			disabled && 'pointer-events-none opacity-50',
			className,
		)}
		aria-disabled={disabled}
		tabIndex={disabled ? -1 : undefined}
		{...props}
	>
		<ChevronLeftIcon className="h-4 w-4" />
		<span>Previous</span>
	</PaginationLink>
)
PaginationPrevious.displayName = 'PaginationPrevious'

const PaginationNext = ({
	className,
	disabled,
	...props
}: React.ComponentProps<typeof PaginationLink> & { disabled?: boolean }) => (
	<PaginationLink
		aria-label="Go to next page"
		size="default"
		className={cn(
			'gap-1 pr-2.5',
			disabled && 'pointer-events-none opacity-50',
			className,
		)}
		aria-disabled={disabled}
		tabIndex={disabled ? -1 : undefined}
		{...props}
	>
		<span>Next</span>
		<ChevronRightIcon className="h-4 w-4" />
	</PaginationLink>
)
PaginationNext.displayName = 'PaginationNext'

const PaginationEllipsis = ({
	className,
	...props
}: React.ComponentProps<'span'>) => (
	<span
		aria-hidden
		className={cn('flex h-9 w-9 items-center justify-center', className)}
		{...props}
	>
		<DotsHorizontalIcon className="h-4 w-4" />
		<span className="sr-only">More pages</span>
	</span>
)
PaginationEllipsis.displayName = 'PaginationEllipsis'

export {
	Pagination,
	PaginationContent,
	PaginationLink,
	PaginationItem,
	PaginationPrevious,
	PaginationNext,
	PaginationEllipsis,
}
