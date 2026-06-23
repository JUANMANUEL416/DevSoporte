# DevSoporte — Migración de Clarion a Quasar

Migración del sistema **Agenda / DevSoporte** (originalmente en **Clarion 11**, escritorio + MS-SQL)
a una arquitectura web moderna:

- **Backend:** Node.js + Express + PostgreSQL
- **Frontend:** Quasar (Vue 3) con separación clara entre `pages` (listados) y `components` (formularios/reutilizables)

El proyecto Clarion original se ubica en `C:\DEV11.1\Agenda\`.

---

## Estructura del proyecto

```
DevSoporte/
├── backend/                      API REST (Express + PostgreSQL)
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql         Esquema PostgreSQL (migrado del diccionario .dct)
│   │   │   ├── seed.sql           Datos semilla (catálogos + usuario ADMIN)
│   │   │   ├── init.js            Script de inicialización de la BD
│   │   │   └── pool.js            Pool de conexiones
│   │   ├── middleware/auth.js     JWT (login/sesión)
│   │   ├── routes/auth.js         Autenticación
│   │   ├── entities.js            Registro de tablas/entidades
│   │   ├── crudRouter.js          CRUD genérico parametrizado
│   │   └── server.js              Punto de entrada
│   ├── package.json
│   └── .env.example
│
└── frontend/                     Aplicación Quasar (Vue 3)
    ├── src/
    │   ├── pages/                 LISTADOS  (equivalen a los Browse de Clarion)
    │   │   ├── LoginPage.vue
    │   │   ├── DashboardPage.vue
    │   │   ├── GenericListPage.vue
    │   │   └── ErrorNotFound.vue
    │   ├── components/            FORMULARIOS y reutilizables (equivalen a los Form de Clarion)
    │   │   ├── GenericForm.vue
    │   │   └── StatusChip.vue
    │   ├── layouts/MainLayout.vue Menú principal (equivale a Amenu)
    │   ├── config/modules.js      Definición de módulos, columnas y campos
    │   ├── router/                Rutas + guardia de autenticación
    │   ├── stores/auth.js         Estado de sesión (Pinia)
    │   ├── services/api.js        Cliente REST
    │   └── boot/                  axios + pinia
    ├── quasar.config.js
    └── package.json
```

> **pages vs components:** las `pages` son las vistas de listado/navegación (un Browse de Clarion
> por cada tabla). Los `components` son piezas reutilizables, principalmente el formulario de
> alta/edición (`GenericForm`, equivalente a las pantallas `Frm:*` de Clarion) y elementos visuales
> como `StatusChip`.

---

## Requisitos

- Node.js 18+
- PostgreSQL 13+

## Puesta en marcha

### 1) Base de datos

```bash
# Cree la base de datos en PostgreSQL
createdb devsoporte
```

### 2) Backend

```bash
cd backend
cp .env.example .env        # ajuste credenciales de PostgreSQL
npm install
npm run db:init             # crea tablas + datos semilla (usuario ADMIN / admin123)
npm run dev                 # API en http://localhost:3000
```

### 3) Frontend

```bash
cd frontend
npm install
# si no tiene la CLI: npm i -g @quasar/cli
quasar dev                  # App en http://localhost:9020
```

Acceso inicial: **usuario** `ADMIN` · **clave** `admin123`.

---

## Producción (Windows)

Un solo proceso sirve **API + frontend** en el puerto configurado (`PORT`, por defecto 3300).

### 1) Variables de entorno

Copie `deploy/.env.production.example` → `backend/.env` y ajuste PostgreSQL, JWT, SMTP y URLs públicas (`PUBLIC_APP_URL`, `CORS_ORIGIN`).

Con ngrok en producción, apunte el túnel al **mismo puerto** del backend:

```yaml
# ngrok.yml
tunnels:
  devsoporte:
    addr: 3300
    proto: http
```

### 2) Despliegue y servicio PM2

```powershell
# Desde la raíz del repo
npm run deploy

# Inicio automático con Windows (PowerShell como Administrador, una sola vez)
npm run deploy:install
```

Comandos útiles:

```powershell
pm2 status
pm2 restart devsoporte
pm2 logs devsoporte
```

Health check: `http://localhost:3300/api/health` (incluye versión).

**Ramas:** el despliegue solo se ejecuta desde **`master`**. Ver [docs/GIT-WORKFLOW.md](docs/GIT-WORKFLOW.md).

### 3) Versionado y publicación en GitHub

1. Merge `develop` → `master`.
2. Edite `VERSION` (semver, ej. `1.2.0`) y anote cambios en `CHANGELOG.md`.
3. Desde **`master`**:

```powershell
npm run release
```

Crea commit (si hay cambios), tag `vX.Y.Z` y push a `origin/master`.

### 4) Limpiar BD (conserva plantilla de correos)

```bash
cd backend
npm run db:clean
```

---

## Ramas Git

| Rama | Uso |
|------|-----|
| `master` | Producción — compilar y desplegar (`npm run deploy`) |
| `develop` | Integración — crear aquí las ramas `feature/*` y `fix/*` |

Detalle: [docs/GIT-WORKFLOW.md](docs/GIT-WORKFLOW.md)

---

| Concepto Clarion              | Equivalente en esta solución                          |
|-------------------------------|-------------------------------------------------------|
| Diccionario `.dct`            | `backend/src/db/schema.sql` (tablas PostgreSQL)       |
| `FILE` / `RECORD`             | Tabla + columnas                                      |
| Procedimiento `Brw:*` (Browse)| `pages/GenericListPage.vue` (listado por recurso)     |
| Procedimiento `Frm:*` (Form)  | `components/GenericForm.vue` (alta/edición)           |
| Menú `Amenu`                  | `layouts/MainLayout.vue` + `config/modules.js`        |
| `LOGIN` / control de acceso   | `routes/auth.js` + JWT + `stores/auth.js`             |
| Consecutivos `ACNS`           | Tabla `acns` (lógica de consecutivos a implementar)   |
| `TGEN` (tabla genérica)       | Tabla `tgen` + módulo "Tabla Genérica"                |

### Módulos incluidos (según el menú original)

- **Configuración:** Clientes, Compañías, Códigos de Prueba, Variables, Tabla Genérica
- **Desarrollo:** Ixver, Requerimientos, Entregas
- **Soporte:** Bitácora, Mi Agenda, Informes Diarios, Asignación de Proyectos, **Control Capacitaciones**, Licencias, Técnicos
- **Solicitudes:** Solicitudes de Requerimientos
- **Seguridad:** Usuarios

---

## Notas y pendientes

- La **clave de usuario** ahora se almacena con `bcrypt` (en Clarion estaba en texto plano).
- Las columnas Clarion `STRING(8)` que representaban fechas se migraron a `TIMESTAMP`/`DATE`.
- Tablas auxiliares de detalle (`asigpd`, `asigpa`, `entd`, `sreqa`, `sreqn`, `desap`, `desapr`)
  están en el esquema; sus pantallas maestro-detalle pueden añadirse siguiendo el mismo patrón
  (un módulo en `config/modules.js` + reutilizar `GenericListPage`/`GenericForm`).
- Los **reportes** de Clarion (plantillas Report) no se migran automáticamente; se recomienda
  generarlos como PDF desde el backend o vistas dedicadas según se prioricen.
- La lógica de **consecutivos** (`ACNS`) y validaciones específicas de cada formulario deben
  trasladarse a endpoints dedicados a medida que se profundice cada módulo.
