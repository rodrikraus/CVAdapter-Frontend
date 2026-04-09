[![es](https://img.shields.io/badge/Lang-Espa%C3%B1ol-red.svg)](README.md)
[![en](https://img.shields.io/badge/Lang-English-blue.svg)](README.en.md)

# CVAdapter - Frontend

Frontend for CVAdapter, an AI-powered tool that optimizes CVs for specific job postings. Built with React 19 and TypeScript.

## Technologies

- **React 19** with TypeScript
- **Vite 8** as bundler and dev server
- **PDF.js** for client-side text extraction from PDF files
- **ESLint** for linting

## Features

- **Three CV input modes:**
  - PDF upload with automatic text extraction (drag & drop)
  - Plain text
  - LaTeX code
- **Live preview** of the optimized CV (LaTeX rendered to HTML)
- **Built-in LaTeX editor** for post-optimization adjustments
- **Download as PDF** of the final result
- **Copy LaTeX** to clipboard
- **Bilingual support** (Spanish / English)
- **Input validation** with character limits and LaTeX structure verification

## Prerequisites

- Node.js (v18 or higher)
- npm

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/CVAdapter.git

# Navigate to the frontend directory
cd CVAdapter/Frontend

# Install dependencies
npm install
```

## Configuration

The backend API base URL is configured in `src/env.ts`:

```typescript
// For local development
const API_BASE = "http://localhost:8080";

// For production (Azure)
const API_BASE = "https://cvadapter.azurewebsites.net";
```

## Available Scripts

| Script          | Command            | Description                              |
| --------------- | ------------------ | ---------------------------------------- |
| `dev`           | `npm run dev`      | Starts the development server (5173)     |
| `build`         | `npm run build`    | Compiles TypeScript and generates build  |
| `preview`       | `npm run preview`  | Previews the production build            |
| `lint`          | `npm run lint`     | Runs ESLint on the source code           |

## Project Structure

```
Frontend/
├── public/
├── src/
│   ├── App.tsx            # Main application component
│   ├── App.css            # Application styles
│   ├── main.tsx           # React entry point
│   ├── index.css          # Global styles
│   ├── types.ts           # TypeScript interfaces (CvRequest, CvResponse)
│   ├── i18n.ts            # Translations (ES/EN)
│   ├── env.ts             # Environment configuration (API URL)
│   └── latexPreview.ts    # LaTeX to HTML conversion utility
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

## Consumed Endpoints

| Method | Endpoint            | Description                        | Request Body                          | Response                  |
| ------ | ------------------- | ---------------------------------- | ------------------------------------- | ------------------------- |
| POST   | `/api/cv/optimize`  | Optimizes the CV for the job offer | `{ cv: string, jobOffer: string }`    | `{ optimizedCv: string }` |
| POST   | `/api/cv/pdf`       | Generates PDF from LaTeX           | `{ latexContent: string }`            | `application/pdf` (bytes) |

## Deployment

The frontend is deployed as a static site. Compatible with Netlify, Vercel, or any static file hosting.

```bash
npm run build
# The dist/ directory contains the files ready to deploy
```
