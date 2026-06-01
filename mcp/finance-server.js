#!/usr/bin/env node
// =============================================================================
//  mcp/finance-server.js — MCP-Server für direkten Claude-Zugriff
// =============================================================================
//  Stellt die Haushalts-Finanzdaten als MCP-Tools bereit, damit Claude (Code /
//  Desktop) direkt darauf zugreifen kann – ohne JSON-Export.
//
//  Datenquelle: public/data.json (falls vorhanden, echte Daten vom Fetch-Skript),
//  sonst die Mock-Daten aus src/data/mockData.js.
//
//  Start:  npm run mcp     (bzw. node mcp/finance-server.js)
//  Einbindung in Claude: siehe README.md, Abschnitt „MCP".
// =============================================================================

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { mockData } from '../src/data/mockData.js'
import { buildClaudeExport } from '../src/lib/claudeExport.js'
import { toMonthly } from '../src/lib/normalize.js'
import { effectiveCategoryOf, expensesByCategory } from '../src/lib/selectors.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'public', 'data.json')

// Lädt echte Daten, sonst Mock.
function loadData() {
  if (existsSync(DATA_PATH)) {
    try {
      const json = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
      if (json && Array.isArray(json.accounts) && json.accounts.length) {
        return { data: json, source: 'live' }
      }
    } catch {
      /* fällt auf Mock zurück */
    }
  }
  return { data: mockData, source: 'mock' }
}

const ok = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] })

const server = new McpServer({ name: 'privatefinance', version: '1.0.0' })

// --- Tool: Konten -----------------------------------------------------------
server.registerTool(
  'list_accounts',
  {
    title: 'Konten auflisten',
    description: 'Listet alle Konten (Gemeinschaftskonto + Privatkonten) mit Saldo und Typ.',
  },
  async () => {
    const { data, source } = loadData()
    return ok({ source, accounts: data.accounts })
  },
)

// --- Tool: Daueraufträge ----------------------------------------------------
server.registerTool(
  'list_standing_orders',
  {
    title: 'Daueraufträge auflisten',
    description:
      'Listet Daueraufträge inkl. normalisierter Monatskosten und ob sie übers ' +
      'Gemeinschaftskonto laufen. Optional nur die, die noch übers Privatkonto laufen.',
    inputSchema: { onlyPersonal: z.boolean().optional() },
  },
  async ({ onlyPersonal }) => {
    const { data, source } = loadData()
    const accById = Object.fromEntries(data.accounts.map((a) => [a.id, a]))
    let rows = (data.standingOrders || []).map((so) => {
      const acc = accById[so.accountId]
      return {
        recipient: so.recipient,
        amount: so.amount,
        rhythm: so.rhythm,
        nextExecution: so.nextExecution,
        account: acc?.name || so.accountId,
        category: effectiveCategoryOf(so, {}),
        monthlyCost: Number(toMonthly(so.amount, so.rhythm).toFixed(2)),
        runsOnJoint: acc?.type === 'joint',
      }
    })
    if (onlyPersonal) rows = rows.filter((r) => !r.runsOnJoint)
    rows.sort((a, b) => b.monthlyCost - a.monthlyCost)
    return ok({ source, count: rows.length, standingOrders: rows })
  },
)

// --- Tool: Cashflow-Analyse (= der „Export für Claude") ---------------------
server.registerTool(
  'analyze_cashflow',
  {
    title: 'Cashflow analysieren',
    description:
      'Liefert die analyse-fertige Cashflow-Struktur inkl. Haushaltsmodell, allen ' +
      'Daueraufträgen und der Liste der Umstell-Kandidaten (laufen noch übers Privatkonto).',
  },
  async () => {
    const { data, source } = loadData()
    return ok({ source, ...buildClaudeExport(data, {}) })
  },
)

// --- Tool: Ausgaben je Kategorie --------------------------------------------
server.registerTool(
  'expenses_by_category',
  {
    title: 'Ausgaben je Kategorie',
    description: 'Summiert die Ausgaben je Kategorie über alle vorhandenen Transaktionen.',
  },
  async () => {
    const { data, source } = loadData()
    const totals = expensesByCategory(data.transactions || [], {})
    const rounded = Object.fromEntries(
      Object.entries(totals).map(([k, v]) => [k, Number(v.toFixed(2))]),
    )
    return ok({ source, expensesByCategory: rounded })
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
// Hinweis auf stderr, damit stdout (JSON-RPC) sauber bleibt.
console.error('privatefinance MCP-Server läuft (stdio).')
