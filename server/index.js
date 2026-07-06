import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const app = express()
app.use(express.json({ limit: '5mb' }))

const BACKUP_TYPE = 'privatefinance-backup'

async function loadManual() {
  const [accounts, incomes, standingOrders, transfers, overrides] = await Promise.all([
    prisma.account.findMany(),
    prisma.income.findMany(),
    prisma.standingOrder.findMany(),
    prisma.transfer.findMany(),
    prisma.categoryOverride.findMany(),
  ])
  const categoryOverrides = Object.fromEntries(overrides.map((o) => [o.itemId, o.categoryId]))
  return { manual: { accounts, incomes, standingOrders, transfers }, categoryOverrides }
}

// Full-Replace, analog zum bisherigen localStorage setItem-Verhalten.
async function replaceManual(tx, manual = {}) {
  await tx.account.deleteMany()
  await tx.income.deleteMany()
  await tx.standingOrder.deleteMany()
  await tx.transfer.deleteMany()
  if (manual.accounts?.length) await tx.account.createMany({ data: manual.accounts })
  if (manual.incomes?.length) await tx.income.createMany({ data: manual.incomes })
  if (manual.standingOrders?.length) await tx.standingOrder.createMany({ data: manual.standingOrders })
  if (manual.transfers?.length) await tx.transfer.createMany({ data: manual.transfers })
}

async function replaceCategoryOverrides(tx, categoryOverrides = {}) {
  await tx.categoryOverride.deleteMany()
  const rows = Object.entries(categoryOverrides).map(([itemId, categoryId]) => ({ itemId, categoryId }))
  if (rows.length) await tx.categoryOverride.createMany({ data: rows })
}

app.get('/api/data', async (req, res) => {
  res.json(await loadManual())
})

app.put('/api/manual', async (req, res) => {
  await prisma.$transaction((tx) => replaceManual(tx, req.body))
  res.json(await loadManual())
})

app.put('/api/category-overrides', async (req, res) => {
  await prisma.$transaction((tx) => replaceCategoryOverrides(tx, req.body))
  res.json(await loadManual())
})

app.post('/api/restore', async (req, res) => {
  const backup = req.body
  if (!backup || backup.type !== BACKUP_TYPE || typeof backup.manual !== 'object') {
    return res.status(400).json({ error: 'Keine gültige PrivateFinance-Datensicherung.' })
  }
  await prisma.$transaction(async (tx) => {
    await replaceManual(tx, backup.manual)
    await replaceCategoryOverrides(tx, backup.categoryOverrides)
  })
  res.json(await loadManual())
})

app.use(express.static(path.join(__dirname, '..', 'dist')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`privatefinance listening on :${port}`))
