import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react'

export const DEFAULTS = { size: '1', font: 'atkinson', spacing: 'normal', contrast: 'normal', motion: 'normal' }
const KEY = 'sentinel.reading'

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return DEFAULTS
  }
}

const Ctx = createContext(null)

export function ReadingSettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)
  const [open, setOpen] = useState(false)

  useLayoutEffect(() => {
    const el = document.documentElement
    el.style.setProperty('--text-scale', settings.size)
    el.dataset.font = settings.font
    el.dataset.spacing = settings.spacing
    el.dataset.contrast = settings.contrast
    el.dataset.motion = settings.motion
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      /* storage unavailable: settings still apply for this visit */
    }
  }, [settings])

  const update = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), [])
  const reset = useCallback(() => setSettings(DEFAULTS), [])
  const value = useMemo(() => ({ settings, update, reset, open, setOpen }), [settings, update, reset, open])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useReadingSettings = () => useContext(Ctx)
