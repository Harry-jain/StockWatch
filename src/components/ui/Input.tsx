import { forwardRef } from 'react'
import clsx from 'clsx'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={clsx(
        'h-10 w-full rounded-md border border-background-border bg-background-primary px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent',
        className,
      )}
      {...props}
    />
  )
})
