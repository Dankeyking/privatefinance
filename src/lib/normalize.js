// =============================================================================
//  normalize.js — Beträge auf Monatsbasis normalisieren
// =============================================================================

// Faktor, mit dem ein Betrag des jeweiligen Rhythmus auf einen Monat umgerechnet wird.
const RHYTHM_TO_MONTHLY = {
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
}

export const RHYTHM_LABELS = {
  monthly: 'monatlich',
  quarterly: 'vierteljährlich',
  yearly: 'jährlich',
}

// Rechnet einen Auftragsbetrag auf monatliche Kosten um.
// yearly -> /12, quarterly -> /3, monthly -> unverändert.
export function toMonthly(amount, rhythm) {
  const factor = RHYTHM_TO_MONTHLY[rhythm] ?? 1
  return amount * factor
}

// Währungsformat (Deutsch, EUR).
const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

export function formatEUR(value) {
  return eurFormatter.format(value || 0)
}

// Datum hübsch (z. B. 01.07.2026).
export function formatDate(iso) {
  if (!iso) return '–'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
