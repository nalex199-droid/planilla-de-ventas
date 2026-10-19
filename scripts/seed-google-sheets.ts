/**
 * Inicializa el Google Sheet compartido con la estructura necesaria:
 *  - Crea 4 hojas: Usuarios, Ventas, Tasas, Configuracion
 *  - Escribe los encabezados en cada una
 *  - Inserta los 4 usuarios por defecto (admin, roxi, milagros, diego) con contraseñas hasheadas
 *  - Inserta la tasa de hoy (BCV=876.79, Monitor=1015)
 *
 * Uso (desde la raíz del proyecto):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@... \
 *   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..." \
 *   GOOGLE_SHEET_ID=xxxxxxx \
 *   bun run scripts/seed-google-sheets.ts
 *
 * Antes de ejecutar:
 *   1. Crea un Google Sheet vacío en https://sheets.new
 *   2. Copia el ID del Sheet de la URL: https://docs.google.com/spreadsheets/d/SHEET_ID/edit
 *   3. Crea una Service Account en Google Cloud Console (ver README.md)
 *   4. Comparte el Sheet con el email de la Service Account (permiso de Editor)
 */
import { google } from 'googleapis'
import bcrypt from 'bcryptjs'

async function main() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY
  const sheetId = process.env.GOOGLE_SHEET_ID

  if (!clientEmail || !privateKeyRaw || !sheetId) {
    console.error('ERROR: faltan variables de entorno.')
    console.error('Asegúrate de tener GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY y GOOGLE_SHEET_ID')
    process.exit(1)
  }
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n')

  const jwt = new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  const sheets = google.sheets({ version: 'v4', auth: jwt })

  // Verificar acceso al sheet y leer metadata
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId }).catch(e => {
    console.error('ERROR: no se pudo acceder al Sheet. Verifica que lo compartiste con el email de la Service Account.')
    console.error(e.message)
    process.exit(2)
  })
  const title = meta.data.properties?.title ?? 'Sheet'
  console.log(`✓ Conectado al Sheet: "${title}"`)

  const existingSheets = meta.data.sheets?.map(s => s.properties?.title) ?? []
  console.log(`Hojas existentes: ${existingSheets.join(', ') || '(ninguna)'}`)

  // Crear hojas faltantes
  const requiredSheets = ['Usuarios', 'Ventas', 'Tasas', 'Configuracion']
  const toCreate = requiredSheets.filter(s => !existingSheets.includes(s))
  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: toCreate.map(title => ({
          addSheet: { properties: { title } },
        })),
      },
    })
    console.log(`✓ Hojas creadas: ${toCreate.join(', ')}`)
  } else {
    console.log('✓ Todas las hojas ya existen')
  }

  // Escribir encabezados en cada hoja
  const headers = {
    'Usuarios': ['username', 'password_hash', 'name', 'role'],
    'Ventas': ['fecha', 'hora', 'userId', 'cedula', 'nombre', 'celular', 'codigo', 'descripcion',
               'cantidad', 'costoUni', 'neto', 'pagoEfectivoUsd', 'pagoEfectivoBs', 'debitoBAmiga',
               'debitoBVZla', 'bioPago', 'pm', 'binance', 'zelle', 'vpm',
               'montoBs', 'montoUsd', 'totalBs', 'tasaUsdBs', 'asesor', 'totalVenta'],
    'Tasas': ['fecha', 'bcv', 'monitor'],
    'Configuracion': ['clave', 'valor'],
  }

  for (const [sheetName, h] of Object.entries(headers)) {
    // Limpiar primera fila y escribir encabezado
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:Z1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [h, ...Array(Math.max(0, 25 - h.length)).fill([])] },
    }).catch(() => {})
    // Solo escribir encabezados
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:${String.fromCharCode(65 + h.length - 1)}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [h] },
    })
    console.log(`✓ Encabezados escritos en hoja "${sheetName}"`)
  }

  // Insertar usuarios por defecto (solo si la hoja está vacía)
  const usersRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Usuarios!A2:D100' })
  if ((usersRes.data.values ?? []).length === 0) {
    const users = [
      { username: 'admin',    name: 'Administrador', role: 'admin',  password: 'admin123' },
      { username: 'roxi',     name: 'ROXI',          role: 'asesor', password: 'roxi123' },
      { username: 'milagros', name: 'MILAGROS',      role: 'asesor', password: 'mila123' },
      { username: 'diego',    name: 'DIEGO',         role: 'asesor', password: 'diego123' },
    ]
    const rows = []
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10)
      rows.push([u.username, hash, u.name, u.role])
      console.log(`  ✓ ${u.username} / ${u.password} (${u.role})`)
    }
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Usuarios!A:A',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    })
    console.log(`✓ ${users.length} usuarios insertados en hoja "Usuarios"`)
  } else {
    console.log('ℹ La hoja "Usuarios" ya tiene datos, no se insertaron usuarios por defecto')
  }

  // Insertar tasa de hoy si la hoja Tasas está vacía
  const today = new Date().toISOString().slice(0, 10)
  const tasasRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Tasas!A2:C100' })
  if ((tasasRes.data.values ?? []).length === 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Tasas!A:A',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[today, 876.79, 1015]] },
    })
    console.log(`✓ Tasa de hoy (${today}) insertada: BCV=876.79, Monitor=1015`)
  } else {
    console.log('ℹ La hoja "Tasas" ya tiene datos')
  }

  // Configuracion por defecto
  const cfgRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Configuracion!A2:B100' })
  if ((cfgRes.data.values ?? []).length === 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Configuracion!A:A',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [['sistema', 'Plantilla de Ventas'], ['version', '1.0.0'], ['creado', today]] },
    })
    console.log('✓ Configuración inicial insertada')
  }

  // Aplicar formato básico (negrita a encabezados) en cada hoja
  for (const sheetName of requiredSheets) {
    const meta2 = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
    const sheet = meta2.data.sheets?.find(s => s.properties?.title === sheetName)
    const sid = sheet?.properties?.sheetId
    if (!sid) continue
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.85, green: 0.95, blue: 0.88 } } },
              fields: 'userEnteredFormat(textFormat,backgroundColor)',
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId: sid, gridProperties: { frozenRowCount: 1 } },
              fields: 'gridProperties.frozenRowCount',
            },
          },
        ],
      },
    }).catch(() => {})
  }
  console.log('✓ Formato aplicado a encabezados')

  console.log('\n✅ Google Sheet inicializado correctamente.')
  console.log(`   URL: https://docs.google.com/spreadsheets/d/${sheetId}/edit`)
  console.log('\nAhora puedes:')
  console.log('  1. Hacer deploy en Vercel con estas variables de entorno')
  console.log('  2. Abrir el Sheet para ver cómo se llenan las ventas en tiempo real')
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
