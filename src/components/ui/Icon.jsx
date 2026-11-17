const paths = {
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: (<><path d="M12 4 3 19.5h18L12 4Z" /><path d="M12 10v4.5M12 17.2v.1" /></>),
  circle: <circle cx="12" cy="12" r="7" />,
  clock: (<><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 1.5" /></>),
  x: (<><circle cx="12" cy="12" r="8" /><path d="m9.3 9.3 5.4 5.4M14.7 9.3l-5.4 5.4" /></>),
  info: (<><circle cx="12" cy="12" r="8" /><path d="M12 11v5M12 8v.1" /></>),
  arrow: <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  shield: (<><path d="M12 3 19 6v5c0 4.5-2.7 7.8-7 10-4.3-2.2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></>),
  sliders: (<><path d="M4 7h8M18 7h2M4 17h2M12 17h8" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>),
  print: (<><path d="M7 9V4h10v5M7 17H5v-6h14v6h-2" /><path d="M7 14h10v6H7z" /></>),
  spinner: <path d="M12 4a8 8 0 1 0 8 8" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
}

export function Icon({ name, size = 18, className }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  )
}
