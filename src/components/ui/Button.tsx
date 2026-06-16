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
        'inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]',
        variant === 'primary' && 'glass-btn-primary',
        variant === 'danger' && 'glass-btn-danger',
        variant === 'ghost' && 'glass-btn text-text-secondary hover:text-text-primary hover:bg-white/10 border-white/5 bg-white/[0.03]',
        className,
      )}
      {...props}
    />
  )
})
