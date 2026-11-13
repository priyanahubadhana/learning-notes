import { useEffect, useState } from 'react'
import { PHONE_SCREEN } from './appUi'

/** True on a phone-sized screen (the shared PHONE_SCREEN query); follows changes. */
export function usePhoneScreen(): boolean {
  const [phone, setPhone] = useState(() => matchMedia(PHONE_SCREEN).matches)
  useEffect(() => {
    const q = matchMedia(PHONE_SCREEN)
    const on = () => setPhone(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return phone
}
