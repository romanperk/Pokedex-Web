import { useState, type ReactNode } from 'react'
import { CircleHelp, LoaderCircle, RotateCw, Sparkle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paddedId, pokemonSprite, titleCase, typeVars } from '../../lib/pokeapi/client'

export function PokemonImage({
  src,
  fallbackSrc,
  alt = '',
  className = '',
  eager = false,
}: {
  src: string
  fallbackSrc?: string
  alt?: string
  className?: string
  eager?: boolean
}) {
  const [failure, setFailure] = useState<{ src: string; count: number }>({ src, count: 0 })
  const failures = failure.src === src ? failure.count : 0
  const current = failures === 0 ? src : failures === 1 ? fallbackSrc : undefined
  if (!current)
    return (
      <span
        className={`pokemon-image pokemon-image-missing ${className}`}
        role="img"
        aria-label={alt}
      >
        <CircleHelp size={24} aria-hidden="true" />
      </span>
    )
  return (
    <img
      className={`pokemon-image ${className}`}
      src={current}
      alt={alt}
      // CORS requests give the service worker readable responses instead of padded opaque ones.
      crossOrigin="anonymous"
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      draggable={false}
      onError={() => setFailure({ src, count: failures + 1 })}
    />
  )
}

export function HaloArt({
  src,
  fallbackSrc,
  alt = '',
  className = '',
}: {
  src: string
  fallbackSrc?: string
  alt?: string
  className?: string
}) {
  return (
    <div className={`halo-art ${className}`}>
      <span className="halo" aria-hidden="true" />
      <Sparkle className="spark spark-one" size={20} aria-hidden="true" />
      <Sparkle className="spark spark-two" size={14} aria-hidden="true" />
      <PokemonImage key={src} src={src} fallbackSrc={fallbackSrc} alt={alt} eager />
    </div>
  )
}

/** Pixel sprites are about 600 bytes each, so long lists stay light on mobile data. */
export function PokemonSprite({
  id,
  alt = '',
  className = '',
}: {
  id: number
  alt?: string
  className?: string
}) {
  return <PokemonImage src={pokemonSprite(id)} alt={alt} className={`sprite ${className}`} />
}

export function DexNumber({ id }: { id: number }) {
  return <span className="dex-number">{paddedId(id)}</span>
}

export function TypeBadge({ type, link = false }: { type: string; link?: boolean }) {
  return link ? (
    <Link className="type-badge" to={`/types/${type}`} style={typeVars(type)}>
      {titleCase(type)}
    </Link>
  ) : (
    <span className="type-badge" style={typeVars(type)}>
      {titleCase(type)}
    </span>
  )
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spinner" size={20} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="button button-secondary" onClick={onRetry}>
          <RotateCw size={16} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="state" role="status">
      <strong className="state-title">{title}</strong>
      {children && <span>{children}</span>}
      {action}
    </div>
  )
}
