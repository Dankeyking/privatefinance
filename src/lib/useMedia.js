import { useEffect, useState } from 'react'

// Eine Medienabfrage aus React heraus. Gebraucht für die Fälle, die CSS nicht
// lösen kann — etwa ein Diagramm, das am Handy gar nicht erst entstehen soll:
// Chart.js zeichnet in eine ausgeblendete Fläche mit Breite 0 und findet die
// richtige Größe beim Einblenden nicht von allein wieder.
export function useMedia(abfrage) {
  const [passt, setPasst] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(abfrage).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(abfrage)
    const pruefe = () => setPasst(mq.matches)
    pruefe() // Breite kann sich zwischen Erstwert und Effekt geändert haben
    mq.addEventListener('change', pruefe)
    return () => mq.removeEventListener('change', pruefe)
  }, [abfrage])

  return passt
}
