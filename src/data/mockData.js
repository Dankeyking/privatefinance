// =============================================================================
//  mockData.js — Startdaten für das manuelle Haushalts-Finanztool
// =============================================================================
//  Rein manuelles Modell: Konten, Einnahmen und Fixkosten/Abos. Jeder Posten
//  hat eine Aufteilung (split = wer trägt welchen Anteil) und ein
//  Abbuchungskonto. Kosten je Person und der Geldfluss zwischen den Konten
//  werden daraus abgeleitet. Keine Bankanbindung.
// =============================================================================

// --- Konten ------------------------------------------------------------------
const accounts = [
  { id: 'p_duncan', name: 'Privatkonto Duncan', type: 'personal', owner: 'Duncan', balance: 1500, currency: 'EUR', color: '#3b82f6' },
  { id: 'p_elisa', name: 'Privatkonto Elisa', type: 'personal', owner: 'Elisa', balance: 1300, currency: 'EUR', color: '#ec4899' },
  { id: 'j_gemein', name: 'Gemeinschaftskonto', type: 'joint', owner: 'Gemeinsam', balance: 800, currency: 'EUR', color: '#10b981' },
  { id: 'j_haushalt', name: 'Haushaltskonto', type: 'joint', owner: 'Gemeinsam', balance: 650, currency: 'EUR', color: '#f59e0b' },
  { id: 'j_urlaub', name: 'Urlaubskonto', type: 'joint', owner: 'Gemeinsam', balance: 900, currency: 'EUR', color: '#14b8a6', goal: 2500 },
  { id: 'j_wohnen', name: 'Wohnung & Versicherungen', type: 'joint', owner: 'Gemeinsam', balance: 950, currency: 'EUR', color: '#8b5cf6' },
]

// --- Einnahmen (netto) -------------------------------------------------------
const incomes = [
  { id: 'in_duncan', name: 'Gehalt Duncan', amount: 3200, rhythm: 'monthly', accountId: 'p_duncan', executionDay: 1 },
  { id: 'in_elisa', name: 'Gehalt Elisa', amount: 1700, rhythm: 'monthly', accountId: 'p_elisa', executionDay: 1 },
]

// --- Fixkosten & Abos --------------------------------------------------------
// split: wie der Posten zwischen den Personen aufgeteilt wird.
const standingOrders = [
  // Miete: Elisa 720 €, Duncan den Rest (850 €) – feste Beträge.
  { id: 'so_miete', recipient: 'Miete', amount: 1570, rhythm: 'monthly', accountId: 'j_wohnen', category: 'Wohnen', kind: 'fixed', executionDay: 1,
    split: { mode: 'amount', shares: { Elisa: 720, Duncan: 850 } } },
  // Internet 70 € – 50/50.
  { id: 'so_internet', recipient: 'Internet', amount: 70, rhythm: 'monthly', accountId: 'j_wohnen', category: 'Wohnen', kind: 'fixed', executionDay: 12,
    split: { mode: 'even' } },
  // Rundfunkbeitrag (GEZ) jährlich – 50/50.
  { id: 'so_gez', recipient: 'Rundfunkbeitrag (GEZ)', amount: 220.32, rhythm: 'yearly', accountId: 'j_wohnen', category: 'Sonstiges', kind: 'fixed', executionDay: 15,
    split: { mode: 'even' } },
  // Rechtsschutzversicherung 30,10 € – 50/50, vom Konto Wohnung & Versicherungen.
  { id: 'so_rechtsschutz', recipient: 'Rechtsschutzversicherung', amount: 30.10, rhythm: 'monthly', accountId: 'j_wohnen', category: 'Versicherung', kind: 'fixed', executionDay: 15,
    split: { mode: 'even' } },
  // Abos (kind 'subscription')
  { id: 'so_netflix', recipient: 'Netflix', amount: 17.99, rhythm: 'monthly', accountId: 'j_gemein', category: 'Freizeit', kind: 'subscription', executionDay: 20,
    split: { mode: 'even' } },
  { id: 'so_spotify', recipient: 'Spotify Family', amount: 17.99, rhythm: 'monthly', accountId: 'j_gemein', category: 'Freizeit', kind: 'subscription', executionDay: 6,
    split: { mode: 'even' } },
  { id: 'so_handy', recipient: 'Handyvertrag', amount: 29.99, rhythm: 'monthly', accountId: 'p_duncan', category: 'Mobilität', kind: 'subscription', executionDay: 1,
    split: { mode: 'single', person: 'Duncan' } },
  { id: 'so_cloud', recipient: 'iCloud Speicher', amount: 35.88, rhythm: 'yearly', accountId: 'p_duncan', category: 'Technik', kind: 'subscription', executionDay: 10,
    split: { mode: 'single', person: 'Duncan' } },
  // Kategorie 'Sparen' -> zählt als Rücklage (nicht als Kosten).
  { id: 'so_etf', recipient: 'ETF Sparplan', amount: 200, rhythm: 'monthly', accountId: 'j_gemein', category: 'Sparen', kind: 'fixed', executionDay: 5,
    split: { mode: 'even' } },
]

// --- Umbuchungen (explizite Überträge zwischen Konten) -----------------------
// Wiederkehrende Transfers, die nicht aus Kosten entstehen (z. B. Sparen).
const transfers = [
  { id: 'um_urlaub', label: 'Sparen Urlaub', fromAccountId: 'p_duncan', toAccountId: 'j_urlaub', amount: 200, rhythm: 'monthly' },
]

// --- nextExecution + monthInterval ableiten ----------------------------------
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function nextExecutionDate(executionDay, anchor = new Date()) {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), executionDay || 1)
  if (d <= anchor) d.setMonth(d.getMonth() + 1)
  return isoDate(d)
}
const monthIntervalOf = (rhythm) => (rhythm === 'yearly' ? 12 : rhythm === 'quarterly' ? 3 : 1)

const today = new Date()
const enrichedOrders = standingOrders.map((so) => ({
  ...so,
  monthInterval: monthIntervalOf(so.rhythm),
  nextExecution: nextExecutionDate(so.executionDay, today),
}))

export const mockData = {
  accounts,
  incomes,
  standingOrders: enrichedOrders,
  transfers,
}
export default mockData
