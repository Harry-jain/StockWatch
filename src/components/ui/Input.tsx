import { forwardRef } from 'react'
import clsx from 'clsx'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={clsx(
        'h-10 w-full px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted glass-input',
        className,
      )}
      {...props}
    />
  )
})
