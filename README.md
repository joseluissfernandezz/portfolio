# Portfolio · José Luis Fernández

Sitio estático (HTML + CSS + JavaScript) + API REST con **Netlify Functions** + **Netlify Database (PostgreSQL)**.

## Qué hay
| Ruta | Qué es |
|---|---|
| `index.html` | Portfolio (ES en el HTML, EN en `js/i18n.js`) |
| `cv.html` | CV en modo texto (imprimible / PDF) y modo juego 3D (`cv.html#jugar`) |
| `js/cv-data.js` | Datos del CV — **fuente única** para el modo texto y el juego |
| `js/cv-game.js` | Juego 3D con Three.js (se carga solo al abrir el modo 3D) |
| `js/live.js` | Panel «Datos en vivo»: estadísticas, ranking global y log de la API |
| `netlify/functions/` | API: `GET/POST /api/stats`, `GET/POST/PATCH /api/games` |
| `netlify/database/migrations/` | Esquema SQL (se aplica solo en cada deploy) |

## Ver en local
Abre la carpeta con cualquier servidor estático. Sin la API, el panel de datos
funciona en **modo demo** (localStorage) y lo indica con una etiqueta naranja.

Con la API y la base de datos reales en local (necesita Node.js):

```bash
npm install
npx netlify dev
```

`netlify dev` levanta un PostgreSQL local automáticamente.

## Publicar en Netlify
Las Functions y la base de datos **no funcionan con «arrastrar y soltar»**: hay que desplegar desde Git o con la CLI.

1. Sube esta carpeta a un repositorio (GitLab/GitHub).
2. En Netlify: *Add new project → Import from Git* → elige el repo.
   Build command vacío, publish directory `.` (ya está en `netlify.toml`).
3. En el proyecto: **Data & Storage → Database → Create a database**.
4. Vuelve a desplegar: Netlify crea la base de datos y aplica `0001_initial.sql`.

Plan gratuito (credit-based): 5 GB de almacenamiento y cómputo limitado; de sobra para esto.
Opcional: variable de entorno `IP_SALT` con un texto aleatorio (para el hash anti-abuso).

## Editar contenido
- Textos del portfolio: `data-i18n` en `index.html` (ES) y la misma clave en `js/i18n.js` (EN).
- CV (texto y juego a la vez): `js/cv-data.js`.
- Nuevo proyecto: copia un `<article class="project">`; `data-tags` = `backend`, `web` y/o `games`.
