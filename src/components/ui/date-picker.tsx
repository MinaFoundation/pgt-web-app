import * as React from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

export interface DatePickerProps {
	date: { from?: Date; to?: Date } | undefined
	setDate: (date: { from?: Date; to?: Date } | undefined) => void
}

export function DatePicker({ date, setDate }: DatePickerProps) {
	return (
		<div className="flex gap-4">
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className={cn(
							'w-full justify-start text-left font-normal',
							!date?.from && 'text-muted-foreground',
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{date?.from ? (
							format(date.from, 'PPP')
						) : (
							<span>Pick start date</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={date?.from}
						onSelect={selectedDate => {
							setDate({
								...date,
								from: selectedDate,
							})
						}}
						//disabled={date?.from ? d => d < date.from : undefined}
						initialFocus
					/>
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className={cn(
							'w-full justify-start text-left font-normal',
							!date?.to && 'text-muted-foreground',
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{date?.to ? format(date.to, 'PPP') : <span>Pick end date</span>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={date?.to}
						onSelect={selectedDate => {
							setDate({
								...date,
								to: selectedDate,
							})
						}}
						initialFocus
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}

export default DatePicker
