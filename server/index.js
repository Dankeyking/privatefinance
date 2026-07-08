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
  const [accounts, incomes, standingOrders, transfers, overrides] = await Promise.all([
    prisma.account.findMany({ where: { groupId } }),
    prisma.income.findMany({ where: { groupId } }),
    prisma.standingOrder.findMany({ where: { groupId } }),
    prisma.transfer.findMany({ where: { groupId } }),
    prisma.categoryOverride.findMany({ where: { groupId } }),
  ])
  const categoryOverrides = Object.fromEntries(overrides.map((o) => [o.itemId, o.categoryId]))
  return { manual: { accounts, incomes, standingOrders, transfers }, categoryOverrides }
}

// Full-Replace innerhalb der eigenen Gruppe, analog zum bisherigen localStorage setItem-Verhalten.
async function replaceManual(tx, groupId, manual = {}) {
  await tx.account.deleteMany({ where: { groupId } })
  await tx.income.deleteMany({ where: { groupId } })
  await tx.standingOrder.deleteMany({ where: { groupId } })
  await tx.transfer.deleteMany({ where: { groupId } })
  if (manual.accounts?.length) await tx.account.createMany({ data: manual.accounts.map((a) => ({ ...a, groupId })) })
  if (manual.incomes?.length) await tx.income.createMany({ data: manual.incomes.map((i) => ({ ...i, groupId })) })
  if (manual.standingOrders?.length) await tx.standingOrder.createMany({ data: manual.standingOrders.map((s) => ({ ...s, groupId })) })
  if (manual.transfers?.length) await tx.transfer.createMany({ data: manual.transfers.map((t) => ({ ...t, groupId })) })
}

async function replaceCategoryOverrides(tx, groupId, categoryOverrides = {}) {
  await tx.categoryOverride.deleteMany({ where: { groupId } })
  const rows = Object.entries(categoryOverrides).map(([itemId, categoryId]) => ({ itemId, categoryId, groupId }))
  if (rows.length) await tx.categoryOverride.createMany({ data: rows })
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
