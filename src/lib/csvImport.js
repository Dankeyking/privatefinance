// =============================================================================
//  csvImport.js — CSV-Umsätze einlesen und wiederkehrende Zahlungen erkennen
// =============================================================================
//  Bank-neutral: Trennzeichen wird erkannt, Spalten werden gemappt (mit
//  Auto-Vorschlag). Deutsche Zahlen-/Datumsformate werden unterstützt.
// =============================================================================

import { autoCategorize } from './categories.js'

// --- CSV-Parser (State-Machine, unterstützt Anführungszeichen) ---------------
export function detectDelimiter(text) {
  const line = (text.split(/\r?\n/).find((l) => l.trim()) || '')
  const counts = { ';': 0, ',': 0, '\t': 0 }
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes && ch in counts) counts[ch]++
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ';'
}

export function parseCSV(text, delimiter) {
  const delim = delimiter || detectDelimiter(text)
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      row.push(field); field = ''
    } else if (ch === '\n') {
      row.push(field); rows.push(row); field = ''; row = []
    } else {
      field += ch
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  // Leerzeilen raus
  const clean = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (!clean.length) return { delimiter: delim, headers: [], rows: [] }
  return { delimiter: delim, headers: clean[0].map((h) => h.trim()), rows: clean.slice(1) }
}

// --- Werte parsen ------------------------------------------------------------
// Deutsches Zahlenformat: "1.234,56" -> 1234.56, "-95,00 €" -> -95
export function parseAmount(str) {
  if (typeof str === 'number') return str
  if (!str) return NaN
  let s = String(str).replace(/[^\d.,\-]/g, '').trim()
  if (!s) return NaN
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) s = s.replace(/\./g, '').replace(',', '.') // 1.234,56
  else if (hasComma) s = s.replace(',', '.') // 95,00
  // nur Punkt -> als Dezimalpunkt belassen
  const n = Number(s)
  return Number.isNaN(n) ? NaN : n
}

// dd.mm.yyyy | yyyy-mm-dd | dd/mm/yyyy -> { iso, month:'YYYY-MM' } oder null
export function parseDate(str) {
  if (!str) return null
  const s = String(str).trim()
  let y, m, d
  let mtc
  if ((mtc = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) { [, y, m, d] = mtc }
  else if ((mtc = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/))) {
    d = mtc[1]; m = mtc[2]; y = mtc[3]
    if (y.length === 2) y = `20${y}`
  } else return null
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return { iso: `${y}-${mm}-${dd}`, month: `${y}-${mm}` }
}

// --- Spalten-Auto-Mapping ----------------------------------------------------
const HINTS = {
  date: ['buchungstag', 'buchungsdatum', 'datum', 'valuta', 'wertstellung', 'date'],
  recipient: ['empfänger', 'empfaenger', 'auftraggeber', 'begünstigter', 'beguenstigter',
    'name', 'zahlungsempfänger', 'zahlungsempfaenger', 'beteiligter', 'payee', 'gegenkonto inhaber'],
  amount: ['betrag', 'umsatz', 'amount', 'wert'],
  purpose: ['verwendungszweck', 'buchungstext', 'vwz', 'beschreibung', 'verwendung', 'zweck', 'purpose'],
}

export function guessMapping(headers) {
  const lower = headers.map((h) => h.toLowerCase().trim())
  const find = (keys) => {
    for (const k of keys) {
      const i = lower.findIndex((h) => h.includes(k))
      if (i >= 0) return i
    }
    return -1
  }
  return {
    date: find(HINTS.date),
    recipient: find(HINTS.recipient),
    amount: find(HINTS.amount),
    purpose: find(HINTS.purpose),
  }
}

// --- Zeilen -> Transaktionen -------------------------------------------------
export function parseTransactions(rows, mapping) {
  const out = []
  rows.forEach((r) => {
    const dateRaw = mapping.date >= 0 ? r[mapping.date] : ''
    const amountRaw = mapping.amount >= 0 ? r[mapping.amount] : ''
    const recipient = (mapping.recipient >= 0 ? r[mapping.recipient] : '')?.trim() || ''
    const purpose = (mapping.purpose >= 0 ? r[mapping.purpose] : '')?.trim() || ''
    const amount = parseAmount(amountRaw)
    const date = parseDate(dateRaw)
    if (Number.isNaN(amount) || !date) return
    out.push({ ...date, amount, recipient: recipient || purpose.slice(0, 40), purpose })
  })
  return out
}

// --- Wiederkehrende Zahlungen erkennen ---------------------------------------
// Schlüssel aus Empfänger: klein, ohne Ziffern/Referenzen, kollabierte Spaces.
function recipientKey(name) {
  return String(name)
    .toLowerCase()
    .replace(/\b(sepa|lastschrift|dauerauftrag|basislastschrift|mandat|ref|kartenzahlung)\b/g, ' ')
    .replace(/[0-9]+/g, ' ')
    .replace(/[^a-zäöüß ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// Liefert Vorschläge: nur Ausgaben, gruppiert, über >= 2 Monate wiederkehrend.
export function detectRecurring(transactions, { minMonths = 2 } = {}) {
  const groups = {}
  transactions.forEach((t) => {
    if (t.amount >= 0) return // nur Ausgaben
    const key = recipientKey(t.recipient)
    if (!key) return
    if (!groups[key]) groups[key] = { key, names: {}, amounts: [], months: new Set(), purposes: {} }
    const g = groups[key]
    g.amounts.push(Math.abs(t.amount))
    g.months.add(t.month)
    g.names[t.recipient] = (g.names[t.recipient] || 0) + 1
    if (t.purpose) g.purposes[t.purpose] = (g.purposes[t.purpose] || 0) + 1
    g.recipientFallback = t.recipient
  })

  const mostCommon = (obj) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || ''

  const guessRhythm = (months) => {
    const sorted = [...months].sort()
    if (sorted.length < 2) return 'monthly'
    const idx = sorted.map((m) => { const [y, mo] = m.split('-').map(Number); return y * 12 + mo })
    let gap = 0
    for (let i = 1; i < idx.length; i++) gap += idx[i] - idx[i - 1]
    const avg = gap / (idx.length - 1)
    if (avg >= 9) return 'yearly'
    if (avg >= 2) return 'quarterly'
    return 'monthly'
  }

  return Object.values(groups)
    .filter((g) => g.months.size >= minMonths)
    .map((g) => {
      const recipient = mostCommon(g.names) || g.recipientFallback
      const amount = Number(median(g.amounts).toFixed(2))
      const rhythm = guessRhythm(g.months)
      const purpose = mostCommon(g.purposes)
      return {
        recipient,
        amount,
        rhythm,
        months: g.months.size,
        occurrences: g.amounts.length,
        category: autoCategorize(recipient, purpose),
        purpose,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}
