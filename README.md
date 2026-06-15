# SplitSense 💸 & Audit AI 🤖

**The Ultimate Shared Financial Ledger, Expense Tracker, and AI Data Analyst**

SplitSense is a production-ready, highly optimized shared expense tracker engineered to process messy, real-world financial data. Beyond traditional bill-splitting, it acts as a robust financial settlement engine capable of handling dynamic, temporal group memberships, optimal graph-based debt simplification, and multi-layered anomaly detection.

At its core sits **Audit AI**, an intelligent conversational interface that natively queries your ledger, parses unstructured CSVs, and acts as your personal financial analyst.

---

## 📑 Table of Contents
1. [Core Engines & Capabilities](#-core-engines--capabilities)
2. [Deep Dive: The SplitSense Algorithms](#-deep-dive-the-splitsense-algorithms)
3. [Architecture & Tech Stack](#-architecture--tech-stack)
4. [Database Schema](#-database-schema-er-diagram)
5. [API Reference](#-api-reference)
6. [Project Structure](#-project-structure)
7. [Getting Started (Local Development)](#-getting-started-local-development)
8. [Security Considerations](#-security-considerations)
9. [Deployment](#-deployment)
10. [License](#-license)

---

## 🌟 Core Engines & Capabilities

### 1. The Audit AI Engine (Built-in Data Analyst)
Audit AI is deeply integrated into the data layer, allowing you to ask natural language questions about complex financial relationships. It translates human intent into highly optimized data queries.
- *"Who currently owes me the most money in the 'Summer Trip' group?"*
- *"Identify any duplicate transactions or recurring utility bills in the last 6 months."*
- *"Summarize Bob's total contribution to groceries vs. dining out."*

### 2. The CSV Parsing & Ingestion Engine
Stop manually typing out receipts. SplitSense includes a heavy-duty CSV parser designed to handle chaotic, unstructured bank exports or manual spreadsheets.
- **Auto-Matching**: Automatically maps payer and payee names to internal UUIDs.
- **On-the-Fly User Generation**: If a name in the CSV doesn't exist in the system, SplitSense creates a shadow profile for them instantly.
- **Bulk Insert Optimization**: Utilizes single-trip, multi-row SQL inserts (`INSERT INTO ... VALUES (), (), ()`) to process hundreds of transactions and splits across the internet with near-zero network latency.

### 3. The Graph-Based Settlement Engine
Instead of tracking a messy web of microscopic debts (A owes B, B owes C, C owes D), SplitSense uses a **debt simplification algorithm** to compute the optimal path for repayment. It calculates the net balance for every node (user) in the group graph, and pairs the biggest debtors with the biggest creditors, minimizing the total number of physical money transfers required to settle the entire group's balance to exactly $0.

---

## 🔬 Deep Dive: The SplitSense Algorithms

### Temporal Group Memberships
Standard splitters assume everyone in a group is liable for all expenses forever. SplitSense introduces **Temporal Tracking**:
- Every `GroupMember` record tracks exactly when a user `joinedAt` and `leftAt`.
- When processing a CSV or adding a manual expense, the split engine cross-references the **Date of the Transaction** against the **Temporal Matrix**.
- If someone moved out of the apartment in March, they will automatically be excluded from the April internet bill, and the denominator for the split is dynamically adjusted.

### Multi-Layered Anomaly Detection
Before any data is committed to the ledger, the Anomaly Detection pipeline flags problematic entries:
1. **Absolute Duplication**: Flags rows with identical hashes (Amount + Date + Payer + Payees + Description).
2. **Fuzzy Duplication**: Flags expenses that occur within 48 hours of each other with the same amount.
3. **Z-Score Statistical Spikes**: The system maintains a rolling average (μ) and standard deviation (σ) for recurring expense categories. If a new entry exceeds a Z-score threshold of `3.0` (i.e., it is 3 standard deviations away from the mean), Audit AI intercepts the transaction and asks for user confirmation.

---

## 🏛️ Architecture & Tech Stack

### Frontend Application Layer
- **Framework**: [Next.js 14+](https://nextjs.org/) using the App Router (`/app`) for highly optimized Server-Side Rendering (SSR) and Server Components.
- **Styling**: [TailwindCSS](https://tailwindcss.com/) for a sleek, utility-first UI design system.
- **Micro-Interactions**: [Framer Motion](https://www.framer.com/motion/) for fluid page transitions, modal pop-outs, and ChatBot slide-in animations.
- **Data Visualization**: [Recharts](https://recharts.org/) for rendering financial analytics, debt graphs, and category breakdowns.

### Backend & Data Layer
- **Database**: PostgreSQL hosted on [Supabase](https://supabase.com/).
- **Driver**: [Postgres.js](https://github.com/porsager/postgres) - Chosen over Prisma for its raw speed, zero-overhead execution, and powerful array-based bulk insertion capabilities.
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) handling JWT generation, session management, and credential verification.

---

## 📊 Database Schema (ER Diagram)

SplitSense utilizes a highly normalized relational database structure. 

```mermaid
erDiagram
    User ||--o{ GroupMember : "belongs to"
    User ||--o{ Expense : "pays"
    User ||--o{ ExpenseSplit : "owes"
    User ||--o{ Settlement : "makes"
    
    Group ||--o{ GroupMember : "contains"
    Group ||--o{ Expense : "has"
    Group ||--o{ Settlement : "records"
    
    Expense ||--|{ ExpenseSplit : "divided into"
    
    User {
        uuid id PK
        string name
        string email
        string password
        boolean isGuest
    }
    
    Group {
        uuid id PK
        string name
        uuid ownerId FK
        datetime createdAt
    }
    
    GroupMember {
        uuid id PK
        uuid groupId FK
        uuid userId FK
        datetime joinedAt
        datetime leftAt
    }
    
    Expense {
        uuid id PK
        uuid groupId FK
        string description
        decimal amount
        string currency
        datetime date
        uuid paidById FK
        string splitType
    }
    
    ExpenseSplit {
        uuid id PK
        uuid expenseId FK
        uuid userId FK
        decimal amountOwed
    }
```

---

## 🔌 API Reference

The backend exposes several modular REST endpoints designed for rapid consumption by the frontend client.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/groups` | Returns all groups the authenticated user is a member of. |
| `POST` | `/api/groups` | Creates a new group and assigns the creator as the Owner. |
| `GET` | `/api/groups/[id]/expenses` | Fetches the paginated expense ledger for a specific group. |
| `POST` | `/api/import` | Multi-part form endpoint. Accepts raw CSV data, runs the parsing engine, calculating splits, and executing bulk Postgres insertions. Returns a detailed `ImportReport`. |
| `GET` | `/api/balances` | Executes the Graph Optimization algorithm and returns the simplified net balances for the current session user. |
| `POST` | `/api/chat` | The core endpoint for Audit AI. Accepts conversational history and natural language prompts, returning analytical insights. |

---

## 📁 Project Structure

```text
SplitSense/
├── src/
│   ├── app/                 # Next.js Server Components & Routing
│   │   ├── api/             # Edge-ready REST APIs (auth, chat, import)
│   │   ├── anomalies/       # Detection dashboards & Z-Score reports
│   │   ├── expenses/        # The core ledger feed
│   │   ├── groups/          # Group creation & membership management
│   │   └── settlements/     # Debt optimization graphs & payoff flows
│   ├── components/          # Reusable Client/Server React Components
│   │   ├── ChatBot.tsx      # The persistent Audit AI interface
│   │   ├── Sidebar.tsx      # Main application navigation
│   │   └── ui/              # Modals, Pagination, Custom Selects
│   ├── lib/                 # Core Algorithmic Business Logic
│   │   ├── import/          # CSV parsers, split mappers, row validation
│   │   ├── balance-engine.ts# Raw SQL balance aggregation queries
│   │   └── settlement-optimizer.ts # Graph-theory debt simplification
│   └── db/                  
│       └── schema.sql       # Source of truth for Postgres definitions
├── init-db.ts               # Automated database bootstrapping script
└── next.config.ts           # Framework configuration
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18 or higher)
- A Supabase account (or any standard PostgreSQL database)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/shyam-medh/SplitSense.git
cd SplitSense
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variable Configuration
Create a `.env` file in the root directory. You must supply a valid PostgreSQL connection string.

```env
# Database Configuration (Postgres.js requires a direct connection URL)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"

# NextAuth Configuration
NEXTAUTH_SECRET="generate-a-secure-random-32-byte-string"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Automated Database Bootstrapping
You do not need to manually run SQL commands. SplitSense includes a TypeScript runner that reads `src/db/schema.sql` and intelligently provisions your entire database schema over the network.

```bash
npx tsx init-db.ts
```

### 5. Launch the Application
```bash
npm run dev
```
The application will boot up at [http://localhost:3000](http://localhost:3000). You can immediately register a new user, create a group, and drag-and-drop a CSV file into the importer!

---

## 🛡️ Security Considerations

- **SQL Injection Protection**: All dynamic queries utilizing `Postgres.js` rely on strictly typed tagged template literals (`sql\`SELECT * FROM users WHERE id = ${id}\``), neutralizing SQL injection vectors at the driver level.
- **JWT Session Security**: NextAuth generates encrypted, HTTP-only, secure cookies for session persistence.
- **Row-Level Tenancy**: All sensitive API endpoints (`/api/expenses`, `/api/groups`) strictly validate the authenticated user's ID against the database to ensure they are a verified member of the requested group before returning payload data.

---

## ☁️ Deployment

SplitSense is optimized for Serverless deployments via **Vercel**.

1. Push your repository to GitHub.
2. In the Vercel Dashboard, select **Add New Project** and import the repository.
3. In the Vercel Environment Variables configuration, add your `DATABASE_URL` and `NEXTAUTH_SECRET`.
4. Click **Deploy**. Vercel will automatically detect the Next.js framework, build the production bundle, and deploy the application globally to the edge.

---

## 📜 License
SplitSense is open-source software, licensed under the MIT License. Feel free to fork, modify, and distribute!
