# Flujo de ramas — DevSoporte

## Ramas fijas

| Rama | Propósito |
|------|-----------|
| **master** | Producción. Compilar y desplegar solo aquí. |
| **develop** | Integración. Base para crear ramas de trabajo. |

## Regla principal

**Los cambios de código solo en ramas derivadas de `develop`** (`feature/*`, `fix/*`).

No editar directamente `master` ni `develop` (salvo merges).

## Flujo diario

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/mi-tarea

# ... desarrollo y commits ...

git checkout develop
git merge feature/mi-tarea
git push origin develop
```

## Publicar a producción

```powershell
git checkout master
git pull origin master
git merge develop
git push origin master

npm run deploy          # build + PM2 (solo en master)
npm run release         # tag de VERSION (solo en master)
```

## Frontend

Tras cambios en `frontend/`, el deploy ejecuta `npm run build`. En desarrollo local: `npx quasar dev`.

## Versión en pantalla

La versión (`VERSION` en la raíz) se muestra en la barra superior junto al usuario y se incluye en el build del frontend.
