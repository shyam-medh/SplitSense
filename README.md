# SplitSense Shared Expenses

A robust, production-ready shared expense tracker designed to process messy real-world CSV data, handle complex splits, and manage temporal group memberships.

## Key Features
- **Intelligent CSV Pipeline**: Robust anomaly detection Engine (detects negative amounts, zero amounts, duplicates, departure conflicts).
- **Temporal Memberships**: Automatically prorates and excludes users from expenses occurring before they join or after they leave.
- **Smart Settlements**: Simplifies debts using a graph algorithm to minimize the number of transactions required.
- **Duplicate Review Flow**: Interactively review conflicting or duplicate entries before they affect net balances.
- **Drill-down Ledger**: Click on any user to see a granular breakdown of every expense and settlement that contributes to their net balance.
- **Secure Authentication**: Built with NextAuth.js.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite (via Prisma ORM)
- **Styling**: TailwindCSS
- **Icons**: Lucide React

## Setup Instructions
1. Install dependencies:
   ```bash
   npm install
   ```
2. Setup environment variables:
   ```bash
   cp .env.example .env
   # Add NEXTAUTH_SECRET and DATABASE_URL
   ```
3. Push the database schema:
   ```bash
   npx prisma db push
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

## AI Tools Used
Built entirely with **Antigravity IDE**, leveraging DeepMind models for architectural design, complex bug fixes (like the 95k row call stack overflow), and algorithmic implementation of graph settlement optimizations. See `AI_USAGE.md` for full details.
