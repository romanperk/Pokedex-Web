import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'quiet'
}

export function Button({ children, className = '', variant = 'quiet', ...props }: ButtonProps) {
  const variantClass = variant === 'primary' ? 'primary-button' : 'ui-button'

  return (
    <button className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
