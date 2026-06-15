# AI_USAGE.md — AI Tools and Pair Programming Log

### AI Tools Used
- **Google Gemini (Antigravity Agentic IDE)**: Used as the primary pair-programming agent for generating boilerplate, refactoring complex algorithms, and scaffolding the UI.

### Key Prompts Used
- *"Build a Next.js App Router expense tracker with TailwindCSS."*
- *"Write a bulk SQL insert query for postgres.js to handle an array of 1000 expenses."*
- *"Create a debt simplification algorithm using a greedy Max-Creditor/Max-Debtor approach."*
- *"Write a statistical Z-Score anomaly detection function to flag expenses 3 standard deviations above the mean."*

---

## 🛑 Concrete Cases of AI Errors and Corrections

### Case 1: Sequential Database Queries causing Latency Bottlenecks
**What the AI produced wrong:** 
When asked to parse and import a CSV file into the database, the AI originally wrote a `for...of` loop that executed `await sql(...)` for *every single row*.
**How I caught it:**
When testing locally with SQLite, it was fast. But when deploying to Vercel and connecting to a remote Supabase Postgres instance, the network latency of 800 sequential queries caused the import to take over 2 minutes, sometimes timing out the serverless function.
**What I changed:**
I stopped the AI and instructed it to refactor the entire `importer.ts` file to use **Bulk Inserts**. I guided the AI to accumulate all parsed rows into massive memory arrays (`expensesToInsert`), and then execute a single `INSERT INTO ... VALUES (), ()` query. This reduced the import time to ~200ms.

### Case 2: Client-Side NextAuth Session Errors
**What the AI produced wrong:** 
When building the protected routes (e.g., `/groups/[id]`), the AI wrapped the page in a `'use client'` directive and used the `useSession()` hook to verify authentication.
**How I caught it:**
This caused a flash of unauthenticated state (loading spinners) on every page load, ruining the premium feel of the app. Furthermore, fetching database data required passing the user ID from the client to the server, which is an anti-pattern in Next.js 14.
**What I changed:**
I instructed the AI to rewrite the pages as **Server Components** and use `await getServerSession(authOptions)`. This allowed the page to securely verify the user and fetch their groups from the database before any HTML was sent to the browser, resulting in instant, secure page loads.

### Case 3: Hardcoded Secrets causing Deployment Crashes
**What the AI produced wrong:** 
During the initial NextAuth setup, the AI hardcoded the `NEXTAUTH_SECRET` directly in the `src/lib/auth.ts` file as a fallback string.
**How I caught it:**
When I pushed the code to Vercel for production deployment, visiting the live URL resulted in a NextAuth "Server Configuration Error" screen. 
**What I changed:**
I realized NextAuth aggressively guards against missing environment variables in production and ignores static string fallbacks for security. I removed the hardcoded string, pushed the update, and explicitly configured `NEXTAUTH_SECRET` and `NEXTAUTH_URL` in the Vercel Dashboard Environment Variables, followed by a manual redeployment.
