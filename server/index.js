import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { timingSafeEqual } from 'node:crypto'
import express from 'express'
import { PrismaClient } from '@prisma/client'

import { ACCOUNT_PALETTE } from '../src/lib/accountColors.js'
import { autoCategorize } from '../src/lib/categories.js'
import { nextDueDate } from '../src/lib/selectors.js'
import { parseAmountDE } from '../src/lib/orderForm.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const app = express()
app.use(express.json({ limit: '5mb' }))

const BACKUP_TYPE = 'privatefinance-backup'

// Elisa und Duncan (all seine Accounts) teilen sich die Haushaltsdaten,
// jeder andere Authentik-Nutzer bekommt seine eigene, isolierte Gruppe.
const SHARED_USERS = ['elisa', 'wesseler', 'akadmin']
// Nur für die lokale Entwicklung ohne Authentik: DEV_USER=wesseler setzen.
// In Produktion ist die Variable nicht gesetzt.
const DEV_USER = process.env.DEV_USER

// --- Authentifizierung -------------------------------------------------------
// Zwei Wege, sich auszuweisen:
//  1. Browser: Authentik (Forward-Auth-Proxy) setzt `x-authentik-username`.
//  2. Nicht-interaktive Clients (MCP-Server, Skripte): ein Token in
//     FINANCE_API_TOKEN, gesendet als `X-Api-Key: <token>` oder
//     `Authorization: Bearer <token>`. Das Token handelt als Nutzer
//     FINANCE_API_USER und bekommt damit dieselbe Gruppe wie die Oberfläche.
// Ohne gesetztes FINANCE_API_TOKEN ist Weg 2 komplett aus (kein Default-Token).
const API_TOKEN = process.env.FINANCE_API_TOKEN || ''
const API_USER = process.env.FINANCE_API_USER || 'wesseler'
// Optional: `x-authentik-username` nur von diesen Absender-IPs akzeptieren
// (die des Authentik-Outposts/Reverse-Proxys). Leer = wie bisher jede IP.
// Nötig, weil die App im Docker-Netzmodus `host` auf Port 8080 auch direkt im
// LAN/Tailnet erreichbar ist – dort könnte sonst jeder den Header selbst setzen.
const TRUSTED_PROXIES = (process.env.FINANCE_TRUSTED_PROXIES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function presentedToken(req) {
  const apiKey = req.headers['x-api-key']
  if (typeof apiKey === 'string' && apiKey.trim()) return apiKey.trim()
  const auth = req.headers.authorization
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7).trim()
  return null
}

// Token-Vergleich in konstanter Zeit (kein zeichenweises Abtasten möglich).
function tokenMatches(given) {
  const a = Buffer.from(given)
  const b = Buffer.from(API_TOKEN)
  return a.length === b.length && timingSafeEqual(a, b)
}

function tokenUser(req) {
  if (!API_TOKEN) return null
  const given = presentedToken(req)
  return given && tokenMatches(given) ? API_USER : null
}

function proxyIsTrusted(req) {
  if (!TRUSTED_PROXIES.length) return true
  // ::ffff:1.2.3.4 (IPv4-mapped) auf die reine IPv4-Adresse reduzieren.
  const ip = String(req.socket?.remoteAddress || '').replace(/^::ffff:/, '')
  return TRUSTED_PROXIES.includes(ip)
}

function currentUser(req) {
  const byToken = tokenUser(req)
  if (byToken) return byToken
  // Der Token-Mount (/token-api) ignoriert den Authentik-Header bewusst: dieser
  // Pfad darf am Proxy von der Authentik-Prüfung ausgenommen werden, ein dort
  // mitgesendeter Header wäre also frei wählbar.
  if (req.tokenOnly) return null
  const username = req.headers['x-authentik-username']
  if (typeof username === 'string' && username.trim() && proxyIsTrusted(req)) return username.trim()
  return DEV_USER || null
}

function resolveGroup(req) {
  const username = currentUser(req)
  return SHARED_USERS.includes(username) ? 'familie' : username
}

async function loadManual(groupId) {
  const [accounts, incomes, standingOrders, transfers, overrides, debts, categories] = await Promise.all([
    prisma.account.findMany({ where: { groupId } }),
    prisma.income.findMany({ where: { groupId } }),
    prisma.standingOrder.findMany({ where: { groupId } }),
    prisma.transfer.findMany({ where: { groupId } }),
    prisma.categoryOverride.findMany({ where: { groupId } }),
    prisma.debt.findMany({ where: { groupId } }),
    prisma.category.findMany({ where: { groupId } }),
  ])
  const categoryOverrides = Object.fromEntries(overrides.map((o) => [o.itemId, o.categoryId]))
  return { manual: { accounts, incomes, standingOrders, transfers, debts }, categoryOverrides, categories }
}

// Full-Replace innerhalb der eigenen Gruppe, analog zum bisherigen localStorage setItem-Verhalten.
// WICHTIG: Eine Tabelle wird nur angefasst (gelöscht + neu angelegt), wenn ihr
// Schlüssel im übergebenen manual-Objekt tatsächlich vorhanden ist. Aufrufer,
// die (wie die Settings-Seite) nur einen Teil der Felder kennen und senden,
// dürfen dadurch nicht versehentlich die übrigen Tabellen leeren (das war der
// Bug, der zuvor bei jedem Speichern auf der Settings-Seite alle Schulden
// gelöscht hat, weil deren Payload kein debts-Feld enthält). Wer eine Tabelle
// wirklich leeren will, muss explizit ein leeres Array für dieses Feld senden.
async function replaceManual(tx, groupId, manual = {}) {
  if ('accounts' in manual) {
    await tx.account.deleteMany({ where: { groupId } })
    if (manual.accounts?.length) await tx.account.createMany({ data: manual.accounts.map((a) => ({ ...a, groupId })) })
  }
  if ('incomes' in manual) {
    await tx.income.deleteMany({ where: { groupId } })
    if (manual.incomes?.length) await tx.income.createMany({ data: manual.incomes.map((i) => ({ ...i, groupId })) })
  }
  if ('standingOrders' in manual) {
    await tx.standingOrder.deleteMany({ where: { groupId } })
    if (manual.standingOrders?.length) await tx.standingOrder.createMany({ data: manual.standingOrders.map((s) => ({ ...s, groupId })) })
  }
  if ('transfers' in manual) {
    await tx.transfer.deleteMany({ where: { groupId } })
    if (manual.transfers?.length) await tx.transfer.createMany({ data: manual.transfers.map((t) => ({ ...t, groupId })) })
  }
  if ('debts' in manual) {
    await tx.debt.deleteMany({ where: { groupId } })
    if (manual.debts?.length) await tx.debt.createMany({ data: manual.debts.map((d) => ({ ...d, groupId })) })
  }
}

async function replaceCategoryOverrides(tx, groupId, categoryOverrides = {}) {
  await tx.categoryOverride.deleteMany({ where: { groupId } })
  const rows = Object.entries(categoryOverrides).map(([itemId, categoryId]) => ({ itemId, categoryId, groupId }))
  if (rows.length) await tx.categoryOverride.createMany({ data: rows })
}

async function replaceCategories(tx, groupId, categories = []) {
  await tx.category.deleteMany({ where: { groupId } })
  if (categories.length) {
    await tx.category.createMany({
      data: categories.map((c) => ({ id: c.id, isCustom: !!c.isCustom, label: c.label ?? null, color: c.color ?? null, groupId })),
    })
  }
}

// =============================================================================
//  Einzelne Posten (granular) – Grundlage für den MCP-Server
// =============================================================================
//  Die Oberfläche speichert immer ganze Listen (PUT /api/manual). Für
//  Automatisierung ist das unpraktisch und riskant: wer nur einen Betrag
//  korrigieren will, müsste alle anderen Posten fehlerfrei mitsenden. Die
//  Routen unten ändern deshalb genau einen Datensatz der eigenen Gruppe.
//  Abgeleitete Felder (monthInterval, nextExecution) berechnet der Server –
//  mit denselben Funktionen wie die Oberfläche (src/lib), damit beide Wege
//  dieselben Daten erzeugen.
// =============================================================================

const RHYTHMS = ['monthly', 'quarterly', 'yearly']

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
const badRequest = (msg) => new HttpError(400, msg)

// Ids im gleichen Format wie die in der Oberfläche angelegten Posten ("m…").
const newId = () => `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Übernimmt nur bekannte Felder. Ein unbekanntes Feld ist ein Fehler und wird
// nicht stillschweigend verworfen – sonst wirkt ein Tippfehler im Feldnamen wie
// eine erfolgreiche Änderung.
function pickFields(body, fields, label) {
  const out = {}
  Object.keys(body || {}).forEach((key) => {
    if (!fields.includes(key)) {
      throw badRequest(`Unbekanntes Feld "${key}" für ${label}. Erlaubt: ${fields.join(', ')}.`)
    }
    out[key] = body[key]
  })
  return out
}

function requireText(value, field, label) {
  const s = String(value ?? '').trim()
  if (!s) throw badRequest(`${field} fehlt für ${label}.`)
  return s
}

function checkRhythm(value) {
  const r = value ?? 'monthly'
  if (!RHYTHMS.includes(r)) throw badRequest(`Ungültiger rhythm "${r}". Erlaubt: ${RHYTHMS.join(', ')}.`)
  return r
}

function checkDay(value) {
  const n = Math.round(Number(value ?? 1))
  if (!Number.isFinite(n) || n < 1 || n > 31) throw badRequest('executionDay muss zwischen 1 und 31 liegen.')
  return n
}

function checkDueMonth(value, rhythm) {
  // dueMonth (1–12) verankert nicht-monatliche Posten im Jahr; monatliche haben keines.
  if (rhythm === 'monthly') return null
  if (value == null || value === '') return null
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < 1 || n > 12) throw badRequest('dueMonth muss zwischen 1 und 12 liegen.')
  return n
}

function checkEndDate(value) {
  if (value == null || value === '') return null
  const s = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw badRequest('endDate muss das Format YYYY-MM-DD haben.')
  return s
}

function checkAccount(accounts, accountId, { optional = false } = {}) {
  const known = () => accounts.map((a) => `${a.id} (${a.name})`).join(', ') || '– keine Konten angelegt –'
  if (!accountId) {
    if (optional) return null
    throw badRequest(`accountId fehlt. Verfügbare Konten: ${known()}.`)
  }
  if (!accounts.some((a) => a.id === accountId)) {
    throw badRequest(`Konto "${accountId}" existiert nicht. Verfügbar: ${known()}.`)
  }
  return accountId
}

// Aufteilung eines Postens auf die Personen (siehe recurring.js).
function checkSplit(split) {
  const mode = split?.mode || 'even'
  if (mode === 'even') return { mode: 'even' }
  if (mode === 'single') {
    return { mode: 'single', person: requireText(split.person, 'split.person', 'Aufteilung "single"') }
  }
  if (mode === 'percent' || mode === 'amount') {
    const entries = Object.entries(split.shares || {})
    if (!entries.length) {
      throw badRequest(`Aufteilung "${mode}" braucht split.shares, z. B. { "Duncan": 60, "Elisa": 40 }.`)
    }
    return { mode, shares: Object.fromEntries(entries.map(([person, v]) => [person, parseAmountDE(v)])) }
  }
  throw badRequest(`Ungültiger split.mode "${mode}". Erlaubt: even, single, percent, amount.`)
}

const COLLECTIONS = {
  accounts: {
    label: 'Konto',
    delegate: 'account',
    fields: ['name', 'owner', 'type', 'balance', 'color', 'goal', 'currency'],
    build(input, { accounts }) {
      const type = input.type ?? 'joint'
      if (type !== 'personal' && type !== 'joint') throw badRequest('type muss "personal" oder "joint" sein.')
      const name = requireText(input.name, 'name', 'Konto')
      return {
        name,
        // Bei Privatkonten ist owner die Person, aus der die Auswertung entsteht.
        owner: String(input.owner ?? (type === 'personal' ? name : 'Gemeinsam')).trim(),
        type,
        balance: parseAmountDE(input.balance ?? 0),
        color: input.color || ACCOUNT_PALETTE[accounts.length % ACCOUNT_PALETTE.length],
        goal: input.goal == null || input.goal === '' ? null : parseAmountDE(input.goal),
        currency: input.currency || 'EUR',
      }
    },
  },

  incomes: {
    label: 'Einnahme',
    delegate: 'income',
    fields: ['name', 'amount', 'rhythm', 'accountId', 'executionDay'],
    build(input, { accounts }) {
      return {
        name: requireText(input.name, 'name', 'Einnahme'),
        amount: parseAmountDE(input.amount ?? 0),
        rhythm: checkRhythm(input.rhythm),
        accountId: checkAccount(accounts, input.accountId),
        executionDay: checkDay(input.executionDay),
      }
    },
  },

  'standing-orders': {
    label: 'Posten (Fixkosten/Abo)',
    delegate: 'standingOrder',
    fields: ['recipient', 'amount', 'rhythm', 'accountId', 'category', 'kind', 'executionDay', 'dueMonth', 'endDate', 'split'],
    build(input, { accounts }) {
      const rhythm = checkRhythm(input.rhythm)
      const recipient = requireText(input.recipient, 'recipient', 'Posten')
      const order = {
        recipient,
        amount: parseAmountDE(input.amount ?? 0),
        rhythm,
        accountId: checkAccount(accounts, input.accountId),
        // Ohne Angabe die Auto-Kategorisierung nutzen (KEYWORD_RULES).
        category: input.category || autoCategorize(recipient),
        // 'savings' ist Alt-Datenbestand; Sparen läuft heute über category === 'Sparen'.
        kind: input.kind === 'subscription' ? 'subscription' : 'fixed',
        executionDay: checkDay(input.executionDay),
        dueMonth: checkDueMonth(input.dueMonth, rhythm),
        endDate: checkEndDate(input.endDate),
        split: checkSplit(input.split),
        monthInterval: rhythm === 'yearly' ? 12 : rhythm === 'quarterly' ? 3 : 1,
        // Beim Ändern als Zyklus-Anker für nextDueDate behalten (alte Posten ohne dueMonth).
        nextExecution: input.nextExecution || '',
      }
      const due = nextDueDate(order)
      order.nextExecution = due ? localISO(due) : ''
      return order
    },
  },

  transfers: {
    label: 'Umbuchung',
    delegate: 'transfer',
    fields: ['label', 'amount', 'fromAccountId', 'toAccountId', 'rhythm'],
    build(input, { accounts }) {
      const fromAccountId = checkAccount(accounts, input.fromAccountId)
      const toAccountId = checkAccount(accounts, input.toAccountId)
      if (fromAccountId === toAccountId) throw badRequest('fromAccountId und toAccountId müssen verschieden sein.')
      return {
        label: requireText(input.label, 'label', 'Umbuchung'),
        amount: parseAmountDE(input.amount ?? 0),
        fromAccountId,
        toAccountId,
        rhythm: checkRhythm(input.rhythm),
      }
    },
  },

  debts: {
    label: 'Schuld',
    delegate: 'debt',
    fields: ['name', 'creditor', 'totalAmount', 'remainingAmount', 'rate', 'rhythm', 'accountId', 'priority', 'priorityUnknown'],
    build(input, { accounts }) {
      const totalAmount = parseAmountDE(input.totalAmount ?? 0)
      return {
        name: requireText(input.name, 'name', 'Schuld'),
        creditor: String(input.creditor ?? '').trim(),
        totalAmount,
        remainingAmount: input.remainingAmount == null || input.remainingAmount === '' ? totalAmount : parseAmountDE(input.remainingAmount),
        rate: parseAmountDE(input.rate ?? 0),
        rhythm: checkRhythm(input.rhythm),
        accountId: checkAccount(accounts, input.accountId, { optional: true }),
        priority: Math.round(Number(input.priority ?? 0)) || 0,
        // "Reihenfolge noch unklar": zählt bewusst nicht in die Tilgungs-KPI.
        priorityUnknown: !!input.priorityUnknown,
      }
    },
  },
}

function collectionOf(name) {
  const col = COLLECTIONS[name]
  if (!col) throw badRequest(`Unbekannte Sammlung "${name}". Erlaubt: ${Object.keys(COLLECTIONS).join(', ')}.`)
  return col
}

// =============================================================================
//  Routen
// =============================================================================
//  Alle Routen hängen am Router unten und werden zweimal eingehängt (siehe
//  Mounts am Ende): unter /api wie bisher und unter /token-api nur mit Token.
//  Express 4 fängt Fehler aus async-Handlern nicht selbst ab – daher `wrap`.
const api = express.Router()
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next)

api.get('/data', wrap(async (req, res) => {
  res.json(await loadManual(resolveGroup(req)))
}))

api.put('/manual', wrap(async (req, res) => {
  const groupId = resolveGroup(req)
  await prisma.$transaction((tx) => replaceManual(tx, groupId, req.body))
  res.json(await loadManual(groupId))
}))

api.put('/category-overrides', wrap(async (req, res) => {
  const groupId = resolveGroup(req)
  await prisma.$transaction((tx) => replaceCategoryOverrides(tx, groupId, req.body))
  res.json(await loadManual(groupId))
}))

api.put('/categories', wrap(async (req, res) => {
  const groupId = resolveGroup(req)
  await prisma.$transaction((tx) => replaceCategories(tx, groupId, req.body))
  res.json(await loadManual(groupId))
}))

// --- Persönliche Ansichtseinstellungen --------------------------------------
// Pro Benutzer, nicht pro Gruppe (siehe Kommentar am Preference-Modell). Die
// Tabelle ist jung: läuft eine Instanz noch ohne `prisma db push`, fehlt sie.
// Das darf die Seite nicht lahmlegen, darum wird ein Fehler hier geschluckt
// und die Anordnung bleibt eben die Standardanordnung.
const prefUser = (req) => currentUser(req) || 'anonymous'

api.get('/preferences', wrap(async (req, res) => {
  try {
    const rows = await prisma.preference.findMany({ where: { userId: prefUser(req) } })
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])))
  } catch (err) {
    console.warn('Einstellungen nicht lesbar:', err.message)
    res.json({})
  }
}))

api.put('/preferences/:key', wrap(async (req, res) => {
  const key = String(req.params.key || '').slice(0, 64)
  if (!key) throw badRequest('Kein Schlüssel angegeben.')
  const value = req.body?.value
  if (value === undefined) throw badRequest('Kein Wert angegeben.')
  const userId = prefUser(req)
  try {
    await prisma.preference.upsert({
      where: { userId_key: { userId, key } },
      update: { value },
      create: { userId, key, value },
    })
    res.json({ ok: true })
  } catch (err) {
    console.warn('Einstellung nicht speicherbar:', err.message)
    res.status(503).json({ error: 'Einstellung konnte nicht gespeichert werden.' })
  }
}))

api.post('/restore', wrap(async (req, res) => {
  const backup = req.body
  if (!backup || backup.type !== BACKUP_TYPE || typeof backup.manual !== 'object') {
    return res.status(400).json({ error: 'Keine gültige PrivateFinance-Datensicherung.' })
  }
  const groupId = resolveGroup(req)
  await prisma.$transaction(async (tx) => {
    await replaceManual(tx, groupId, backup.manual)
    await replaceCategoryOverrides(tx, groupId, backup.categoryOverrides)
  })
  res.json(await loadManual(groupId))
}))

api.get('/items/:collection', wrap(async (req, res) => {
  const col = collectionOf(req.params.collection)
  const items = await prisma[col.delegate].findMany({ where: { groupId: resolveGroup(req) } })
  res.json({ items })
}))

api.post('/items/:collection', wrap(async (req, res) => {
  const col = collectionOf(req.params.collection)
  const groupId = resolveGroup(req)
  const input = pickFields(req.body, col.fields, col.label)
  const accounts = await prisma.account.findMany({ where: { groupId } })
  const item = await prisma[col.delegate].create({
    data: { ...col.build(input, { accounts }), id: newId(), groupId },
  })
  res.status(201).json({ item })
}))

api.patch('/items/:collection/:id', wrap(async (req, res) => {
  const col = collectionOf(req.params.collection)
  const groupId = resolveGroup(req)
  const { id } = req.params
  const existing = await prisma[col.delegate].findFirst({ where: { id, groupId } })
  if (!existing) throw new HttpError(404, `${col.label} "${id}" nicht gefunden.`)
  const patch = pickFields(req.body, col.fields, col.label)
  const accounts = await prisma.account.findMany({ where: { groupId } })
  const item = await prisma[col.delegate].update({
    where: { id },
    data: col.build({ ...existing, ...patch }, { accounts }),
  })
  // Ein manuelles Kategorie-Override würde die neue Kategorie überstimmen
  // (effectiveCategoryOf: Override > item.category) – deshalb entfernen.
  if ('category' in patch) await prisma.categoryOverride.deleteMany({ where: { itemId: id, groupId } })
  res.json({ item })
}))

// Ein Konto, auf das noch Posten gebucht sind, darf nicht verschwinden – sonst
// zeigen Auswertungen und Geldfluss auf eine Id, die es nicht mehr gibt.
async function accountReferences(groupId, accountId) {
  const [orders, incomes, transfers, debts] = await Promise.all([
    prisma.standingOrder.findMany({ where: { groupId, accountId } }),
    prisma.income.findMany({ where: { groupId, accountId } }),
    prisma.transfer.findMany({ where: { groupId } }),
    prisma.debt.findMany({ where: { groupId, accountId } }),
  ])
  const refs = []
  if (orders.length) refs.push(`${orders.length}× Fixkosten/Abos`)
  if (incomes.length) refs.push(`${incomes.length}× Einnahmen`)
  const touched = transfers.filter((t) => t.fromAccountId === accountId || t.toAccountId === accountId)
  if (touched.length) refs.push(`${touched.length}× Umbuchungen`)
  if (debts.length) refs.push(`${debts.length}× Schulden`)
  return refs
}

api.delete('/items/:collection/:id', wrap(async (req, res) => {
  const col = collectionOf(req.params.collection)
  const groupId = resolveGroup(req)
  const { id } = req.params
  const existing = await prisma[col.delegate].findFirst({ where: { id, groupId } })
  if (!existing) throw new HttpError(404, `${col.label} "${id}" nicht gefunden.`)
  if (col.delegate === 'account') {
    const refs = await accountReferences(groupId, id)
    if (refs.length) {
      throw new HttpError(409, `Konto "${existing.name}" wird noch verwendet (${refs.join(', ')}). ` +
        'Diese Posten zuerst auf ein anderes Konto umhängen oder löschen.')
    }
  }
  await prisma[col.delegate].delete({ where: { id } })
  await prisma.categoryOverride.deleteMany({ where: { itemId: id, groupId } })
  res.json({ deleted: existing })
}))

// Fehler als JSON (sonst liefert Express HTML-Stacktraces an API-Clients).
api.use((err, req, res, next) => {
  const status = err?.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({ error: err?.message || 'Unerwarteter Fehler.' })
})

// Ohne angemeldeten Authentik-Nutzer (oder gültiges Token) gibt es keine Daten.
// Früher fiel eine Anfrage ohne Header auf die Familien-Daten zurück – das hätte
// jeder bekommen, der die App am Authentik-Login vorbei direkt im LAN aufruft.
const requireUser = (req, res, next) => {
  if (!currentUser(req)) {
    return res.status(401).json({ error: 'Nicht angemeldet – bitte über https://finance.wesseler.uk öffnen.' })
  }
  next()
}

// /api — wie bisher: Authentik-Header (Browser) oder Token.
app.use('/api', requireUser, api)
// /token-api — ausschließlich Token. Dieser Pfad darf am Authentik-Proxy von der
// Anmeldung ausgenommen werden ("Unauthenticated Paths"), ohne dass die
// Oberfläche darunter leidet: ein mitgesendeter Authentik-Header wird hier
// ignoriert, es zählt nur FINANCE_API_TOKEN.
app.use('/token-api', (req, res, next) => { req.tokenOnly = true; next() }, requireUser, api)

app.use(express.static(path.join(__dirname, '..', 'dist')))
// SPA-Fallback. Als RegExp statt '*', damit die Route unter Express 4 und 5
// funktioniert (Express 5 lehnt den String '*' ab).
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`privatefinance listening on :${port}`))
