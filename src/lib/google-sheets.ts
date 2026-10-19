/**
 * Cliente de Google Sheets usando Service Account.
 *
 * Si las variables de entorno NO están configuradas, opera en "modo demo":
 * guarda ventas y usuarios en memoria (se pierden al reiniciar el servidor),
 * útil para probar el flujo antes de configurar el Google Sheet real.
 *
 * Requiere las variables de entorno (ver .env.example):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — email de la service account
 *   GOOGLE_PRIVATE_KEY            — private key de la service account
 *   GOOGLE_SHEET_ID               — ID del Google Sheet
 */
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

let cachedClient: ReturnType<typeof google.sheets> | null = null

// ====== Modo demo (en memoria, para desarrollo sin Google) ======
interface DemoUser { username: string; password_hash: string; name: string; role: string }
interface DemoVenta { row: number; values: (string | number)[] }
interface DemoTasa { fecha: string; bcv: number; monitor: number }

const demoUsers: DemoUser[] = []
const demoVentas: DemoVenta[] = []
const demoTasas: DemoTasa[] = []

export function isDemoMode(): boolean {
  return !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
         !process.env.GOOGLE_PRIVATE_KEY ||
         !process.env.GOOGLE_SHEET_ID
}

async function ensureDemoSeed() {
  if (demoUsers.length === 0) {
    const bcrypt = await import('bcryptjs')
    const users = [
      { username: 'admin',    name: 'Administrador', role: 'admin',  password: 'admin123' },
      { username: 'roxi',     name: 'ROXI',          role: 'asesor', password: 'roxi123' },
      { username: 'milagros', name: 'MILAGROS',      role: 'asesor', password: 'mila123' },
      { username: 'diego',    name: 'DIEGO',         role: 'asesor', password: 'diego123' },
    ]
    for (const u of users) {
      demoUsers.push({
        username: u.username,
        password_hash: await bcrypt.hash(u.password, 10),
        name: u.name,
        role: u.role,
      })
    }
  }
  if (demoTasas.length === 0) {
    const today = new Date().toISOString().slice(0, 10)
    demoTasas.push({ fecha: today, bcv: 876.79, monitor: 1015 })
  }
}

function getAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY
  if (!clientEmail || !privateKeyRaw) {
    throw new Error('Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY')
  }
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n')
  return new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: SCOPES })
}

export function getSheetsClient() {
  if (isDemoMode()) return null
  if (cachedClient) return cachedClient
  const auth = getAuth()
  cachedClient = google.sheets({ version: 'v4', auth })
  return cachedClient
}

export function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID
  if (!id) throw new Error('Falta GOOGLE_SHEET_ID')
  return id
}

// Helpers para leer/escribir valores en una hoja
export async function readRange(sheetName: string, range: string): Promise<string[][]> {
  if (isDemoMode()) {
    await ensureDemoSeed()
    return demoRead(sheetName, range)
  }
  const sheets = getSheetsClient()
  const res = await sheets!.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${sheetName}!${range}`,
  })
  return (res.data.values ?? []) as string[][]
}

export async function appendRow(sheetName: string, values: (string | number)[]): Promise<number> {
  if (isDemoMode()) {
    await ensureDemoSeed()
    return demoAppend(sheetName, values)
  }
  const sheets = getSheetsClient()
  const res = await sheets!.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values.map(v => String(v))] },
  })
  const updates = res.data.updates?.updatedRange ?? ''
  const match = updates.match(/!A(\d+):/)
  return match ? parseInt(match[1], 10) : 0
}

export async function updateCell(sheetName: string, cell: string, value: string | number): Promise<void> {
  if (isDemoMode()) {
    await ensureDemoSeed()
    return demoUpdateCell(sheetName, cell, value)
  }
  const sheets = getSheetsClient()
  await sheets!.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${sheetName}!${cell}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[String(value)]] },
  })
}

export async function findRowByValue(sheetName: string, column: number, value: string): Promise<number | null> {
  if (isDemoMode()) {
    await ensureDemoSeed()
    return demoFindRow(sheetName, column, value)
  }
  const colLetter = String.fromCharCode(65 + column)
  const rows = await readRange(sheetName, `${colLetter}:${colLetter}`)
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === value) return i + 1
  }
  return null
}

export async function deleteRow(sheetName: string, rowIndex: number): Promise<void> {
  if (isDemoMode()) {
    await ensureDemoSeed()
    demoVentas.splice(demoVentas.findIndex(v => v.row === rowIndex), 1)
    return
  }
  const sheets = getSheetsClient()
  await sheets!.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: await getSheetIdNumeric(sheetName),
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      }],
    },
  })
}

async function getSheetIdNumeric(sheetName: string): Promise<number> {
  const sheets = getSheetsClient()
  const meta = await sheets!.spreadsheets.get({ spreadsheetId: getSheetId() })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName)
  if (!sheet?.properties?.sheetId) throw new Error(`Hoja '${sheetName}' no encontrada`)
  return sheet.properties.sheetId
}

// ====== Implementación demo (en memoria) ======
function demoRead(sheetName: string, _range: string): string[][] {
  if (sheetName === 'Usuarios') {
    const headers = ['username', 'password_hash', 'name', 'role']
    const rows = demoUsers.map(u => [u.username, u.password_hash, u.name, u.role])
    return [headers, ...rows]
  }
  if (sheetName === 'Ventas') {
    const headers = ['fecha', 'hora', 'userId', 'cedula', 'nombre', 'celular', 'codigo', 'descripcion',
                     'cantidad', 'costoUni', 'neto', 'pagoEfectivoUsd', 'pagoEfectivoBs', 'debitoBAmiga',
                     'debitoBVZla', 'bioPago', 'pm', 'binance', 'zelle', 'vpm',
                     'montoBs', 'montoUsd', 'totalBs', 'tasaUsdBs', 'asesor', 'totalVenta']
    const rows = demoVentas.map(v => v.values.map(String))
    return [headers, ...rows]
  }
  if (sheetName === 'Tasas') {
    const headers = ['fecha', 'bcv', 'monitor']
    const rows = demoTasas.map(t => [t.fecha, String(t.bcv), String(t.monitor)])
    return [headers, ...rows]
  }
  if (sheetName === 'Configuracion') {
    return [['clave', 'valor'], ['sistema', 'Plantilla de Ventas'], ['version', '1.0.0']]
  }
  return []
}

function demoAppend(sheetName: string, values: (string | number)[]): Promise<number> {
  if (sheetName === 'Ventas') {
    const row = demoVentas.length === 0 ? 2 : Math.max(...demoVentas.map(v => v.row)) + 1
    demoVentas.push({ row, values })
    return Promise.resolve(row)
  }
  if (sheetName === 'Tasas') {
    const fecha = String(values[0])
    const bcv = Number(values[1])
    const monitor = Number(values[2])
    const existing = demoTasas.find(t => t.fecha === fecha)
    if (existing) {
      existing.bcv = bcv
      existing.monitor = monitor
    } else {
      demoTasas.push({ fecha, bcv, monitor })
    }
    return Promise.resolve(0)
  }
  return Promise.resolve(0)
}

function demoUpdateCell(sheetName: string, cell: string, value: string | number): Promise<void> {
  if (sheetName === 'Tasas') {
    // Cell como "B2" — columna B (bcv), fila 2
    const colMatch = cell.match(/^([A-Z]+)(\d+)$/)
    if (!colMatch) return Promise.resolve()
    const col = colMatch[1]
    const row = parseInt(colMatch[2], 10)
    if (row - 2 < demoTasas.length && row - 2 >= 0) {
      if (col === 'B') demoTasas[row - 2].bcv = Number(value)
      if (col === 'C') demoTasas[row - 2].monitor = Number(value)
    }
  }
  return Promise.resolve()
}

function demoFindRow(_sheetName: string, column: number, value: string): Promise<number | null> {
  if (_sheetName === 'Tasas' && column === 0) {
    const i = demoTasas.findIndex(t => t.fecha === value)
    return Promise.resolve(i >= 0 ? i + 2 : null) // +2 por encabezado y 1-indexed
  }
  return Promise.resolve(null)
}
