#!/usr/bin/env node
// =============================================================================
//  mcp/finance-server.js — MCP-Server für direkten Claude-Zugriff
// =============================================================================
//  Stellt die manuell gepflegten Haushalts-Finanzdaten als MCP-Tools bereit.
//
//  Datenquelle: die Demo-Daten aus src/data/mockData.js. (Die echten Eingaben
//  der App liegen im Browser-localStorage und sind hier nicht zugänglich –
//  nutze für eine Analyse der echten Zahlen den „Export für Claude" der App.)
//
//  Start:  npm run mcp     (bzw. node mcp/finance-server.js)
// =============================================================================

import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { mockData } from '../src/data/mockData.js'
import { buildClaudeExport } from '../src/lib/claudeExport.js'
import { toMonthly } from '../src/lib/normalize.js'
import { effectiveCategoryOf } from '../src/lib/selectors.js'
import {
  monthlyByAccount,
  monthlyByCategory,
  personSummary,
} from '../src/lib/recurring.js'
import { buildPaymentSchedule } from '../src/lib/timing.js'

const data = mockData
const source = 'mock'
const round = (n) => Number((n || 0).toFixed(2))
const ok = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] })

const server = new McpServer({ name: 'privatefinance', version: '1.0.0' })

// --- Konten -----------------------------------------------------------------
server.registerTool(
  'list_accounts',
  { title: 'Konten auflisten', description: 'Listet alle Konten (privat + gemeinsam) mit Inhaber, Typ und Startsaldo.' },
  async () => ok({ source, accounts: data.accounts }),
)

// --- Fixkosten & Abos -------------------------------------------------------
server.registerTool(
  'list_standing_orders',
  {
    title: 'Fixkosten & Abos auflisten',
    description: 'Listet Fixkosten und Abos inkl. normalisierter Monatskosten. Optional nach Art (fixed/subscription) filtern.',
    inputSchema: { kind: z.enum(['fixed', 'subscription']).optional() },
  },
  async ({ kind }) => {
    const accById = Object.fromEntries(data.accounts.map((a) => [a.id, a]))
    let rows = (data.standingOrders || []).map((so) => ({
      recipient: so.recipient,
      amount: so.amount,
      rhythm: so.rhythm,
      kind: so.kind || 'fixed',
      account: accById[so.accountId]?.name || so.accountId,
      category: effectiveCategoryOf(so, {}),
      monthlyCost: round(toMonthly(so.amount, so.rhythm)),
    }))
    if (kind) rows = rows.filter((r) => r.kind === kind)
    rows.sort((a, b) => b.monthlyCost - a.monthlyCost)
    return ok({ source, count: rows.length, standingOrders: rows })
  },
)

// --- Cashflow-Analyse (= „Export für Claude") -------------------------------
server.registerTool(
  'analyze_cashflow',
  {
    title: 'Haushalt analysieren',
    description: 'Liefert die komplette analyse-fertige Struktur: Konten, Einnahmen, Fixkosten/Abos, Kosten je Konto, Deckung und Kosten je Person.',
  },
  async () => ok({ source, ...buildClaudeExport(data, {}) }),
)

// --- Kosten je Kategorie ----------------------------------------------------
server.registerTool(
  'expenses_by_category',
  { title: 'Kosten je Kategorie', description: 'Monatliche Fixkosten/Abos summiert je Kategorie.' },
  async () => {
    const totals = monthlyByCategory(data, {})
    const rounded = Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, round(v)]))
    return ok({ source, costsByCategory: rounded })
  },
)

// --- Kosten je Konto --------------------------------------------------------
server.registerTool(
  'costs_by_account',
  { title: 'Kosten je Konto', description: 'Monatlich aufs Konto zu buchender Betrag je Konto (Fixkosten/Abos, jährlich ÷ 12), inkl. Rücklage-Anteil und Jahreswert.' },
  async () => {
    const byAccount = monthlyByAccount(data).map((a) => ({
      account: a.account.name, type: a.account.type,
      fixed: round(a.fixed), subscription: round(a.subscription),
      reserve: round(a.reserve), total: round(a.total), perYear: round(a.total * 12),
    }))
    return ok({ source, byAccount })
  },
)

// --- Kosten je Person -------------------------------------------------------
server.registerTool(
  'person_summary',
  { title: 'Kosten je Person', description: 'Pro Person: private Kosten, Verteilung, Gesamtkosten, Einkommen und Überschuss (pro Monat).' },
  async () => {
    const persons = personSummary(data).map((p) => ({
      person: p.person, personalCosts: round(p.personalCosts), allocations: round(p.allocations),
      totalCosts: round(p.costs), income: round(p.income), surplus: round(p.surplus),
    }))
    return ok({ source, persons })
  },
)

// --- Zahlungslauf / Timing --------------------------------------------------
server.registerTool(
  'payment_schedule',
  {
    title: 'Zahlungslauf / Timing prüfen',
    description: 'Prüft je gemeinsamem Konto die Reihenfolge aus Verteilung und Buchungen: nötiger Mindest-Puffer und ob alles rechtzeitig gedeckt ist.',
    inputSchema: { accountId: z.string().optional() },
  },
  async ({ accountId }) => {
    const sched = buildPaymentSchedule(data, accountId || null)
    if (!sched) return ok({ source, error: 'Kein gemeinsames Konto gefunden.' })
    const { joint, timelineLabels, flowOnly, withBuffer, ...rest } = sched
    return ok({ source, account: joint.name, ...rest })
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('privatefinance MCP-Server läuft (stdio).')
