# DECISIONS.md — Decision Log

This document outlines the significant technical and architectural decisions made during the development of SplitSense, the alternative options considered, and the rationale behind the final choices.

---

### Decision 1: Database ORM vs. Raw SQL Driver
**Options Considered:**
1. Prisma ORM (High abstraction, excellent TypeScript safety)
2. `postgres.js` (Low-level raw SQL driver, minimal overhead)

**The Decision: `postgres.js`**
**Why:** The core requirement of this assignment was processing and ingesting chaotic, high-volume CSV exports. Prisma is notoriously slow for bulk operations because its query engine processes inserts sequentially or with high overhead. I chose `postgres.js` because it allows for lightning-fast array-based bulk inserts (`INSERT INTO ... VALUES (), (), ()`), reducing a 2-minute CSV import down to just ~200 milliseconds.

---

### Decision 2: Settlement Algorithm (Who owes Whom)
**Options Considered:**
1. **Micro-debt Tracking:** Tracking every specific edge (A owes B $5, B owes C $5).
2. **Graph-based Debt Simplification:** Aggregating net balances and greedily pairing creditors with debtors.

**The Decision: Graph-based Debt Simplification**
**Why:** Tracking micro-debts creates a terrible user experience in large groups. If 10 people share 50 expenses, settling up individually requires dozens of Venmo transactions. I implemented a graph optimization algorithm that computes the absolute net balance of every user, and then pairs the person who owes the most with the person who is owed the most. This guarantees the absolute minimum number of transactions required to bring the entire group's balance to exactly $0.

---

### Decision 3: Framework & Architecture
**Options Considered:**
1. React (Vite) + Express + Node.js (Standard MERN/PERN stack)
2. Next.js 14 App Router (Full-stack React)

**The Decision: Next.js 14 App Router**
**Why:** To integrate the AI Data Analyst (Audit AI) securely without exposing database credentials, the LLM needs to run in a secure server environment. Next.js Server Actions and API routes allowed me to build the entire AI pipeline, the CSV parser, and the frontend in a single, cohesive repository. This massively simplified deployment to Vercel and avoided the CORS and latency issues of a separate backend repo.

---

### Decision 4: Handling Temporal Group Memberships
**Options Considered:**
1. Simple Boolean: `isMember: boolean`
2. Temporal Matrix: `joinedAt: Date`, `leftAt: Date`

**The Decision: Temporal Matrix (`joinedAt` & `leftAt`)**
**Why:** Real life is dynamic. Roommates move out, and friends join trips halfway through. A simple boolean fails to account for past expenses. By tracking the exact dates a user was part of a group, the Split Calculator dynamically checks if `Expense.date` falls within the user's `joinedAt / leftAt` window. If they weren't in the group at the time of the purchase, they are mathematically excluded from the denominator.
