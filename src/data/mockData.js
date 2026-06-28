// =============================================================================
//  mockData.js — Demo-Daten für das manuelle Haushalts-Finanztool
// =============================================================================
//  Rein manuelles Modell: Konten, Einnahmen, Fixkosten + Abos und ein
//  Verteilungsplan (wer bucht nach Gehalt wie viel auf welches Konto).
//  Keine Bankanbindung, keine Transaktionen/Saldoverläufe – die App rechnet
//  alles aus den wiederkehrenden Posten.
// =============================================================================

// --- Konten ------------------------------------------------------------------
// type 'personal' = Privatkonto (owner = Person), 'joint' = gemeinsames Konto.
const accounts = [
  { id: 'p_duncan', name: 'Privatkonto Duncan', type: 'personal', owner: 'Duncan', balance: 1500, currency: 'EUR' },
  { id: 'p_elisa', name: 'Privatkonto Elisa', type: 'personal', owner: 'Elisa', balance: 1300, currency: 'EUR' },
  { id: 'j_gemein', name: 'Gemeinschaftskonto', type: 'joint', owner: 'Gemeinsam', balance: 800, currency: 'EUR' },
  { id: 'j_haushalt', name: 'Haushaltskonto', type: 'joint', owner: 'Gemeinsam', balance: 650, currency: 'EUR' },
  { id: 'j_urlaub', name: 'Urlaubskonto', type: 'joint', owner: 'Gemeinsam', balance: 1200, currency: 'EUR' },
  { id: 'j_wohnen', name: 'Wohnung & Versicherungen', type: 'joint', owner: 'Gemeinsam', balance: 900, currency: 'EUR' },
]

// --- Einnahmen ---------------------------------------------------------------
// Landen auf den Privatkonten; Person = owner des Kontos.
const incomes = [
  { id: 'in_duncan', name: 'Gehalt Duncan', amount: 3200, rhythm: 'monthly', accountId: 'p_duncan', executionDay: 1 },
  { id: 'in_elisa', name: 'Gehalt Elisa', amount: 2800, rhythm: 'monthly', accountId: 'p_elisa', executionDay: 1 },
]

// --- Fixkosten & Abos --------------------------------------------------------
// kind: 'fixed' = Fixkosten, 'subscription' = Abo. Jeweils einem Konto zugeordnet.
const standingOrders = [
  // Wohnung & Versicherungen
  { id: 'so_miete', recipient: 'Vermieter Müller', amount: 1450, rhythm: 'monthly', accountId: 'j_wohnen', category: 'Wohnen', kind: 'fixed', executionDay: 1 },
  { id: 'so_strom', recipient: 'Stadtwerke Strom', amount: 95, rhythm: 'monthly', accountId: 'j_wohnen', category: 'Wohnen', kind: 'fixed', executionDay: 18 },
  { id: 'so_internet', recipient: 'Telekom Internet', amount: 49.99, rhythm: 'monthly', accountId: 'j_wohnen', category: 'Wohnen', kind: 'fixed', executionDay: 12 },
  { id: 'so_wasser', recipient: 'Stadtwerke Wasser', amount: 165, rhythm: 'quarterly', accountId: 'j_wohnen', category: 'Wohnen', kind: 'fixed', executionDay: 8 },
  { id: 'so_hausrat', recipient: 'HUK Hausratversicherung', amount: 180, rhythm: 'yearly', accountId: 'j_wohnen', category: 'Versicherung', kind: 'fixed', executionDay: 25 },
  { id: 'so_kfz', recipient: 'Allianz KFZ-Versicherung', amount: 720, rhythm: 'yearly', accountId: 'j_wohnen', category: 'Versicherung', kind: 'fixed', executionDay: 15 },
  // Haushaltskonto
  { id: 'so_lebensmittel', recipient: 'Lebensmittel (Budget)', amount: 650, rhythm: 'monthly', accountId: 'j_haushalt', category: 'Sonstiges', kind: 'fixed', executionDay: 1 },
  { id: 'so_netflix', recipient: 'Netflix', amount: 17.99, rhythm: 'monthly', accountId: 'j_haushalt', category: 'Freizeit', kind: 'subscription', executionDay: 20 },
  { id: 'so_spotify', recipient: 'Spotify Family', amount: 17.99, rhythm: 'monthly', accountId: 'j_haushalt', category: 'Freizeit', kind: 'subscription', executionDay: 6 },
  { id: 'so_disney', recipient: 'Disney+', amount: 8.99, rhythm: 'monthly', accountId: 'j_haushalt', category: 'Freizeit', kind: 'subscription', executionDay: 14 },
  // Gemeinschaftskonto (Sparen)
  { id: 'so_tr', recipient: 'Trade Republic Sparplan', amount: 300, rhythm: 'monthly', accountId: 'j_gemein', category: 'Sparen', kind: 'fixed', executionDay: 5 },
  { id: 'so_etf', recipient: 'Comdirect ETF Sparplan', amount: 200, rhythm: 'monthly', accountId: 'j_gemein', category: 'Sparen', kind: 'fixed', executionDay: 5 },
  // Urlaubskonto
  { id: 'so_urlaub', recipient: 'Urlaubs-Sparplan', amount: 250, rhythm: 'monthly', accountId: 'j_urlaub', category: 'Sparen', kind: 'fixed', executionDay: 5 },
  // Privatkonten (Abos)
  { id: 'so_gym_d', recipient: 'Fitness First', amount: 39.99, rhythm: 'monthly', accountId: 'p_duncan', category: 'Freizeit', kind: 'subscription', executionDay: 1 },
  { id: 'so_gym_e', recipient: 'McFit Fitnessstudio', amount: 29.99, rhythm: 'monthly', accountId: 'p_elisa', category: 'Freizeit', kind: 'subscription', executionDay: 1 },
]

// --- Verteilung (nach Gehalt direkt auf die richtigen Konten) ----------------
// fromAccountId = Privatkonto, toAccountId = gemeinsames Konto. Person = owner(from).
const transfers = [
  // Duncan
  { id: 'tr_d_wohnen', recipient: 'Anteil Wohnung & Versicherungen', amount: 900, rhythm: 'monthly', fromAccountId: 'p_duncan', toAccountId: 'j_wohnen', executionDay: 1 },
  { id: 'tr_d_gemein', recipient: 'Anteil Gemeinschaft', amount: 300, rhythm: 'monthly', fromAccountId: 'p_duncan', toAccountId: 'j_gemein', executionDay: 1 },
  { id: 'tr_d_haushalt', recipient: 'Anteil Haushalt', amount: 350, rhythm: 'monthly', fromAccountId: 'p_duncan', toAccountId: 'j_haushalt', executionDay: 1 },
  { id: 'tr_d_urlaub', recipient: 'Anteil Urlaub', amount: 125, rhythm: 'monthly', fromAccountId: 'p_duncan', toAccountId: 'j_urlaub', executionDay: 1 },
  // Elisa
  { id: 'tr_e_wohnen', recipient: 'Anteil Wohnung & Versicherungen', amount: 825, rhythm: 'monthly', fromAccountId: 'p_elisa', toAccountId: 'j_wohnen', executionDay: 1 },
  { id: 'tr_e_gemein', recipient: 'Anteil Gemeinschaft', amount: 200, rhythm: 'monthly', fromAccountId: 'p_elisa', toAccountId: 'j_gemein', executionDay: 1 },
  { id: 'tr_e_haushalt', recipient: 'Anteil Haushalt', amount: 350, rhythm: 'monthly', fromAccountId: 'p_elisa', toAccountId: 'j_haushalt', executionDay: 1 },
  { id: 'tr_e_urlaub', recipient: 'Anteil Urlaub', amount: 125, rhythm: 'monthly', fromAccountId: 'p_elisa', toAccountId: 'j_urlaub', executionDay: 1 },
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
const enrichedTransfers = transfers.map((tr) => ({
  ...tr,
  nextExecution: nextExecutionDate(tr.executionDay, today),
}))

export const mockData = {
  accounts,
  incomes,
  standingOrders: enrichedOrders,
  transfers: enrichedTransfers,
}
export default mockData
