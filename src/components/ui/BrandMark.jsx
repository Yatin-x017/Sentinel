export function BrandMark({ size = 34 }) {
  return (
    <span className="grid place-items-center rounded-[10px] bg-brand" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="none">
        <path d="M4 6.5h7.5M4 12h12M4 17.5h7.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="17.5" cy="6.5" r="2" fill="#D7EF72" />
        <circle cx="17.5" cy="17.5" r="2" stroke="#fff" strokeWidth="1.5" />
      </svg>
    </span>
  )
}
