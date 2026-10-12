import type { ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type ActionLinkProps = ComponentProps<typeof Link> & {
  children: ReactNode
  variant?: 'primary'
}

export function ActionLink({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ActionLinkProps) {
  const variantClass = variant === 'primary' ? 'primary-button' : ''

  return (
    <Link className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </Link>
  )
}
