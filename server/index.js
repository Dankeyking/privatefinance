import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const app = express()
app.use(express.json({ limit: '5mb' }))

const BACKUP_TYPE = 'privatefinance-backup'

// Elisa und Duncan (all seine Accounts) teilen sich die Haushaltsdaten,
// jeder andere Authentik-Nutzer bekommt seine eigene, isolierte Gruppe.
const SHARED_USERS = ['elisa', 'wesseler', 'akadmin']
function resolveGroup(req) {
  const username = req.headers['x-authentik-username']
  if (!username) return 'familie'
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

app.get('/api/data', async (req, res) => {
  res.json(await loadManual(resolveGroup(req)))
})

app.put('/api/manual', async (req, res) => {
  const groupId = resolveGroup(req)
  await prisma.$transaction((tx) => replaceManual(tx, groupId, req.body))
  res.json(await loadManual(groupId))
})

app.put('/api/category-overrides', async (req, res) => {
  const groupId = resolveGroup(req)
  await prisma.$transaction((tx) => replaceCategoryOverrides(tx, groupId, req.body))
  res.json(await loadManual(groupId))
})

app.put('/api/categories', async (req, res) => {
  const groupId = resolveGroup(req)
  await prisma.$transaction((tx) => replaceCategories(tx, groupId, req.body))
  res.json(await loadManual(groupId))
})

app.post('/api/restore', async (req, res) => {
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
})

app.use(express.static(path.join(__dirname, '..', 'dist')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`privatefinance listening on :${port}`))
