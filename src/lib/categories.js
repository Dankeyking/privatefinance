// =============================================================================
//  categories.js — Kategorien + Auto-Kategorisierung
// =============================================================================
//  Erweitern: einfach neue Schlüsselwörter in KEYWORD_RULES ergänzen oder eine
//  neue Kategorie in CATEGORIES + KEYWORD_RULES aufnehmen.
// =============================================================================

// Vordefinierte Kategorien (Reihenfolge = Anzeige-Reihenfolge).
export const CATEGORIES = [
  { id: 'Wohnen', label: 'Wohnen', color: '#2563eb' },
  { id: 'Mobilität', label: 'Mobilität', color: '#0891b2' },
  { id: 'Gesundheit', label: 'Gesundheit', color: '#0d9488' },
  { id: 'Versicherung', label: 'Versicherung', color: '#7c3aed' },
  { id: 'Freizeit', label: 'Freizeit', color: '#db2777' },
  { id: 'Technik', label: 'Technik', color: '#6366f1' },
  { id: 'Sparen', label: 'Sparen', color: '#16a34a' },
  { id: 'Bargeld', label: 'Bargeld', color: '#ca8a04' },
  { id: 'Sonstiges', label: 'Sonstiges', color: '#64748b' },
]

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
export const FALLBACK_CATEGORY = 'Sonstiges'
// Alles mit dieser Kategorie wird als Sparen/Rücklage behandelt (nicht als Kosten).
export const SAVINGS_CATEGORY = 'Sparen'

export function categoryColor(id) {
  const c = CATEGORIES.find((x) => x.id === id)
  return c ? c.color : '#64748b'
}

// Schlüsselwort-Regeln: pro Kategorie eine Liste von Substrings (lowercase).
// Trifft ein Schlüsselwort im Empfängernamen/Beschreibung, gewinnt die Kategorie.
// Reihenfolge in CATEGORIES bestimmt die Priorität bei Mehrfachtreffern.
export const KEYWORD_RULES = {
  Wohnen: [
    'miete', 'vermieter', 'hausverwaltung', 'wohnung', 'stadtwerke', 'strom',
    'gas', 'wasser', 'energie', 'eon', 'vattenfall', 'rundfunk', 'gez',
    'telekom', 'vodafone', 'o2', 'internet', 'dsl', 'nebenkosten',
  ],
  Mobilität: [
    'tankstelle', 'aral', 'shell', 'esso', 'jet', 'db ', 'deutsche bahn',
    'bahn', 'bvg', 'mvg', 'hvv', 'leasing', 'kfz', 'auto', 'werkstatt',
    'parken', 'tankt', 'sixt', 'tier', 'lime',
  ],
  Gesundheit: [
    'arzt', 'ärzt', 'medis', 'medikament', 'apotheke', 'barmenia', 'zahnarzt',
    'physio', 'optiker', 'brille', 'therapie', 'krankengymnastik', 'klinik', 'medi',
  ],
  Versicherung: [
    'versicherung', 'allianz', 'huk', 'axa', 'ergo', 'generali', 'devk',
    'haftpflicht', 'rechtsschutz', 'hausrat', 'rente', 'kfz-vers',
  ],
  Technik: [
    'homeassistant', 'home assistant', 'goneo', 'domain', 'domän', 'google one',
    'gmx', 'icloud', 'dropbox', 'github', 'hetzner', 'netcup', 'hosting', 'nas',
    'openai', 'chatgpt', 'claude', 'server', 'vpn',
  ],
  Freizeit: [
    'netflix', 'spotify', 'disney', 'amazon prime', 'dazn', 'sky',
    'fitness', 'gym', 'mcfit', 'restaurant', 'kino', 'steam', 'paypal',
    'patreon', 'twitch', 'youtube',
  ],
  Sparen: [
    'depot', 'etf', 'sparplan', 'trade republic', 'traderepublic', 'scalable',
    'tagesgeld', 'festgeld', 'sparkonto', 'rücklage', 'ruecklage', 'invest',
    'comdirect', 'ing depot', 'bausparvertrag', 'bauspar', 'sparen',
  ],
  Bargeld: [
    'bargeld', 'bargeldabhebung', 'geldautomat', 'auszahlung', 'atm',
    'abhebung', 'cash',
  ],
}

// Erkennt Bargeld-Abhebungen (für die Bargeld-Aufteilung).
export function isCashWithdrawal(tx) {
  if (!tx) return false
  if (tx.cashWithdrawal) return true
  return /bargeld|geldautomat|auszahlung|abhebung|\batm\b/i.test(
    `${tx.recipient || ''} ${tx.description || ''}`,
  )
}

// Ordnet einen Empfänger (+ optionale Beschreibung) automatisch einer Kategorie zu.
export function autoCategorize(recipient = '', description = '') {
  const haystack = `${recipient} ${description}`.toLowerCase()
  for (const cat of CATEGORIES) {
    const rules = KEYWORD_RULES[cat.id]
    if (!rules) continue
    if (rules.some((kw) => haystack.includes(kw))) {
      return cat.id
    }
  }
  return FALLBACK_CATEGORY
}
