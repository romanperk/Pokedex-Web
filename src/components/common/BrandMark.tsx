export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="var(--accent-fill)" />
      <path d="M1 12a11 11 0 0 0 22 0Z" fill="#fff" />
      <path d="M1 12h22" stroke="#17181a" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="#fff" stroke="#17181a" strokeWidth="2" />
      <circle cx="12" cy="12" r="11" fill="none" stroke="#17181a" strokeWidth="2" />
    </svg>
  )
}
