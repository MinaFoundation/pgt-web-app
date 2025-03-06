export default function FundingRoundDashboardSkeleton() {
	return (
		<div className="container mx-auto max-w-7xl px-2 lg:px-6">
			<div className="space-y-8">
				<div className="space-y-4">
					<div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
					<div className="h-20 w-96 max-w-full animate-pulse rounded bg-muted md:h-12" />
					<div className="h-6 w-48 animate-pulse rounded bg-muted" />
				</div>

				{/* Status Overview */}
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					{new Array(4).fill('').map((_, index) => (
						<div
							key={index}
							className="animate h-20 animate-pulse rounded-md bg-muted p-2 md:p-4"
						/>
					))}
				</div>

				{/* Main Content */}
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px,1fr]">
					{/* Phase Progress */}
					<div className="space-y-4">
						{new Array(5).fill('').map((_, index) => (
							<div
								key={index}
								className="h-12 rounded-md bg-muted font-medium"
							/>
						))}
					</div>

					{/* Content Area */}
					<div className="space-y-4">
						<div className="h-10 w-32 animate-pulse rounded bg-muted" />
						<div className="h-6 w-48 animate-pulse rounded bg-muted" />
						{new Array(2).fill('').map((_, index) => (
							<div
								key={index}
								className="h-24 w-full animate-pulse rounded bg-muted"
							/>
						))}
					</div>
				</div>

				{/* Help Link */}
				<div className="flex justify-end">
					<div className="h-6 w-32 animate-pulse rounded bg-muted" />
				</div>
			</div>
		</div>
	)
}
