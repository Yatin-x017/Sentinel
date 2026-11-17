import { useEffect, useRef } from 'react'
import { useReadingSettings } from '../../hooks/useReadingSettings.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Button } from '../ui/Button.jsx'

const GROUPS = [
  { key: 'size', legend: 'Text size', options: [['1', 'Standard'], ['1.125', 'Large'], ['1.25', 'Larger'], ['1.5', 'Largest']] },
  { key: 'font', legend: 'Reading font', options: [['atkinson', 'Atkinson Hyperlegible'], ['lexend', 'Lexend']] },
  { key: 'spacing', legend: 'Line spacing', options: [['normal', 'Standard'], ['relaxed', 'Relaxed'], ['loose', 'Loose']] },
  { key: 'contrast', legend: 'Contrast', options: [['normal', 'Standard'], ['high', 'High']] },
  { key: 'motion', legend: 'Motion', options: [['normal', 'Standard'], ['reduce', 'Reduced']] },
]

export function ReadingSettings() {
  const { settings, update, reset, open, setOpen } = useReadingSettings()
  const ref = useRef(null)

  useEffect(() => {
    const d = ref.current
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="reading-title"
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === ref.current && setOpen(false)}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-md overflow-y-auto border-l border-border bg-surface p-0 shadow-popover backdrop:bg-ink/40"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="reading-title" className="font-heading text-2xl font-semibold">Reading settings</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close reading settings"
            className="grid size-12 place-items-center rounded-input hover:bg-surface-soft">
            <Icon name="close" size={22} />
          </button>
        </div>
        <p className="mt-2 text-ink-muted">Changes apply straight away and are saved on this device.</p>

        <div className="mt-6 space-y-6">
          {GROUPS.map((g) => (
            <fieldset key={g.key}>
              <legend className="font-heading text-sm font-semibold">{g.legend}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.options.map(([value, label]) => (
                  <label key={value} className="cursor-pointer">
                    <input
                      type="radio" name={g.key} value={value} checked={settings[g.key] === value}
                      onChange={() => update({ [g.key]: value })} className="peer sr-only"
                    />
                    <span className="flex min-h-12 items-center rounded-input border border-border-strong px-4 text-sm peer-checked:border-brand peer-checked:bg-brand peer-checked:text-surface peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-focus">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Button onClick={() => setOpen(false)}>Done</Button>
          <Button variant="secondary" onClick={reset}>Reset to defaults</Button>
        </div>
      </div>
    </dialog>
  )
}
