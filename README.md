# SplitSense 💸

SplitSense is an advanced, production-ready shared expense tracker and financial management platform. Designed specifically to handle messy, real-world data, it excels at parsing unstructured CSV files, executing complex splits, and managing dynamic groups where members come and go. 

It is also powered by **Audit AI**, an intelligent chatbot that acts as your personal financial analyst—identifying anomalies, summarizing your data, and ensuring everyone pays exactly their fair share.

---

## 🌟 Core Features & Capabilities

### 1. 🧠 Audit AI (Built-in Data Analyst)
SplitSense includes a smart, context-aware chatbot that queries your actual database to provide deep financial insights. Ask it complex questions in natural language:
- *"Who owes me the most money right now?"*
- *"Are there any unusually high electricity bills this year?"*
- *"Summarize my grocery spending for the last 3 months."*
- *"Did we accidentally log the Internet bill twice in March?"*

### 2. 🧮 Settlement Optimization Algorithm
Instead of forcing everyone to pay back everyone else individually, SplitSense features a built-in debt simplification engine. It builds a directed graph of all group debts and simplifies the edges.
- **Example:** If Alice owes Bob $10, and Bob owes Charlie $10, SplitSense simply tells Alice to pay Charlie $10. It minimizes the total number of transactions required to settle up.

### 3. ⏳ Temporal Group Memberships
Unlike simple splitters, SplitSense understands that life changes. Roommates move out, and new people move in. 
- You can specify exact `joinedAt` and `leftAt` dates for any user.
- If an expense is uploaded for a date when a member was *not* living in the house, they will **automatically be excluded** from the split.

### 4. 🚨 Intelligent Anomaly Detection
Stop overpaying for duplicate bills. When you upload a CSV, SplitSense runs a multi-layered anomaly detection scan:
- **Duplicate Detection**: Flags rows with identical amounts, dates, and payers.
- **Z-Score Analysis**: Compares new expenses against historical averages and standard deviations. If a $200 water bill suddenly spikes to $600, Audit AI will flag it as an anomaly before you pay it.

### 5. 📥 Automated CSV Importer
Drop in raw CSV files directly from your bank or manually kept spreadsheets. The intelligent parser will:
- Extract payers, payees, dates, and amounts.
- Generate missing users on the fly.
- Bulk insert hundreds of rows in milliseconds using optimized Postgres transactions.

---

## 🏛️ Architecture & Tech Stack

SplitSense is built for scale, performance, and a premium user experience.

### Frontend
- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router paradigm)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) for utility-first styling.
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for smooth, declarative micro-animations, modals, and the ChatBot UI.
- **Visualizations**: [Recharts](https://recharts.org/) for beautiful, responsive bar charts and balance graphs.
- **Icons**: Lucide React.

### Backend & Database
- **Database**: PostgreSQL hosted on [Supabase](https://supabase.com/).
- **Driver**: [Postgres.js](https://github.com/porsager/postgres) - extremely fast, strictly typed SQL template literals.
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) using custom JWT credentials strategies.
- **State/Caching**: Optimized backend routines for bulk-inserts, minimizing network latency.

---

## 📁 Project Structure

```text
SplitSense/
├── src/
│   ├── app/                 # Next.js App Router Pages & API Routes
│   │   ├── api/             # Backend REST Endpoints (auth, expenses, chat, anomalies)
│   │   ├── anomalies/       # Anomaly detection dashboard
│   │   ├── expenses/        # Expense feed and logging
│   │   ├── groups/          # Group creation and management
│   │   ├── import/          # CSV upload and parsing UI
│   │   └── settlements/     # Debt simplification and payoff screens
│   ├── components/          # Reusable React components (UI, ChatBot, Modals)
│   ├── lib/                 # Core backend logic
│   │   ├── import/          # CSV Parsing, Split calculation, Anomaly detection
│   │   ├── balance-engine.ts# Core debt and balance calculator
│   │   └── settlement-optimizer.ts # Graph-based debt simplification
│   └── db/                  # Raw SQL schema initialization scripts
├── init-db.ts               # Database setup utility script
└── next.config.ts           # Next.js compiler settings
```

---

## 🚀 Getting Started Locally

### 1. Clone the Repository
```bash
git clone https://github.com/shyam-medh/SplitSense.git
cd SplitSense
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory. You will need a PostgreSQL connection string (preferably from Supabase or Neon).

```env
# Your Supabase PostgreSQL Connection String
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"

# NextAuth Configuration
NEXTAUTH_SECRET="a-very-secure-random-string"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Database Initialization
SplitSense uses raw SQL migrations to ensure maximum performance. Run the initialization script to automatically create the `User`, `Group`, `Expense`, `ExpenseSplit`, `Settlement`, and `ImportLog` tables.

```bash
npx tsx init-db.ts
```

### 5. Start the Development Server
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

---

## ☁️ Deployment

SplitSense is optimized for **Vercel**.
1. Push your code to GitHub.
2. Import the project in your Vercel Dashboard.
3. Add your `DATABASE_URL` and `NEXTAUTH_SECRET` to the Vercel Environment Variables.
4. Deploy!

## 📜 License
This project is open-source and available under the MIT License.
