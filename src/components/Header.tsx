'use client'

import Link from 'next/link'
import { MenuIcon, Settings, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAdminStatus } from '@/hooks/use-admin-status'
import { useAuth } from '@/contexts/AuthContext'
import { UserStatus } from './auth/UserStatus'
import { useState, useEffect } from 'react'

export default function Header() {
	const pathname = usePathname()

	const navigation = [
		{ label: 'Get Involved', href: '/' },
		{ label: 'How it Works', href: '/how-it-works' },
		{
			label: 'Funding Rounds',
			href: '/funding-rounds',
			authenticatedOnly: true,
		},
		{ label: 'Proposals', href: '/proposals', authenticatedOnly: true },
		{ label: 'About Us', href: '/about-us' },
	]

	const [openMobileNav, setOpenMobileNav] = useState(false)
	const { isAdmin } = useAdminStatus()
	const { user, isLoading: isAuthLoading } = useAuth()
	const [isRedirecting, setIsRedirecting] = useState(false)
	const [loadingHref, setLoadingHref] = useState<string | null>(null)

	// Reset loading state when route changes
	useEffect(() => {
		setLoadingHref(null)
	}, [pathname])

	const handleNavClick = (href: string) => {
		setLoadingHref(href)
	}
	const handleRedirectClick = (href: string) => {
		setIsRedirecting(true)
		window.location.href = href // Redirect manually to ensure state updates
	}
	const handleOpenMobileNav = () => {
		setOpenMobileNav(!openMobileNav)
	}

	const isAuthenticated = !!user

	return (
		<header
			className={cn(
				'z-50 w-full',
				openMobileNav
					? 'fixed inset-0 bg-white'
					: 'sticky top-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
			)}
		>
			<div className="mx-auto flex h-14 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
				<div className="relative flex h-14 flex-1 items-center justify-between lg:justify-start">
					<Link href="/">
						<div className="text-xl font-bold">MEF</div>
					</Link>
					<nav className="absolute top-[1px] hidden h-14 items-center space-x-4 px-4 text-base font-medium lg:ml-12 lg:flex lg:px-8 xl:px-16">
						{navigation
							.filter(({ authenticatedOnly }) =>
								authenticatedOnly ? isAuthenticated : true,
							)
							.map(tab => (
								<Link
									key={tab.href}
									href={tab.href}
									onClick={() => handleNavClick(tab.href)}
								>
									<div
										className={cn(
											'flex h-14 items-center space-x-2 px-4 transition-colors hover:text-secondary',
											pathname === tab.href
												? 'border-b-4 border-secondary font-semibold text-secondary'
												: 'text-foreground/60',
										)}
									>
										{loadingHref === tab.href ? 'Loading...' : tab.label}
									</div>
								</Link>
							))}
					</nav>
				</div>
				<div className="ml-auto hidden items-center gap-4 lg:flex">
					{isAdmin && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Link href="/admin">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleRedirectClick('/admin')}
											loading={isRedirecting}
										>
											<Settings className="h-4 w-4" />
											<span className="sr-only">Admin Settings</span>
										</Button>
									</Link>
								</TooltipTrigger>
								<TooltipContent>
									<p>Admin Dashboard</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
					{user ? (
						<UserStatus />
					) : (
						<Link href="/auth" onClick={() => handleNavClick('/auth')}>
							<Button className="button-3d">
								{loadingHref === '/auth' ? 'Signing in...' : 'Sign In'}
							</Button>
						</Link>
					)}
				</div>
				<div className="lg:hidden">
					<Button
						variant="outline"
						size="icon"
						className="rounded-full"
						onClick={handleOpenMobileNav}
					>
						{openMobileNav ? (
							<XIcon className="h-6 w-6" />
						) : (
							<MenuIcon className="h-6 w-6" />
						)}
					</Button>
				</div>
			</div>
			{openMobileNav && (
				<nav
					className="flex w-full flex-col gap-y-4 border-t border-border p-4"
					onClick={handleOpenMobileNav}
				>
					{user ? (
						<UserStatus />
					) : (
						<Link href="/auth" onClick={() => handleNavClick('/auth')}>
							<Button className="button-3d w-full">
								{loadingHref === '/auth' ? 'Signing in...' : 'Sign In'}
							</Button>
						</Link>
					)}
					{isAdmin && (
						<Link href="/admin">
							<Button
								variant="outline"
								size="icon"
								className={cn(
									'w-full',
									pathname.startsWith('/admin') &&
										'border-secondary/50 text-secondary',
								)}
								onClick={() => handleRedirectClick('/admin')}
								loading={isRedirecting}
							>
								<Settings className="h-4 w-4" />
								Admin Settings
							</Button>
						</Link>
					)}
					{navigation.map(tab => (
						<Link
							key={tab.href}
							href={tab.href}
							onClick={() => handleNavClick(tab.href)}
						>
							<div
								className={cn(
									'flex h-14 items-center space-x-2 border-b-4 border-border font-semibold transition-colors hover:text-secondary',
									pathname === tab.href
										? 'border-secondary text-secondary'
										: 'text-foreground/60',
								)}
							>
								{loadingHref === tab.href ? 'Loading...' : tab.label}
							</div>
						</Link>
					))}
				</nav>
			)}
		</header>
	)
}
