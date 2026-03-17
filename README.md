# ✈️ Aviation Intelligence Platform

> A comprehensive, AI-powered aviation intelligence hub — aggregating news, fleet data, accident reports, live radar, regulations, and industry trades into a single modern dashboard.

---

## 🚀 Features

| Module | Description |
|---|---|
| 📰 **News & Articles** | Real-time aviation news ingested from multiple sources (GNews, NewsAPI), classified and summarized by AI |
| 🤖 **AI Classification** | Automatic article categorization, sentiment analysis, key-insight extraction, and severity scoring via Gemini & Groq |
| ✈️ **Fleet Explorer** | Browse airline fleet compositions — aircraft types, counts, orders, unit costs, and average fleet age |
| 🗺️ **Live Radar** | Interactive map powered by Leaflet & React-Leaflet for real-time aircraft visualization |
| 💥 **Accident Reports** | Dedicated module for tracking and reviewing aviation accident data |
| 📜 **Regulations** | Up-to-date regulatory information for the aviation industry |
| 🔄 **Industry Trades** | Coverage of aviation trade deals, acquisitions, and market movements |
| 📡 **Wiki News** | Supplementary aviation news from Wikipedia-style sources |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite (dev) via [Prisma ORM](https://www.prisma.io/) — supports PostgreSQL for production
- **AI / LLMs**: Google Gemini (`@google/generative-ai`) · Groq SDK
- **Maps**: Leaflet · React-Leaflet
- **Data Fetching**: Axios · RSS Parser · Cheerio (web scraping)
- **News Sources**: GNews API · NewsAPI.org
- **Other**: csv-parser · crypto-js · dotenv · Express

---

## 📁 Project Structure

```
aviation-platform/
├── prisma/
│   └── schema.prisma        # Database schema (Articles, Fleet, Airlines...)
├── public/                  # Static assets
├── src/
│   ├── app/
│   │   ├── accidents/       # Accident reports module
│   │   ├── aircraft/        # Aircraft details
│   │   ├── all-articles/    # Full article listing
│   │   ├── articles/        # Article detail pages
│   │   ├── fleet/           # Fleet explorer
│   │   ├── radar/           # Live radar map
│   │   ├── regulations/     # Regulations module
│   │   ├── trades/          # Industry trades
│   │   ├── wiki-news/       # Wiki-sourced news
│   │   ├── api/             # Next.js API routes
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home / Dashboard
│   ├── components/          # Reusable React components
│   ├── lib/                 # Utility functions & API helpers
│   └── scripts/             # Data ingestion scripts
├── scripts/                 # CLI scripts (fleet ingestion, etc.)
├── planes.dat               # Aircraft seed data
├── .env.example             # Environment variable template
└── package.json
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js** v18 or later
- **npm** (or yarn / pnpm)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/aviation-platform.git
cd aviation-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your API keys:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
NODE_ENV=development

# News ingestion
GNEWS_API_KEY=your_gnews_api_key_here
NEWS_API_KEY=your_newsapi_key_here

# AI Classification & Summarization
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# Database (SQLite for dev, Postgres for prod)
# DATABASE_URL=postgres://user:password@host:5432/dbname
```

> 💡 **Get API Keys:**
> - GNews: https://gnews.io
> - NewsAPI: https://newsapi.org
> - Gemini: https://aistudio.google.com/app/apikey
> - Groq: https://console.groq.com

### 4. Set up the database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. (Optional) Ingest fleet data

```bash
npm run ingest:fleet
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. 🎉

---

## 🗃️ Database

The project uses **Prisma ORM** with **SQLite** by default for local development.

**Main models:**
- `Article` — Ingested news articles with AI classification metadata
- `IngestionLog` — Tracks each news ingestion pipeline run
- `AircraftType` — Aircraft IATA/ICAO type definitions
- `Airline` — Airline records
- `AirlineFleet` — Fleet compositions per airline

For production, point `DATABASE_URL` in `.env` to a PostgreSQL instance and run:

```bash
npx prisma migrate deploy
```

---

## 📦 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the production bundle |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run ingest:fleet` | Seed the database with fleet data from `planes.dat` |

---

## 🚢 Deployment

This app can be deployed to any platform that supports Next.js:

- **[Vercel](https://vercel.com)** *(recommended)* — zero-config Next.js deployment
- **[Railway](https://railway.app)** — with PostgreSQL add-on
- **[Render](https://render.com)** — as a Node.js web service

Set all environment variables from `.env.example` in your hosting platform's dashboard before deploying.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

---

<p align="center">Built with ❤️ for the aviation industry</p>
