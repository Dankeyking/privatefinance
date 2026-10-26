#!/usr/bin/env node
// =============================================================================
//  mcp/finance-server.js — MCP-Server für direkten Claude-Zugriff
// =============================================================================
//  Stellt die Haushalts-Finanzdaten der laufenden Instanz als MCP-Tools bereit:
//  lesen (Konten, Fixkosten/Abos, Einnahmen, Umbuchungen, Schulden, fertige
//  Auswertungen) und schreiben (anlegen, ändern, löschen).
//
//  Datenquelle ist die HTTP-API der App (server/index.js), nicht mehr die
//  Demo-Daten aus mockData.js. Die Auswertungen rechnet dieser Server mit
//  denselben Funktionen wie die Oberfläche (src/lib), damit Zahlen hier und
//  im Dashboard übereinstimmen.
//
//  Konfiguration (Umgebungsvariablen, siehe README):
//    FINANCE_API_URL    Basis-URL der API, z. B. http://apps:8080/api
//                       (Default: http://localhost:8080/api)
//    FINANCE_API_TOKEN  Token für FINANCE_API_TOKEN der Instanz. Ohne Token
//                       wird keiner gesendet – das klappt nur gegen einen
//                       lokalen Server mit DEV_USER.
//
//  Start:  npm run mcp     (bzw. node mcp/finance-server.js)
// =============================================================================

import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { buildClaudeExport } from '../src/lib/claudeExport.js'
import { toMonthly } from '../src/lib/normalize.js'
import { effectiveCategoryOf, isOrderActive, upcomingPayments } from '../src/lib/selectors.js'
import {
  monthlyByAccount,
  monthlyByCategory,
  personSummary,
} from '../src/lib/recurring.js'

const API_BASE = (process.env.FINANCE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '')
const API_TOKEN = process.env.FINANCE_API_TOKEN || ''

const round = (n) => Number((n || 0).toFixed(2))
const ok = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] })
const fail = (msg) => ({ content: [{ type: 'text', text: msg }], isError: true })

// --- API-Zugriff ------------------------------------------------------------

async function callApi(method, path, body) {
  const headers = { Accept: 'application/json' }
  if (API_TOKEN) headers['X-Api-Key'] = API_TOKEN
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    })
  } catch (err) {
    throw new Error(`API ${API_BASE} nicht erreichbar: ${err.message}`)
  }

  // Ein Redirect bedeutet hier: die Anfrage landete beim Authentik-Login statt
  // bei der App (FINANCE_API_URL zeigt auf den Proxy statt auf die Instanz).
  if (res.status >= 300 && res.status < 400) {
    const target = res.headers.get('location') || '?'
    // Nur Host + Pfad zeigen; die OAuth-Query ist mehrere Zeilen lang und hilft nicht.
    const short = target.split('?')[0]
    throw new Error(
      `API antwortet mit Redirect (HTTP ${res.status}) nach "${short}" – FINANCE_API_URL zeigt auf den ` +
        'Authentik-Login, nicht auf die App. Entweder direkt an den Container (Port 8080) oder den Pfad ' +
        '/token-api nutzen und am Proxy von der Anmeldung ausnehmen. Siehe README (MCP-Server).',
    )
  }

  const text = await res.text()
  let payload = null
  try { payload = text ? JSON.parse(text) : null } catch { /* kein JSON */ }

  if (!res.ok) {
    const detail = payload?.error || text.slice(0, 200) || '(keine Antwort)'
    if (res.status === 401) {
      throw new Error(`Nicht angemeldet (HTTP 401): ${detail} – FINANCE_API_TOKEN prüfen (siehe README).`)
    }
    throw new Error(`API ${method} ${path} -> HTTP ${res.status}: ${detail}`)
  }
  return payload
}

// Lädt den kompletten Datenstand und bringt ihn in die Form, die src/lib erwartet.
async function loadData() {
  const { manual, categoryOverrides, categories } = await callApi('GET', '/data')
  return {
    data: {
      accounts: manual.accounts || [],
      incomes: manual.incomes || [],
      standingOrders: manual.standingOrders || [],
      transfers: manual.transfers || [],
      debts: manual.debts || [],
    },
    overrides: categoryOverrides || {},
    categories: categories || [],
  }
}

const server = new McpServer({ name: 'privatefinance', version: '2.0.0' })

// --- Schreibende Tools je Sammlung ------------------------------------------
//  Für jede Sammlung entstehen create_*, update_* und delete_*. Die Felder
//  entsprechen 1:1 denen der API (server/index.js, COLLECTIONS); der Server
//  ergänzt Defaults und berechnet abgeleitete Felder.

const RHYTHM = z
  .enum(['monthly', 'quarterly', 'yearly'])
  .describe('monatlich / vierteljährlich / jährlich; Auswertungen rechnen auf Monatsbasis um')

const SPLIT = z
  .object({
    mode: z.enum(['even', 'single', 'percent', 'amount']),
    person: z.string().optional().describe('nur bei mode "single"'),
    shares: z
      .record(z.string(), z.number())
      .optional()
      .describe('nur bei mode "percent"/"amount", z. B. { "Duncan": 60, "Elisa": 40 }'),
  })
  .describe('Aufteilung auf die Personen: even = gleichmäßig, single = eine Person, percent = Prozent, amount = feste Beträge')

const COLLECTIONS = {
  account: {
    path: 'accounts',
    noun: 'Konto',
    plural: 'Konten',
    create: {
      name: z.string(),
      type: z.enum(['personal', 'joint']).optional().describe('personal = Privatkonto (owner = Person), joint = gemeinsames Konto; Default joint'),
      owner: z.string().optional().describe('bei Privatkonten die Person, aus der die Auswertung entsteht'),
      balance: z.number().optional(),
      goal: z.number().nullable().optional().describe('optionales Sparziel in €'),
      color: z.string().optional(),
      currency: z.string().optional(),
    },
  },
  income: {
    path: 'incomes',
    noun: 'Einnahme',
    plural: 'Einnahmen',
    create: {
      name: z.string(),
      amount: z.number(),
      accountId: z.string().describe('Zielkonto (üblicherweise das Privatkonto der Person)'),
      rhythm: RHYTHM.optional(),
      executionDay: z.number().int().min(1).max(31).optional(),
    },
  },
  standing_order: {
    path: 'standing-orders',
    noun: 'Posten (Fixkosten/Abo)',
    plural: 'Fixkosten und Abos',
    create: {
      recipient: z.string(),
      amount: z.number(),
      accountId: z.string().describe('Abbuchungskonto'),
      rhythm: RHYTHM.optional(),
      category: z.string().optional().describe('ohne Angabe per Schlüsselwort automatisch zugeordnet; "Sparen" zählt als Rücklage, nicht als Kosten'),
      kind: z.enum(['fixed', 'subscription']).optional(),
      executionDay: z.number().int().min(1).max(31).optional(),
      dueMonth: z.number().int().min(1).max(12).nullable().optional().describe('Fälligkeitsmonat für jährliche/vierteljährliche Posten'),
      endDate: z.string().nullable().optional().describe('letzte Zahlung (YYYY-MM-DD), z. B. Ratenkauf oder gekündigtes Abo'),
      split: SPLIT.optional(),
    },
  },
  transfer: {
    path: 'transfers',
    noun: 'Umbuchung',
    plural: 'Umbuchungen',
    create: {
      label: z.string(),
      amount: z.number(),
      fromAccountId: z.string(),
      toAccountId: z.string(),
      rhythm: RHYTHM.optional(),
    },
  },
  debt: {
    path: 'debts',
    noun: 'Schuld',
    plural: 'Schulden',
    create: {
      name: z.string(),
      totalAmount: z.number(),
      creditor: z.string().optional(),
      remainingAmount: z.number().optional().describe('Restschuld; ohne Angabe = totalAmount'),
      rate: z.number().optional().describe('Rate je Rhythmus'),
      rhythm: RHYTHM.optional(),
      accountId: z.string().nullable().optional(),
      priority: z.number().int().optional().describe('Tilgungsreihenfolge'),
      priorityUnknown: z.boolean().optional().describe('true = Reihenfolge unklar; zählt nicht in die Tilgungs-KPI'),
    },
  },
}

// Alle Felder optional – beim Ändern wird nur Gesendetes angefasst.
const optionalShape = (shape) =>
  Object.fromEntries(Object.entries(shape).map(([key, schema]) => [key, schema.optional()]))

for (const [key, col] of Object.entries(COLLECTIONS)) {
  server.registerTool(
    `create_${key}`,
    {
      title: `${col.noun} anlegen`,
      description: `Legt ${col.noun} neu an. Die Id wird vom Server erzeugt und zurückgegeben.`,
      inputSchema: col.create,
    },
    async (input) => {
      try {
        const { item } = await callApi('POST', `/items/${col.path}`, input)
        return ok({ created: item })
      } catch (err) {
        return fail(err.message)
      }
    },
  )

  server.registerTool(
    `update_${key}`,
    {
      title: `${col.noun} ändern`,
      description:
        `Ändert ${col.noun}. Nur die übergebenen Felder werden angefasst, der Rest bleibt unverändert. ` +
        `Ids liefert list_${col.path.replace(/-/g, '_')}.`,
      inputSchema: { id: z.string(), ...optionalShape(col.create) },
    },
    async ({ id, ...patch }) => {
      try {
        if (!Object.keys(patch).length) return fail('Keine Änderung übergeben – mindestens ein Feld angeben.')
        const { item } = await callApi('PATCH', `/items/${col.path}/${encodeURIComponent(id)}`, patch)
        return ok({ updated: item })
      } catch (err) {
        return fail(err.message)
      }
    },
  )

  server.registerTool(
    `delete_${key}`,
    {
      title: `${col.noun} löschen`,
      description: `Löscht ${col.noun} endgültig. Gibt den gelöschten Datensatz zurück.`,
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      try {
        const { deleted } = await callApi('DELETE', `/items/${col.path}/${encodeURIComponent(id)}`)
        return ok({ deleted })
      } catch (err) {
        return fail(err.message)
      }
    },
  )
}

// --- Konten -----------------------------------------------------------------
server.registerTool(
  'list_accounts',
  { title: 'Konten auflisten', description: 'Listet alle Konten (privat + gemeinsam) mit Id, Inhaber, Typ und Saldo.' },
  async () => {
    try {
      const { data } = await loadData()
      return ok({ source: API_BASE, count: data.accounts.length, accounts: data.accounts })
    } catch (err) {
      return fail(err.message)
    }
  },
)

// --- Fixkosten & Abos -------------------------------------------------------
server.registerTool(
  'list_standing_orders',
  {
    title: 'Fixkosten & Abos auflisten',
    description:
      'Listet Fixkosten und Abos inkl. Id und normalisierter Monatskosten. Optional filtern nach Art ' +
      '(fixed/subscription), Konto oder Suchtext im Empfänger. Beendete Posten (endDate überschritten) ' +
      'sind standardmäßig ausgeblendet.',
    inputSchema: {
      kind: z.enum(['fixed', 'subscription']).optional(),
      accountId: z.string().optional(),
      search: z.string().optional().describe('Teiltext im Empfängernamen, Groß-/Kleinschreibung egal'),
      includeEnded: z.boolean().optional().describe('true = auch beendete Posten zeigen'),
    },
  },
  async ({ kind, accountId, search, includeEnded }) => {
    try {
      const { data, overrides } = await loadData()
      const accById = Object.fromEntries(data.accounts.map((a) => [a.id, a]))
      let rows = data.standingOrders.map((so) => ({
        id: so.id,
        recipient: so.recipient,
        amount: so.amount,
        rhythm: so.rhythm,
        kind: so.kind || 'fixed',
        accountId: so.accountId,
        account: accById[so.accountId]?.name || so.accountId,
        category: effectiveCategoryOf(so, overrides),
        monthlyCost: round(toMonthly(so.amount, so.rhythm)),
        executionDay: so.executionDay,
        ...(so.dueMonth ? { dueMonth: so.dueMonth } : {}),
        ...(so.endDate ? { endDate: so.endDate } : {}),
        active: isOrderActive(so),
        split: so.split || { mode: 'even' },
      }))
      if (!includeEnded) rows = rows.filter((r) => r.active)
      if (kind) rows = rows.filter((r) => r.kind === kind)
      if (accountId) rows = rows.filter((r) => r.accountId === accountId)
      if (search) {
        const needle = search.toLowerCase()
        rows = rows.filter((r) => r.recipient.toLowerCase().includes(needle))
      }
      rows.sort((a, b) => b.monthlyCost - a.monthlyCost)
      return ok({ source: API_BASE, count: rows.length, standingOrders: rows })
    } catch (err) {
      return fail(err.message)
    }
  },
)

// --- Einnahmen / Umbuchungen / Schulden -------------------------------------
const listTools = [
  { name: 'list_incomes', title: 'Einnahmen auflisten', key: 'incomes', monthlyOf: (i) => toMonthly(i.amount, i.rhythm),
    description: 'Listet die Einnahmen inkl. Id, Zielkonto und monatlich normalisiertem Betrag.' },
  { name: 'list_transfers', title: 'Umbuchungen auflisten', key: 'transfers', monthlyOf: (t) => toMonthly(t.amount, t.rhythm || 'monthly'),
    description: 'Listet die expliziten Überträge zwischen zwei Konten (z. B. Sparen aufs Urlaubskonto).' },
  { name: 'list_debts', title: 'Schulden auflisten', key: 'debts', monthlyOf: (d) => toMonthly(Number(d.rate) || 0, d.rhythm),
    description: 'Listet die Schulden inkl. Restschuld und monatlicher Tilgungsrate.' },
]

for (const tool of listTools) {
  server.registerTool(tool.name, { title: tool.title, description: tool.description }, async () => {
    try {
      const { data } = await loadData()
      const accById = Object.fromEntries(data.accounts.map((a) => [a.id, a]))
      const rows = data[tool.key].map((row) => ({
        ...row,
        monthly: round(tool.monthlyOf(row)),
        ...(row.accountId ? { account: accById[row.accountId]?.name || row.accountId } : {}),
        ...(row.fromAccountId ? { from: accById[row.fromAccountId]?.name || row.fromAccountId } : {}),
        ...(row.toAccountId ? { to: accById[row.toAccountId]?.name || row.toAccountId } : {}),
      }))
      return ok({ source: API_BASE, count: rows.length, [tool.key]: rows })
    } catch (err) {
      return fail(err.message)
    }
  })
}

// --- Cashflow-Analyse (= „Export für Claude") -------------------------------
server.registerTool(
  'analyze_cashflow',
  {
    title: 'Haushalt analysieren',
    description: 'Liefert die komplette analyse-fertige Struktur: Konten, Einnahmen, Fixkosten/Abos, Kosten je Konto, Geldfluss und Kosten je Person.',
  },
  async () => {
    try {
      const { data, overrides } = await loadData()
      return ok({ source: API_BASE, ...buildClaudeExport(data, overrides) })
    } catch (err) {
      return fail(err.message)
    }
  },
)

// --- Kosten je Kategorie ----------------------------------------------------
server.registerTool(
  'expenses_by_category',
  { title: 'Kosten je Kategorie', description: 'Monatliche Fixkosten/Abos summiert je Kategorie.' },
  async () => {
    try {
      const { data, overrides } = await loadData()
      const totals = monthlyByCategory(data, overrides)
      const rounded = Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, round(v)]))
      return ok({ source: API_BASE, costsByCategory: rounded })
    } catch (err) {
      return fail(err.message)
    }
  },
)

// --- Kosten je Konto --------------------------------------------------------
server.registerTool(
  'costs_by_account',
  { title: 'Kosten je Konto', description: 'Monatlich aufs Konto zu buchender Betrag je Konto (Fixkosten/Abos, jährlich ÷ 12), inkl. Rücklage-Anteil und Jahreswert.' },
  async () => {
    try {
      const { data } = await loadData()
      const byAccount = monthlyByAccount(data).map((a) => ({
        accountId: a.account.id,
        account: a.account.name, type: a.account.type,
        fixed: round(a.fixed), subscription: round(a.subscription),
        reserve: round(a.reserve), total: round(a.total), perYear: round(a.total * 12),
      }))
      return ok({ source: API_BASE, byAccount })
    } catch (err) {
      return fail(err.message)
    }
  },
)

// --- Kosten je Person -------------------------------------------------------
server.registerTool(
  'person_summary',
  { title: 'Kosten je Person', description: 'Pro Person: Gesamtkosten (Summe der Anteile), Sparen, Einkommen und Überschuss (pro Monat).' },
  async () => {
    try {
      const { data } = await loadData()
      const persons = personSummary(data).map((p) => ({
        person: p.person, totalCosts: round(p.costs), savings: round(p.savings),
        income: round(p.income), surplus: round(p.surplus),
      }))
      return ok({ source: API_BASE, persons })
    } catch (err) {
      return fail(err.message)
    }
  },
)

// --- Anstehende Zahlungen ---------------------------------------------------
server.registerTool(
  'upcoming_payments',
  {
    title: 'Anstehende Zahlungen',
    description: 'Posten, die in den nächsten Tagen fällig werden (dynamisch aus rhythm/executionDay/dueMonth berechnet).',
    inputSchema: { days: z.number().int().min(1).max(365).optional().describe('Zeitfenster in Tagen, Default 30') },
  },
  async ({ days }) => {
    try {
      const { data } = await loadData()
      const rows = upcomingPayments(data, days || 30).map((p) => ({
        id: p.id,
        recipient: p.recipient,
        amount: p.amount,
        rhythm: p.rhythm,
        account: p.account?.name || p.accountId,
        dueOn: p.nextExecution,
        daysUntil: p.daysUntil,
      }))
      return ok({ source: API_BASE, days: days || 30, count: rows.length, upcoming: rows })
    } catch (err) {
      return fail(err.message)
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
console.error(`privatefinance MCP-Server läuft (stdio), API: ${API_BASE}${API_TOKEN ? '' : ' – ohne Token (nur lokal mit DEV_USER)'}`)
