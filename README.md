# Plantilla de Ventas — Web App

Sistema web para registrar ventas diarias con múltiples modalidades de pago (efectivo $/BS, débito bancario, Binance, Zelle, Bio Pago, etc.), autenticación de usuarios, dashboard de reportes en vivo, y **sincronización automática con Google Sheets**.

Cada venta que registras desde la web se escribe en tiempo real en un Google Sheet compartido, donde puedes construir reportes cruzados (REPORTE, TOTALES, CxC) usando fórmulas que referencien la hoja `Ventas`.

## Stack tecnológico

- **Framework**: Next.js 16 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui (paleta emerald/teal)
- **Base de datos**: Google Sheets (vía Google Sheets API + Service Account)
- **Auth**: Cookies JWT firmadas con HMAC-SHA256 + bcrypt para hashes de password
- **Deploy**: Vercel (gratuito, deploy automático desde GitHub)

## Características

- 🔐 **Login** con 4 cuentas precargadas (admin + 3 asesores: ROXI, MILAGROS, DIEGO)
- 📊 **Dashboard** con KPIs (total venta día, monto BS/$, comisiones 2%), tabla por asesor y distribución por modalidad
- 📝 **Formulario de venta** con todos los campos del Excel original (cédula, nombre, celular, código, descripción, cantidad, costo, 9 modalidades de pago)
- 🔄 **Cálculos automáticos** en tiempo real: NETO, MONTO BS, MONTO $, TOTAL BS, TOTAL VENTA
- 📋 **Lista de ventas del día** con buscador y eliminación (solo admin)
- 📈 **Google Sheet en vivo**: botón abre el Sheet en otra pestaña, donde ves las ventas cargándose en tiempo real
- ⚙️ **Panel de admin** para cambiar tasas BCV/Monitor por día

---

## 🚀 Guía de despliegue paso a paso (Vercel + GitHub + Google Sheets)

Tiempo estimado: **25-35 minutos**.

### Paso 1 — Subir el proyecto a GitHub

1. Crea un repositorio nuevo en https://github.com/new (público o privado, ambos sirven para Vercel gratis). Nómbralo por ejemplo `plantilla-ventas`.
2. En tu computadora, clona el repo:
   ```bash
   git clone https://github.com/TU_USUARIO/plantilla-ventas.git
   cd plantilla-ventas
   ```
3. Copia **todos los archivos de este proyecto** dentro de la carpeta clonada.
4. Haz el primer commit:
   ```bash
   git add .
   git commit -m "Plantilla de Ventas - versión inicial con Google Sheets"
   git push origin main
   ```

> **Tip**: Si no quieres clonar, puedes subir los archivos directamente desde la interfaz web de GitHub (botón "uploading an existing file").

### Paso 2 — Crear el Google Sheet

1. Ve a https://sheets.new (se abre un Google Sheet vacío).
2. Renómbralo a "Plantilla de Ventas" (arriba a la izquierda).
3. Copia el **ID del Sheet** de la URL: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit` — los caracteres entre `/d/` y `/edit`.
4. Guarda ese ID para el Paso 4.

> No necesitas crear hojas manualmente — el script del Paso 5 las crea automáticamente.

### Paso 3 — Crear la Google Service Account

1. Ve a https://console.cloud.google.com/ (inicia sesión con tu Gmail).
2. Crea un proyecto nuevo (botón superior): nómbralo `plantilla-ventas`.
3. En el menú lateral izquierdo → **APIs y servicios → Biblioteca**. Busca **"Google Sheets API"** y haz clic en **Habilitar**.
4. En el menú izquierdo → **IAM y administración → Cuentas de servicio** → botón **Crear cuenta de servicio**.
   - Nombre: `plantilla-sheets`
   - ID de cuenta: lo que sugiere Google
   - Clic en **Crear y continuar** → **Listo** (no asignes roles).
5. Selecciona la cuenta recién creada → pestaña **Claves** → botón **Agregar clave → Crear clave nueva** → tipo **JSON**.
6. Se descarga un archivo `.json` con credenciales. **Ábrelo con un editor de texto**. Anota:
   - `client_email` — ejemplo `plantilla-sheets@plantilla-ventas.iam.gserviceaccount.com`
   - `private_key` — la cadena larga que comienza con `-----BEGIN PRIVATE KEY-----` y termina con `-----END PRIVATE KEY-----\n`

### Paso 4 — Compartir el Google Sheet con la Service Account

1. Vuelve al Google Sheet del Paso 2.
2. Botón **Compartir** (arriba a la derecha).
3. Pega el `client_email` de la Service Account, dale permiso de **Editor** y guarda.

### Paso 5 — Inicializar el Sheet con la estructura

Desde la raíz del proyecto en tu computadora:

```bash
# Instala dependencias (solo la primera vez)
npm install

# Ejecuta el seed (crea las 4 hojas, encabezados y usuarios por defecto)
GOOGLE_SERVICE_ACCOUNT_EMAIL="plantilla-sheets@plantilla-ventas.iam.gserviceaccount.com" \
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n" \
GOOGLE_SHEET_ID="el-id-que-copiaste-en-paso-2" \
npx tsx scripts/seed-google-sheets.ts
```

Si todo salió bien, verás `✅ Google Sheet inicializado correctamente` y podrás abrir el Sheet para ver las 4 hojas: **Usuarios, Ventas, Tasas, Configuracion**.

> **Importante**: la `GOOGLE_PRIVATE_KEY` debe ir entre comillas y conservar los `\n` tal cual aparecen en el JSON.

### Paso 6 — Desplegar en Vercel

1. Ve a https://vercel.com/ e inicia sesión con GitHub.
2. Clic en **Add New → Project**.
3. Importa el repositorio `plantilla-ventas` que creaste en el Paso 1.
4. En la sección **Environment Variables**, agrega estas 4 variables:

| Name | Value |
|------|-------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | El email de la service account |
| `GOOGLE_PRIVATE_KEY` | La private key completa (con `\n` incluidos) |
| `GOOGLE_SHEET_ID` | El ID del Sheet |
| `AUTH_SECRET` | Una cadena aleatoria de 32+ caracteres (genera con `openssl rand -hex 32` o usa cualquier texto largo aleatorio) |

5. Clic en **Deploy**. En 1-2 minutos Vercel despliega la app y te da una URL pública tipo `https://plantilla-ventas.vercel.app`.

### Paso 7 — Probar la app desplegada

1. Abre la URL que te dio Vercel.
2. Inicia sesión con `admin / admin123` (también puedes usar `roxi/roxi123`, `milagros/mila123`, `diego/diego123`).
3. Ve al tab **Nueva Venta**, registra una venta de prueba.
4. Ve al tab **Google Sheet** → clic en **Abrir Google Sheet** → verás la venta escrita en tiempo real en la hoja `Ventas`.

¡Listo! Cada `git push` que hagas al repo se desplegará automáticamente en Vercel.

---

## 🔧 Desarrollo local

```bash
# Instalar dependencias
npm install

# Si NO configuras las variables de entorno, la app opera en "modo demo":
#   - Login funciona con admin/admin123 y los 3 asesores
#   - Las ventas se guardan en memoria (se pierden al reiniciar)
#   - El botón "Abrir Google Sheet" muestra aviso de configurar

# Iniciar dev server
npm run dev
# Abre http://localhost:3000

# Para desarrollo con Google Sheet real:
cp .env.example .env.local
# Edita .env.local con tus credenciales y reinicia el dev server
```

## 📂 Estructura del proyecto

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/{login,logout,session}/route.ts  # Autenticación
│   │   │   ├── ventas/route.ts                       # CRUD ventas
│   │   │   ├── tasas/route.ts                        # Tasas BCV/Monitor
│   │   │   ├── dashboard/route.ts                    # Agregados del día
│   │   │   └── sheets/link/route.ts                  # URL del Sheet
│   │   ├── layout.tsx                                # Layout raíz
│   │   └── page.tsx                                  # Login o Dashboard según sesión
│   ├── components/
│   │   ├── login-form.tsx                            # Pantalla de login
│   │   ├── dashboard.tsx                             # Contenedor con tabs
│   │   ├── form-venta.tsx                            # Formulario de nueva venta
│   │   ├── lista-ventas.tsx                          # Tabla del día
│   │   ├── dashboard-resumen.tsx                     # KPIs y gráficas
│   │   └── panel-admin.tsx                           # Botón Sheet + config tasas
│   └── lib/
│       ├── auth.ts                                   # JWT + bcrypt
│       └── google-sheets.ts                          # Cliente Service Account
├── scripts/
│   └── seed-google-sheets.ts                        # Inicializa el Sheet
├── .env.example                                      # Plantilla de variables
├── .gitignore
├── package.json
└── README.md
```

## 🔄 Migración desde el Excel original (.xlsm)

Si vienes del proyecto anterior que exportaba un `.xlsm` con macros VBA, esto es lo que cambió:

| Antes (SQLite + .xlsm) | Ahora (Google Sheets) |
|---|---|
| Base de datos: SQLite/Prisma | Google Sheets (hojas `Usuarios`, `Ventas`, `Tasas`, `Configuracion`) |
| Botón "Exportar" descarga `.xlsm` con macros | Botón "Abrir Google Sheet" abre el Sheet en vivo |
| Reporte cruzado en Excel con fórmulas | Reporte cruzado en Google Sheets con fórmulas |
| Datos bloqueados en un archivo Excel | Datos en la nube, accesible desde cualquier dispositivo |
| Deploy: solo Railway/Render (necesita Python) | Deploy: Vercel gratis (sin Python) |
| Macros VBA: ✅ preservadas | Macros VBA: ❌ no soportadas en Google Sheets |

Si las macros VBA son críticas para ti, debes volver al proyecto anterior y desplegar en Railway/Render (ver instrucciones en el commit history).

## 📋 Hoja "Ventas" — columnas

| Col | Campo | Tipo |
|-----|-------|------|
| A | fecha | YYYY-MM-DD |
| B | hora | HH:MM:SS |
| C | userId | ID del usuario que registró |
| D | cedula | Cédula del cliente |
| E | nombre | Nombre del cliente |
| F | celular | Teléfono |
| G | codigo | Código del producto |
| H | descripcion | Descripción |
| I | cantidad | Número |
| J | costoUni | Número (costo unitario) |
| K | neto | cantidad × costoUni |
| L | pagoEfectivoUsd | Pago en $ efectivo |
| M | pagoEfectivoBs | Pago en BS efectivo |
| N | debitoBAmiga | Débito B/Amiga |
| O | debitoBVZla | Débito B/VZLA |
| P | bioPago | Bio Pago |
| Q | pm | Pago Móvil |
| R | binance | Binance (USD) |
| S | zelle | Zelle (USD) |
| T | vpm | VPM |
| U | montoBs | Suma de pagos en BS |
| V | montoUsd | Suma de pagos en $ |
| W | totalBs | montoBs + montoUsd × tasa |
| X | tasaUsdBs | Tasa aplicada (BCV o Monitor) |
| Y | asesor | ROXI / MILAGROS / DIEGO |
| Z | totalVenta | montoUsd + montoBs/tasa |

Puedes crear hojas adicionales (REPORTE, TOTALES, CxC) en el mismo Sheet con fórmulas que referencien `Ventas!A:Z` — exactamente igual que como lo harías en Excel.

## 🆘 Solución de problemas

**"Error: Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY"**
→ Falta configurar las variables en Vercel (Paso 6).

**"Error: no se pudo acceder al Sheet"**
→ Olvidaste compartir el Sheet con el email de la Service Account (Paso 4).

**"La venta se guarda pero no aparece en el Sheet"**
→ Ejecuta el seed (Paso 5) para crear las hojas con los encabezados correctos.

**"El botón 'Abrir Google Sheet' no funciona"**
→ Estás en modo demo. Verifica que las 3 variables GOOGLE_* estén en Vercel.

## 📝 Licencia

Proyecto de uso interno para Plantilla de Ventas.
