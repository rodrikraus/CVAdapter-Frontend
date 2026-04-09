[![es](https://img.shields.io/badge/Lang-Espa%C3%B1ol-red.svg)](README.md)
[![en](https://img.shields.io/badge/Lang-English-blue.svg)](README.en.md)

# CVAdapter - Frontend

Frontend de CVAdapter, una herramienta impulsada por IA que optimiza CVs para ofertas de trabajo especificas. Construida con React 19 y TypeScript.

## Tecnologias

- **React 19** con TypeScript
- **Vite 8** como bundler y servidor de desarrollo
- **PDF.js** para extraccion de texto de archivos PDF en el cliente
- **ESLint** para linting

## Funcionalidades

- **Tres modos de entrada para el CV:**
  - Subida de PDF con extraccion de texto automatica (drag & drop)
  - Texto plano
  - Codigo LaTeX
- **Vista previa en vivo** del CV optimizado (LaTeX renderizado a HTML)
- **Editor de LaTeX** integrado para ajustes post-optimizacion
- **Descarga como PDF** del resultado final
- **Copiar LaTeX** al portapapeles
- **Soporte bilingue** (Espanol / Ingles)
- **Validacion de entrada** con limites de caracteres y verificacion de estructura LaTeX

## Requisitos previos

- Node.js (v18 o superior)
- npm

## Instalacion

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/CVAdapter.git

# Navegar al directorio del frontend
cd CVAdapter/Frontend

# Instalar dependencias
npm install
```

## Configuracion

La URL base de la API del backend se configura en `src/env.ts`:

```typescript
// Para desarrollo local
const API_BASE = "http://localhost:8080";

// Para produccion (Azure)
const API_BASE = "https://cvadapter.azurewebsites.net";
```

## Scripts disponibles

| Script          | Comando            | Descripcion                              |
| --------------- | ------------------ | ---------------------------------------- |
| `dev`           | `npm run dev`      | Inicia el servidor de desarrollo (5173)  |
| `build`         | `npm run build`    | Compila TypeScript y genera el build     |
| `preview`       | `npm run preview`  | Previsualiza el build de produccion      |
| `lint`          | `npm run lint`     | Ejecuta ESLint sobre el codigo fuente    |

## Estructura del proyecto

```
Frontend/
├── public/
├── src/
│   ├── App.tsx            # Componente principal de la aplicacion
│   ├── App.css            # Estilos de la aplicacion
│   ├── main.tsx           # Punto de entrada de React
│   ├── index.css          # Estilos globales
│   ├── types.ts           # Interfaces TypeScript (CvRequest, CvResponse)
│   ├── i18n.ts            # Traducciones (ES/EN)
│   ├── env.ts             # Configuracion del entorno (URL de la API)
│   └── latexPreview.ts    # Utilidad de conversion LaTeX a HTML
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

## Endpoints consumidos

| Metodo | Endpoint            | Descripcion                        | Request Body                          | Response                  |
| ------ | ------------------- | ---------------------------------- | ------------------------------------- | ------------------------- |
| POST   | `/api/cv/optimize`  | Optimiza el CV para la oferta      | `{ cv: string, jobOffer: string }`    | `{ optimizedCv: string }` |
| POST   | `/api/cv/pdf`       | Genera PDF a partir de LaTeX       | `{ latexContent: string }`            | `application/pdf` (bytes) |

## Despliegue

El frontend se despliega como sitio estatico. Compatible con Netlify, Vercel o cualquier hosting de archivos estaticos.

```bash
npm run build
# El directorio dist/ contiene los archivos listos para desplegar
```
