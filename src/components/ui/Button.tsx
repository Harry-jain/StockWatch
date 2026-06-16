import { forwardRef } from 'react'
import clsx from 'clsx'

type ButtonVariant = 'primary' | 'danger' | 'ghost'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-white hover:bg-blue-600',
        variant === 'danger' && 'bg-market-down text-white hover:bg-red-600',
        variant === 'ghost' && 'border border-background-border bg-transparent text-text-secondary hover:bg-background-elevated hover:text-text-primary',
        className,
      )}
      {...props}
    />
  )
})
